// Builds dist/families/rainbow/rainbow.json, the Rainbow triangles pack, from
// the authoring list below. Every fact a puzzle relies on (which counts a
// board allows, the walks through its doors, the hidden boards and their
// peek budgets) is computed here from dist/families/rainbow/sperner.js and
// checked against the authored claims; scripts/validate-rainbow.mjs checks
// them again by separate methods. Design notes and worksheet sources:
// docs/rainbow/README.md.
import {writeFile} from 'node:fs/promises';
import {boardOf, legal, rainbows, doorsOf, walksOf, countTable, fillings, fromRows} from '../dist/families/rainbow/sperner.js';
import {plainLabels, planCost, peekPlan} from '../dist/families/rainbow/rainbow.js';

const WEEK16 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-16';
export const sources = [
  {id: 'rainbow-week16', title: 'Bellingham Math Circle — Week 16: Three-color triangles, packets, facilitator guide and return visits', url: WEEK16, kind: 'local curriculum'},
  {id: 'rainbow-review', title: 'Bellingham Math Circle — Week 16 review card, with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-16.md', kind: 'local curriculum'},
  {id: 'rainbow-su', title: 'Francis Edward Su — Rental harmony: Sperner’s lemma in fair division, American Mathematical Monthly 106 (1999), 930–942', url: 'https://doi.org/10.1080/00029890.1999.12005142', kind: 'research'},
  {id: 'rainbow-sperner', title: 'Emanuel Sperner — Neuer Beweis für die Invarianz der Dimensionszahl und des Gebietes, Abhandlungen aus dem Mathematischen Seminar der Universität Hamburg 6 (1928), 265–272', url: 'https://doi.org/10.1007/BF02940617', kind: 'research'},
  {id: 'rainbow-funfacts', title: 'Francis Su et al. — Sperner’s Lemma, Math Fun Facts, Harvey Mudd College', url: 'https://math.hmc.edu/funfacts/sperners-lemma/', kind: 'web'},
  {id: 'rainbow-scarf', title: 'Herbert Scarf — The approximation of fixed points of a continuous mapping, SIAM Journal on Applied Mathematics 15 (1967), 1328–1343', url: 'https://doi.org/10.1137/0115116', kind: 'research'}
];
export const family = {
  id: 'rainbow',
  title: 'Rainbow triangles',
  mathematics: 'A big triangle is cut into little triangles that meet edge to edge. Its corners are R, B and Y; a dot on a side may use only that side’s two corner letters, and a dot inside may use any. Sperner’s lemma: however the dots are lettered, the number of rainbow triangles, with all three letters, is odd, so there is always at least one. Call an edge with R at one end and B at the other a door. A rainbow has exactly one door and every other little triangle has none or two. Along the bottom the letters start at R and end at B, so they change an odd number of times: the outside has an odd number of doors, and the other two sides have none. Counting doors triangle by triangle counts each inside door twice, so the rainbows are odd too. As walks: go in through an outside door and keep going through the next door; a triangle with two doors passes you on, so each walk ends outside or in a rainbow. Outside doors pair up by walks, an odd number can’t all pair, and so some walk from outside ends in a rainbow. That walk is also a way to find a rainbow while looking at few letters. The guarantee needs the side rule: let one bottom dot be Y and a board can have no rainbow at all.',
  rules: [
    'The corners are R, B and Y. A dot on a side uses one of that side’s two corner letters; a dot inside may use any letter.',
    'A rainbow is a little triangle with R, B and Y at its corners.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const DOOR_RULE = 'A door is a side of a little triangle with R at one end and B at the other.';
const TURN = 'Tap a dot to change its letter: a dot on a side switches between its side’s two letters, and a dot inside goes R, B, Y in turn. Doors shows the sides with R at one end and B at the other.';
const CONTROLS = {
  count: TURN,
  only: `${TURN} A star marks each triangle that has been the only rainbow.`,
  counts: `${TURN} Each number of rainbows you make joins the row below. Press That’s all when you have every number.`,
  walk: 'Tap a glowing door to walk through it, or tap a glowing rainbow to start a walk inside it. A walk stops when it can’t go on.',
  peek: 'Tap a dot to peek at its letter. Start again hides the letters of a new board.'
};
const howMany = n => n === 0 ? 'no little triangle is a rainbow' : `exactly ${n} little ${n === 1 ? 'triangle is a rainbow' : 'triangles are rainbows'}`;
const MODE_RULES = {
  count: n => [`Solved when ${howMany(n)}.`],
  only: () => ['Solved when every little triangle has been the only rainbow on the board, one at a time.'],
  counts: () => ['Solved when you press That’s all with every number of rainbows the board allows.'],
  walk: () => [DOOR_RULE, 'A walk comes in through a door on the outside, or starts in a rainbow, and goes through one door at a time.', 'Solved when you have walked through every door.'],
  peek: n => ['Only the corners show at first. Each peek shows one dot’s letter.', `Solved when a rainbow shows within ${n} peeks.`]
};
const OBJECTIVE = {
  count: n => `Letter the dots so that ${howMany(n)}.`,
  only: () => 'Make each little triangle the only rainbow, one at a time.',
  counts: () => 'Find every number of rainbows you can make on this board, then press That’s all.',
  walk: () => 'Walk through every door.',
  peek: n => `Find a rainbow, peeking at no more than ${n} dots.`
};
const VISIBLE = {
  count: n => n === 0 ? 'Make no rainbows.' : `Make ${n} ${n === 1 ? 'rainbow' : 'rainbows'}.`,
  only: () => 'Make each triangle the only rainbow.',
  counts: () => 'Find every number of rainbows you can make.',
  walk: () => '',
  peek: () => 'Find a rainbow.'
};

/* ------------------------------------------------------------------ *
 * Hidden boards for the peek puzzles: one rainbow, found by searching
 * the bottom for an R next to a B and walking in through that door.
 * ------------------------------------------------------------------ */
let seed = 20261005;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const randomFill = board => board.allowed.map(s => s[Math.floor(random() * s.length)]).join('');
// Peeking in reading order, bottom row first, until a rainbow shows.
export function readingCost(board, labels) {
  const seen = new Set(board.corners), target = rainbows(board.m, labels);
  let n = 0;
  for (let k = 0; k < labels.length; k++) {
    if (seen.has(k)) continue;
    seen.add(k); n++;
    if (target.some(i => board.m.cells[i].every(x => seen.has(x)))) return n;
  }
  return n;
}
// Whether the plan's first walk (from the first door it finds) leads back out.
function firstWalkExits(board, labels) {
  const seen = [...board.corners];
  for (;;) {
    const k = peekPlan(board, labels, seen);
    if (k === -1) return false;
    if (k === null) return true;
    // Once a door is found, the second R–B pair on the bottom means a walk came out.
    const bottom = seen.filter(x => x <= board.steps).sort((a, b) => a - b);
    let pairs = 0;
    for (let i = 0; i + 1 < bottom.length; i++) if (labels[bottom[i]] === 'R' && labels[bottom[i + 1]] === 'B' && bottom[i + 1] - bottom[i] === 1) pairs++;
    if (pairs > 1) return true;
    seen.push(k);
  }
}
function hiddenBoards(steps, {bottomDoors, exits, walk: [shortest, longest], maxCost}, count = 3) {
  const board = boardOf({steps}), picked = [];
  for (let t = 0; t < 2000000 && picked.length < count; t++) {
    const labels = randomFill(board), r = rainbows(board.m, labels);
    if (r.length !== 1 || r[0] < 2 * steps - 1) continue;
    if (doorsOf(board.m, labels).filter(e => board.m.outer[e]).length !== bottomDoors) continue;
    if ([...'RBY'].some(c => [...labels].filter(x => x === c).length < labels.length / 6)) continue;
    const main = walksOf(board.m, labels).find(w => w.ends[0] === 'out' && w.ends[1] === 'rainbow');
    if (main.cells.length < shortest || main.cells.length > longest || firstWalkExits(board, labels) !== exits) continue;
    // The door walk fits with room to spare; peeking row by row does not.
    if (planCost(board, labels, board.corners) > maxCost || readingCost(board, labels) <= maxCost + 3) continue;
    // Different places for the door and for the rainbow on each board.
    if (picked.some(p => rainbows(board.m, p)[0] === r[0] || p.slice(0, steps + 1) === labels.slice(0, steps + 1))) continue;
    picked.push(labels);
  }
  if (picked.length < count) throw new Error(`only ${picked.length} hidden boards of ${steps} rows`);
  // One peek to spare beyond the plan on the hardest of the three boards.
  const budget = Math.max(...picked.map(labels => planCost(board, labels, board.corners))) + 1;
  return {hidden: picked, budget};
}

/* ------------------------------------------------------------------ *
 * The puzzles
 * ------------------------------------------------------------------ */
const plain = spec => plainLabels(boardOf(spec));
const FAN = {steps: 2, centres: [0, 1, 2, 3]};
const peek11 = hiddenBoards(5, {bottomDoors: 1, exits: false, walk: [4, 7], maxCost: 8});
const peek12 = hiddenBoards(6, {bottomDoors: 3, exits: true, walk: [4, 9], maxCost: 11});

const playground = {
  id: 'rainbow-playground', number: 0, title: 'Rainbow playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Letter the dots freely and watch the rainbows.',
  visibleObjective: '',
  controls: `${TURN} The small pictures choose a board: two to five rows, or the fan, where every triangle of the two-row board is cut into three.`,
  rules: RULES,
  idea: 'However you letter the dots, the number of rainbows stays odd.',
  prerequisites: 'None.',
  hints: ['Try to make no rainbows at all.', 'Turn on Doors and count the doors along the bottom.', 'Change one dot and watch how the rainbows change.'],
  parent: {
    notice: 'The number of rainbows jumps by two, or not at all, when a dot changes.',
    prompt: 'Can you ever get an even number of rainbows?',
    explanation: 'Never, on any of these boards (Sperner’s lemma). A dot touches the triangles round it; changing its letter can make or unmake rainbows only in pairs, because the doors along that dot’s edges change in pairs.',
    extension: 'On the fan, each triangle of the two-row board is cut into three. Does the cutting change what is possible? (The count stays odd: the lemma holds for any cutting into triangles that meet edge to edge.)',
    connection: 'The same counting proves Brouwer’s fixed point theorem in the plane and drives algorithms that find fair divisions of rent.'
  },
  provenance: 'Week 16 shared launch (fill a board legally, change one counter) and the fan board of K–1 Problem 4.',
  sourceIds: ['rainbow-week16', 'rainbow-su']
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Move the rainbow',
    parameters: {mode: 'only', board: {steps: 2}, start: plain({steps: 2})},
    idea: 'A rainbow can be moved, but on this board there is always exactly one.',
    prerequisites: 'Tell R, B and Y apart. No reading needed once a grown-up has shown the move.',
    hints: ['Change a dot on a side and watch where the rainbow goes.', 'A rainbow needs R, B and Y. Which triangle could get all three?', 'To move it to the bottom left, give the middle of the bottom a B.'],
    parent: {
      notice: 'However the three side dots go, there is exactly one rainbow.',
      prompt: 'Can you make the rainbow disappear?',
      explanation: 'The board has eight letterings (each side dot has two choices) and every one has exactly one rainbow, in any of the four triangles. That is the smallest case of Sperner’s lemma: the number of rainbows is always odd.',
      extension: 'On paper, letter a three-row board. Can you get two rainbows? Three?',
      connection: 'Sperner’s lemma: with the side rule, a rainbow can move but never vanish.'
    },
    provenance: 'Week 16 K–1 Problem 1 (each of the four triangles can hold the only rainbow) and the shared launch (“Can you move an all-three triangle somewhere else?”).',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1], only: 4}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Three rainbows',
    parameters: {mode: 'count', board: {steps: 3}, target: 3, start: plain({steps: 3})},
    idea: 'More rainbows come from more changes of letter along the bottom.',
    prerequisites: 'Count to three.',
    hints: ['Change one dot at a time and watch the count.', 'Try the dot in the middle of the board.', 'Make the middle dot Y.'],
    parent: {
      notice: 'Rainbows tend to appear and disappear two at a time.',
      prompt: 'When you change one dot, how many rainbows come or go?',
      explanation: 'Changing a dot affects only the triangles round it, and the count always stays odd: 1, 3 or 5 on this board. From the start, a Y in the middle makes three: bottom row R R R B, then R Y B, then R B, then Y.',
      extension: 'Can you make exactly two? (No: puzzle 5 asks for every number that works.)',
      connection: 'The count is odd for every lettering, so it can only move in steps of two.'
    },
    provenance: 'Week 16 grades 2–3 and 4–5 Problem 1 (the three-row board; the guide’s three-rainbow witness RRRB/RRY/RB/Y).',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1, 3, 5], witness: fromRows('RRRB/RYB/RB/Y')}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Through the doors',
    parameters: {mode: 'walk', board: {steps: 3}, start: fromRows('RBRB/RRB/RB/Y')},
    idea: 'A triangle with two doors lets a walk through; a rainbow has one door, so a walk stops there.',
    prerequisites: 'None. Tracing a path with a finger helps.',
    hints: ['Start at a door on the bottom.', 'Inside a triangle, go through its other door.', 'One walk comes back out at the bottom; the other ends in the rainbow.'],
    parent: {
      notice: 'Every walk from outside either comes back out or ends in a rainbow.',
      prompt: 'Why can’t a walk stop in a triangle that isn’t a rainbow?',
      explanation: 'A door is an R–B side. A triangle with R and B and no Y has exactly two doors, so a walk that comes in can always go on. A rainbow has exactly one door, so a walk ends there. This board has three doors on the bottom: two are joined by a walk, and the third leads to the rainbow.',
      extension: 'Count the doors along the bottom of any board. Is it always odd?',
      connection: 'The door walk is the proof of Sperner’s lemma: outside doors are odd in number, walks pair them two by two, so at least one walk must end in a rainbow.'
    },
    provenance: 'Week 16 grades 2–3 Problem 2 (the printed filling RBRB/RRB/RB/Y, its nine doors and its two routes).',
    sourceIds: ['rainbow-week16', 'rainbow-su'],
    expect: {doors: 9, walks: [['out', 'out', 3], ['out', 'rainbow', 5]]}
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Five rainbows',
    parameters: {mode: 'count', board: {steps: 3}, target: 5, start: plain({steps: 3})},
    idea: 'Five is the most the three-row board allows.',
    prerequisites: 'Count to five.',
    hints: ['Make three first, then look for two more.', 'Make the middle dot Y, then change a dot on the bottom.', 'Try R B R B along the bottom with Y in the middle.'],
    parent: {
      notice: 'Five is the most, and only 12 of the 192 letterings reach it.',
      prompt: 'Could all nine triangles be rainbows at once?',
      explanation: 'One way to make five: R B R B, then R Y B, then R B, then Y. The guide proves that five is the most by splitting the nine triangles into groups whose rainbows can be counted separately: the total is always 1, 3 or 5.',
      extension: 'The four-row board allows nine. Puzzle 8 asks for them.',
      connection: 'An upper bound by cases: split the nine triangles into groups whose contributions can be counted separately.'
    },
    provenance: 'Week 16 K–1 Problem 3 and grades 2–3, 4–5 Problem 1 (the maximum 5; witness RBRB/RYB/RB/Y).',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1, 3, 5], witness: fromRows('RBRB/RYB/RB/Y'), most: 5}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'How many can there be?',
    parameters: {mode: 'counts', board: {steps: 3}, start: plain({steps: 3})},
    idea: 'Only odd numbers of rainbows are possible.',
    prerequisites: 'Odd and even, or pairing objects.',
    hints: ['Make as many rainbows as you can, then as few.', 'You have found 1, 3 and 5. Have you ever seen 2 or 4?', 'Every number you can make is odd.'],
    parent: {
      notice: 'Only 1, 3 and 5 ever appear.',
      prompt: 'Why never 0, 2 or 4?',
      explanation: 'The bottom row goes from R to B and its letters change an odd number of times, so the outside has an odd number of doors. Each rainbow has one door, each other triangle none or two, and inside doors are shared by two triangles, so the number of rainbows is odd too.',
      extension: 'Does the same argument work on the four-row board? On the fan?',
      connection: 'A parity invariant: the boundary fixes whether the count is odd or even, whatever happens inside.'
    },
    provenance: 'Week 16 K–1 Problem 2 (no lettering has zero), grades 2–3 and 4–5 Problem 1 (counts 1, 3, 5 only) and grades 4–5 Problem 5 (the general parity proof).',
    sourceIds: ['rainbow-week16', 'rainbow-su'],
    expect: {counts: [1, 3, 5]}
  },
  {
    number: 6, difficulty_level: 'medium', title: 'The fan',
    parameters: {mode: 'count', board: FAN, target: 7, start: plain(FAN)},
    idea: 'Cut into different triangles, the board still has an odd number of rainbows, and now up to seven.',
    prerequisites: 'Count to seven.',
    hints: ['Each part of the two-row board is cut into three round a middle dot. Look at one part at a time.', 'A part holds two rainbows when its corners use two letters and its middle dot has the third.', 'Make the bottom R R B and the sides Y and B, then give each middle dot the letter its part lacks.'],
    parent: {
      notice: 'Seven is the most, and only six letterings reach it.',
      prompt: 'How many rainbows can one part of the board hold?',
      explanation: 'Each of the four parts of the two-row board is cut into three triangles round a middle dot. A part whose corners use two letters holds two rainbows when its middle dot has the third letter, and none otherwise; a part with R, B and Y at its corners holds exactly one, whatever its middle dot; a part with one letter holds none. So the four parts hold at most 8, and since the count is always odd, at most 7.',
      extension: 'Can you make an even number on the fan? (No: Sperner’s lemma holds for any cutting into triangles.)',
      connection: 'Sperner’s lemma depends only on the side rule, not on the shapes of the triangles.'
    },
    provenance: 'Week 16 K–1 Problem 4 (the fan board, maximum 7); here every dot except the corners may change.',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1, 3, 5, 7], most: 7, mostWays: 6}
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Sixteen places',
    parameters: {mode: 'only', board: {steps: 4}, start: plain({steps: 4})},
    idea: 'Every one of the sixteen triangles can be the only rainbow.',
    prerequisites: 'Keep track of which triangles have stars. Patience: this is a long one.',
    hints: ['Move the rainbow a little at a time.', 'Push the change from R to B along the bottom to the left or right.', 'A Y on the left side moves the rainbow down that side.'],
    parent: {
      notice: 'The rainbow can sit anywhere, even in a corner.',
      prompt: 'When you move one dot, where can the rainbow go?',
      explanation: 'Every one of the sixteen triangles can be the only rainbow; the guide lists a lettering for each. Of the 13,824 letterings, 2,920 have exactly one rainbow.',
      extension: 'Can you make every triangle a rainbow at once? What is the most? (Nine: puzzle 8.)',
      connection: 'The lemma promises a rainbow but says nothing about where: any triangle is possible.'
    },
    provenance: 'Week 16 K–1 Problem 5 (all sixteen locations, the guide’s table of row codes).',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1, 3, 5, 7, 9], only: 16}
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Nine rainbows',
    parameters: {mode: 'count', board: {steps: 4}, target: 9, start: plain({steps: 4})},
    idea: 'Rainbows inside the board pair up by walks, so many rainbows need no extra doors on the outside.',
    prerequisites: 'Count to nine.',
    hints: ['Use all three letters on the dots inside the board.', 'The second row from the bottom can go Y B R Y.', 'One way: R R R R B, then Y B R Y, then R Y B, then R B, then Y.'],
    parent: {
      notice: 'Nine rainbows can sit above a bottom row with only one door.',
      prompt: 'How many doors does the bottom of your nine have? Where do the other walks go?',
      explanation: 'Only 24 of the 13,824 letterings reach nine. With R R R R B along the bottom there is a single outside door: its walk ends in one rainbow, and the other eight rainbows pair up by walks that never reach the outside.',
      extension: 'What is the most on a five-row board?',
      connection: 'Walks pair rainbows with rainbows inside the board; only the outside door left over is forced to find one.'
    },
    provenance: 'Week 16 four-row board (K–1 Problem 5); the guide’s distribution 1, 3, 5, 7, 9 in 2,920; 6,192; 3,840; 848; 24 letterings.',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [1, 3, 5, 7, 9], most: 9, mostWays: 24, witness: fromRows('RRRRB/YBRY/RYB/RB/Y')}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Doors inside',
    parameters: {mode: 'walk', board: {steps: 4}, start: fromRows('RRBRB/YBRB/RBB/RB/Y')},
    idea: 'Walks join outside doors in pairs, and rainbows in pairs, and one walk joins the outside to a rainbow.',
    prerequisites: 'Puzzle 3.',
    hints: ['Walk in from each door on the bottom.', 'Some doors are never reached from outside. Where could a walk start instead?', 'Start in a rainbow that has no walk yet.'],
    parent: {
      notice: 'One walk never touches the outside: it joins two rainbows.',
      prompt: 'Why must at least one walk from outside end in a rainbow?',
      explanation: 'This board has three doors on the bottom and three rainbows. One walk joins two bottom doors, one joins a bottom door to a rainbow, and one joins the other two rainbows. Walks pair outside doors with outside doors and rainbows with rainbows; the odd outside door left over forces an odd number of rainbows.',
      extension: 'Change one dot and walk again. Does the pairing still leave one walk from outside to a rainbow?',
      connection: 'The path-following proof of Sperner’s lemma, the idea behind algorithms that compute fixed points (Scarf).'
    },
    provenance: 'Week 16 grades 4–5 Problem 2 (the printed filling RRBRB/YBRB/RBB/RB/Y, all fourteen doors and three routes).',
    sourceIds: ['rainbow-week16', 'rainbow-su', 'rainbow-scarf'],
    expect: {doors: 14, walks: [['out', 'rainbow', 2], ['out', 'out', 7], ['rainbow', 'rainbow', 5]]}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Hidden letters',
    parameters: {mode: 'peek', board: {steps: 5}, ...peek11},
    idea: 'Following doors finds a rainbow without looking at most of the board.',
    prerequisites: 'Puzzle 3.',
    hints: ['The bottom side runs from R to B. Somewhere an R sits next to a B.', 'Peek halfway between an R and a B on the bottom, and keep halving.', 'Go through the door you found: peek at the third dot of the triangle behind it, and keep going through doors.'],
    parent: {
      notice: 'A rainbow turns up after a few peeks along the bottom and a short walk.',
      prompt: 'Why does halving the bottom always find a door?',
      explanation: 'Between an R and a B on the bottom there must be a change of letter. Peeking halfway keeps an R on one side and a B on the other, so the gap halves each time. Through that door, each triangle shows one new dot; a triangle with two doors leads on, and the walk stops in a rainbow. On these boards the bottom has one door, so its walk cannot come back out.',
      extension: 'If the walk did come back out through another bottom door, where would you look next?',
      connection: 'Path following as a search: it is how computers find approximate fixed points and fair divisions (Scarf, Su).'
    },
    provenance: 'New for the app: the door walk of Week 16 grades 4–5 Problem 5 used as a search, with binary search along the bottom (grades 4–5 Problem 4: a row from R to B changes letter an odd number of times).',
    sourceIds: ['rainbow-week16', 'rainbow-su', 'rainbow-scarf'],
    expect: {peek: {steps: 5, bottomDoors: 1}}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'A walk that comes back',
    parameters: {mode: 'peek', board: {steps: 6}, ...peek12},
    idea: 'A walk from outside may come back out, but outside doors are odd, so one walk cannot.',
    prerequisites: 'Puzzle 10.',
    hints: ['Find an R next to a B on the bottom and walk in.', 'Your walk came back out. There is another R next to a B on the bottom.', 'Halve the stretch between the R where you came out and the next B.'],
    parent: {
      notice: 'The first walk comes back out; another door leads to the rainbow.',
      prompt: 'After a walk comes back out, why is there still a door worth trying?',
      explanation: 'These boards have three doors on the bottom and one rainbow. A walk in from outside that comes back out uses up two outside doors; the third must lead to a rainbow, because doors that are left over cannot pair.',
      extension: 'On paper, letter a board whose bottom has five doors and which has one rainbow. How many walks come back out? (Two.)',
      connection: 'Walks pair outside doors; an odd number cannot all pair (Sperner’s lemma as a search).'
    },
    provenance: 'New for the app, after Week 16 grades 2–3 Problem 5 and grades 4–5 Problem 2 (an outside route can return outside).',
    sourceIds: ['rainbow-week16', 'rainbow-su'],
    expect: {peek: {steps: 6, bottomDoors: 3, exits: true}}
  }
];

/* ------------------------------------------------------------------ *
 * Starred dots: a group where one side dot may take any letter, so the
 * side rule, and with it the guarantee, is broken.
 * ------------------------------------------------------------------ */
const GROUP = 'Starred dots';
const SMALL_STAR = {steps: 2, free: [1]}, BOTTOM_STAR = {steps: 3, free: [1]}, LEFT_STAR = {steps: 3, free: [4]};
const starred = [
  {
    number: 1, difficulty_level: 'easy', title: 'No rainbow',
    parameters: {mode: 'count', board: SMALL_STAR, target: 0, start: plain(SMALL_STAR)},
    idea: 'Let the bottom use Y, and the rainbow can vanish.',
    prerequisites: 'Move the rainbow (puzzle 1).',
    hints: ['The starred dot may also be Y.', 'Make the starred dot Y.', 'With the starred dot Y, make one of the other two side dots Y as well.'],
    parent: {
      notice: 'With a Y on the bottom, the rainbow can disappear.',
      prompt: 'In Move the rainbow it never could. What is different?',
      explanation: 'With R, Y, B along the bottom, R and B never sit side by side, so the outside has no door. The door argument needed an odd number of doors on the outside; with none, the rainbows can be even, here none at all. Three of the twelve letterings have no rainbow.',
      extension: 'Can you make two rainbows on this board? (Yes, in exactly one way: the next puzzle.)',
      connection: 'A theorem is only as good as its hypotheses: drop the side rule and the guarantee fails.'
    },
    provenance: 'Week 16 K–1 Problem 6 (the bottom side may also use Y); on the two-row board the bottom has one dot.',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [0, 1, 2], ways: {0: 3}, total: 12}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Two rainbows',
    parameters: {mode: 'count', board: SMALL_STAR, target: 2, start: plain(SMALL_STAR)},
    idea: 'Without the side rule, an even number of rainbows is possible.',
    prerequisites: 'No rainbow (Starred dots 1).',
    hints: ['Keep the starred dot Y.', 'The two side dots above it decide the rest. Try each pair.', 'Make the left side dot R and the right side dot B.'],
    parent: {
      notice: 'Only one of the twelve letterings has two rainbows.',
      prompt: 'Where are the doors now?',
      explanation: 'R, Y, B along the bottom has no door. R on the left and B on the right make one door, inside the board, and the two rainbows are the triangles on either side of it: a walk from one rainbow goes through that door and ends in the other. Rainbows that pair up inside need no outside door, so without one the count can be even.',
      extension: 'With a star on the three-row board, can you make four? (Yes, the next puzzle.)',
      connection: 'Walks join rainbows in pairs; only an outside door left over forces an odd count.'
    },
    provenance: 'Week 16 grades 4–5 Problem 6 and the guide’s note that breaking the side rule allows even counts; new instance on the two-row board.',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [0, 1, 2], ways: {2: 1}, witness: fromRows('RYB/RB/Y')}
  },
  {
    number: 3, difficulty_level: 'medium', title: 'How many now?',
    parameters: {mode: 'counts', board: BOTTOM_STAR, start: plain(BOTTOM_STAR)},
    idea: 'Break the side rule, and every number from 0 to 5 appears.',
    prerequisites: 'How many can there be? (puzzle 5).',
    hints: ['Make the starred dot Y and look for an even number.', 'You have seen 1, 3 and 5 before. Look for 0, 2 and 4.', 'Four is the hardest to find. Keep the bottom R Y B B.'],
    parent: {
      notice: 'Now 0, 2 and 4 appear as well as 1, 3 and 5.',
      prompt: 'Which part of the door argument breaks?',
      explanation: 'The proof needs an odd number of doors on the outside, and that came from the bottom running from R to B with only R and B between. A Y on the bottom can separate the R’s from the B’s, leaving no outside door, and then the count can be even. On this board every number from 0 to 5 is possible; 16 of the 288 letterings have none and only 4 have four.',
      extension: 'Puzzle 5 is the same board without the star. Which numbers did it allow?',
      connection: 'A parity invariant needs its boundary condition: change the boundary and the parity is free.'
    },
    provenance: 'Week 16 grades 4–5 Problem 6 (one starred bottom dot may be Y), set against grades 2–3 and 4–5 Problem 1 (only 1, 3 and 5).',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [0, 1, 2, 3, 4, 5], ways: {0: 16, 4: 4}, total: 288}
  },
  {
    number: 4, difficulty_level: 'hard', title: 'A blue on the left',
    parameters: {mode: 'count', board: LEFT_STAR, target: 0, start: plain(LEFT_STAR)},
    idea: 'The rule matters on every side, not only on the bottom.',
    prerequisites: 'How many now? (Starred dots 3).',
    hints: ['The starred dot is on the left side. Which letter is new for it?', 'Make the starred dot B, and turn on Doors.', 'One way: R R R B along the bottom, then B B B, then Y B, then Y.'],
    parent: {
      notice: 'A B on the left side puts a door on the outside that the rule never allowed.',
      prompt: 'How many doors does the outside have now?',
      explanation: 'Up the left side the letters now go R, B, Y: one door, which the side rule never allowed. With the odd number of doors along the bottom, the outside has an even number, and the rainbows can be zero. Every lettering with none has R, B, Y up the left side; with R, B, R, Y there are two new doors and the count stays odd.',
      extension: 'Which dots, starred, could break the guarantee? (Any dot on a side: each can then take its side’s missing letter.)',
      connection: 'Sperner’s lemma needs the boundary condition on all three sides.'
    },
    provenance: 'New for the app, after Week 16 grades 4–5 Problem 6: the starred dot moves to the left side.',
    sourceIds: ['rainbow-week16'],
    expect: {counts: [0, 1, 2, 3, 4, 5], ways: {0: 16}, total: 288, leftZero: true}
  }
].map(p => ({...p, group: GROUP}));

/* ------------------------------------------------------------------ *
 * Checks of the authored claims
 * ------------------------------------------------------------------ */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(p) {
  const q = p.parameters, e = p.expect, board = boardOf(q.board), m = board.m;
  const fail = what => { throw new Error(`Puzzle ${p.number} (${p.title}): ${what}`); };
  if (q.start !== undefined && !legal(board, q.start)) fail('start is not a legal lettering');
  if (e.counts) {
    const table = countTable(board);
    if (!same([...table.keys()], e.counts)) fail(`counts ${[...table.keys()]}`);
    if (e.most !== undefined && Math.max(...table.keys()) !== e.most) fail('most');
    if (e.mostWays !== undefined && table.get(e.most) !== e.mostWays) fail(`most ways ${table.get(e.most)}`);
    for (const [n, ways] of Object.entries(e.ways || {})) if (table.get(Number(n)) !== ways) fail(`${table.get(Number(n))} letterings with ${n}`);
    if (e.total !== undefined && [...table.values()].reduce((x, y) => x + y, 0) !== e.total) fail('total letterings');
    if (q.mode === 'count' && !table.has(q.target)) fail('target cannot be made');
    if (q.mode === 'count' && rainbows(m, q.start).length === q.target) fail('starts solved');
  }
  if (e.witness && rainbows(m, e.witness).length !== (q.target ?? e.counts[1])) fail('witness');
  if (e.only) {
    const places = new Set();
    let total = 0;
    for (const labels of (function* () { const k = board.allowed.length, out = []; function* go(i) { if (i === k) { yield out.join(''); return; } for (const c of board.allowed[i]) { out[i] = c; yield* go(i + 1); } } yield* go(0); })()) {
      const r = rainbows(m, labels);
      if (r.length === 1) { places.add(r[0]); total++; }
    }
    if (places.size !== e.only || places.size !== m.cells.length) fail(`only places ${places.size}`);
  }
  if (p.group && !(q.board.free?.length === 1 && board.allowed[q.board.free[0]] === 'RBY')) fail('one starred dot');
  if (!p.group && q.board.free) fail('a starred dot outside the group');
  // A blue on the left: every lettering with no rainbow reads R, B, Y up the left side.
  if (e.leftZero) for (const labels of fillings(board)) if (rainbows(m, labels).length === 0 && !(labels[4] === 'B' && labels[7] === 'Y')) fail('a zero without R, B, Y up the left side');
  if (q.mode === 'walk') {
    const walks = walksOf(m, q.start);
    if (doorsOf(m, q.start).length !== e.doors) fail(`doors ${doorsOf(m, q.start).length}`);
    if (walks.some(w => w.ends[0] === 'loop')) fail('a loop of doors cannot be started');
    if (!same(walks.map(w => [...w.ends, w.cells.length]), e.walks)) fail(`walks ${JSON.stringify(walks.map(w => [...w.ends, w.cells.length]))}`);
  }
  if (q.mode === 'peek') {
    if (board.steps !== e.peek.steps || q.hidden.length !== 3) fail('peek board');
    for (const labels of q.hidden) {
      if (!legal(board, labels) || rainbows(m, labels).length !== 1) fail('hidden board');
      if (doorsOf(m, labels).filter(x => m.outer[x]).length !== e.peek.bottomDoors) fail('bottom doors');
      if (planCost(board, labels, board.corners) > q.budget) fail('the door walk does not fit the budget');
      if (readingCost(board, labels) <= q.budget) fail(`peeking in reading order fits the budget (${readingCost(board, labels)} of ${q.budget})`);
    }
  }
}

const puzzles = [playground, ...authored, ...starred].map(p => {
  if (p.number) check(p);
  const {expect, sourceIds, parent, group, ...rest} = p, q = rest.parameters;
  const n = q.mode === 'count' ? q.target : q.budget;
  return {
    id: q.mode === 'playground' ? rest.id : `rainbow-${group ? 's' : ''}${String(rest.number).padStart(2, '0')}`,
    number: rest.number, title: rest.title, band: rest.band || 'all', difficulty_level: rest.difficulty_level,
    mechanic: group ? 'starred' : 'rainbow', ...(group ? {libraryFamily: 'rainbow', group} : {}), familyTitle: family.title, revision: 1, parameters: q,
    objective: rest.objective || OBJECTIVE[q.mode](n), visibleObjective: rest.visibleObjective ?? VISIBLE[q.mode](n), instruction: rest.objective || OBJECTIVE[q.mode](n),
    controls: rest.controls || CONTROLS[q.mode], rules: rest.rules || [...RULES, ...(group ? ['A starred dot may take any letter.'] : []), ...MODE_RULES[q.mode](n)],
    idea: rest.idea, prerequisites: rest.prerequisites, hints: rest.hints,
    parent: {...parent, sourceIds}, provenance: rest.provenance, sourceDocument: 'docs/rainbow/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/rainbow/rainbow.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
  for (const p of puzzles.filter(p => p.parameters.mode === 'peek')) { const board = boardOf(p.parameters.board); console.log(p.id, 'budget', p.parameters.budget, 'plan', p.parameters.hidden.map(l => planCost(board, l, board.corners)), 'row by row', p.parameters.hidden.map(l => readingCost(board, l))); }
}
