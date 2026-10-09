// Builds dist/families/hills/hills.json, the Gentle hills family, from the
// authoring list below. Each puzzle's answer (a landscape, the two clues that
// are too far apart, every landscape, or the fewest pins) is computed here
// with the module's own functions (dist/families/hills/hills.js) and checked
// again by scripts/validate-hills.mjs with separate searches.
// Design notes and sources: docs/hills/README.md.
import {writeFile} from 'node:fs/promises';
import {completions, conflicts, needed, fixed} from '../dist/families/hills/hills.js';

const WEEK47 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-47';
export const sources = [
  {id: 'hills-week47', title: 'Bellingham Math Circle — Week 47: Gentle-step landscapes, packets, bonus pages and adult guides', url: WEEK47, kind: 'local curriculum'},
  {id: 'hills-mcshane', title: 'E. J. McShane, Extension of range of functions (1934): a function with a Lipschitz bound on part of a space extends to the whole space with the same bound, and max_c (a_c − d(x, c)) and min_c (a_c + d(x, c)) are the least and greatest extensions', url: 'https://doi.org/10.1090/S0002-9904-1934-05978-0', kind: 'research'}
];
const RULES = ['Heights are whole numbers of blocks, 0 or more.', 'Neighbouring towers may differ by at most one block.'];
const RING = 'The last tower is a neighbour of the first.';
const CLUES = 'Dark towers are clues and keep their heights.';
const BY_MODE = {
  fill: ['Build every tower.'],
  every: ['A landscape counts once every tower is built. Press That’s all when you have found every one.'],
  pin: ['A pinned tower keeps its height. Pin towers until no other landscape fits.', 'Dashed cells show the other heights a tower could have. When the pins run out, dotted rings show another landscape that fits.', 'The circles show how many pins you may use.']
};
const CANT = 'Can’t says two clues can never be joined, however you build. Press it, then tap both clues. A wrong claim is refused.';
export const family = {
  id: 'hills',
  title: 'Gentle hills',
  mathematics: 'A landscape is a row or ring of towers whose neighbours differ by at most one block. Clues can be completed exactly when every two differ in height by at most the number of steps between them. Then the lowest and highest completions are themselves landscapes, every completion lies between them, and every height between them occurs at each tower. A tower is fixed by the clues exactly when two clues have a straight ramp through it, so the fewest clues that fix a landscape are its peaks, valleys and flats, plus the ends of a row. This is the discrete case of McShane’s extension of Lipschitz functions.',
  rules: [...RULES, CLUES],
  sourceIds: sources.map(s => s.id)
};
const rulesFor = q => [...RULES, ...(q.ring ? [RING] : []), ...(q.mode === 'pin' ? [] : [CLUES]), ...BY_MODE[q.mode], ...(q.cant ? [CANT] : [])];
const SET = 'Tap a level in a tower to build it to that height, or drag up and down the tower. Tap the top block again to clear it.';
const controlsFor = q => q.mode === 'pin'
  ? 'Tap a tower to pin or unpin it.'
  : `${SET}${q.mode === 'every' ? ' Press That’s all when you have every landscape.' : ''}${q.cant ? ' If two clues can never be joined, press Can’t and tap both.' : ''}`;
const OBJECTIVE = {fill: 'Build every tower.', every: 'Find every landscape.', pin: 'Pin the fewest towers so only this landscape fits.'};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'One ramp',
    parameters: {mode: 'fill', sites: 5, top: 4, clues: [[0, 0], [4, 4]]},
    idea: 'Four steps up in four moves leaves no choice: every step must climb.',
    prerequisites: 'Count blocks up to 4.',
    hints: ['Each step can go up at most one block.', 'From 0 to 4 in four steps, every step goes up.', 'Build 0, 1, 2, 3, 4.'],
    parent: {
      notice: 'Whether your child sees that a tower of 1 in the second place is the only choice.',
      prompt: 'Could the middle tower be 1?',
      explanation: 'Each step changes the height by at most one, and the clues climb 4 blocks in 4 steps, so every step must climb. The only landscape is 0, 1, 2, 3, 4.',
      extension: 'If the last clue were 3, how many landscapes would there be?',
      connection: 'Two clues fix the towers between them exactly when they differ by the number of steps between them.'
    },
    provenance: 'Week 47 Problem 3 in every band (0 _ _ _ 4 has exactly one landscape).'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Too steep',
    parameters: {mode: 'fill', sites: 5, top: 3, clues: [[0, 0], [2, 3]], cant: true},
    idea: 'Two clues three blocks apart in height need at least three steps between them.',
    prerequisites: 'One ramp.',
    hints: ['Try to build the second tower.', 'From 0, two steps can climb at most 2 blocks.', 'The clues in columns 1 and 3 can never be joined. Press Can’t and tap both.'],
    parent: {
      notice: 'Whether your child keeps rebuilding the second tower, or says it can’t be done.',
      prompt: 'How high can you get in two steps from 0?',
      explanation: 'Each step climbs at most one block, so two steps from 0 reach at most 2. The clue of 3 two steps away can never be reached, whatever the other towers do.',
      extension: 'Move the 3 one place to the right. Can it be done now?',
      connection: 'The clues fit exactly when every two differ in height by at most the number of steps between them.'
    },
    provenance: 'Week 47 K–1 Problem 4 (the first clue set, 0 and 3 two steps apart, is impossible).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Four ways down',
    parameters: {mode: 'every', sites: 5, top: 3, clues: [[0, 3], [4, 0]]},
    idea: 'Three blocks down in four steps leaves one flat step, and it can go in any of four places.',
    prerequisites: 'One ramp.',
    hints: ['Build one way down, then change it.', 'Going down 3 blocks in 4 steps, one step stays level.', 'The level step can be first, second, third or fourth.'],
    parent: {
      notice: 'Whether your child finds the landscapes in an order, moving the level step along.',
      prompt: 'How do you know there are no more?',
      explanation: 'From 3 down to 0 in four steps, three steps go down and one stays level, because no step can go up and come back in time. The level step can be any of the four, so there are four landscapes: 3,3,2,1,0, 3,2,2,1,0, 3,2,1,1,0 and 3,2,1,0,0.',
      extension: 'How many landscapes go from 3 down to 0 in five steps?',
      connection: 'Every landscape lies between the lowest and the highest one; here they are 3,2,1,0,0 and 3,3,2,1,0.'
    },
    provenance: 'Week 47 K–1 Problem 4 (the second clue set, 3 and 0 four steps apart, has four landscapes).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Pin a hill',
    parameters: {mode: 'pin', sites: 5, top: 4, land: [0, 1, 2, 3, 2]},
    idea: 'A straight ramp between two pins fills itself in; the top of the hill and the ends need pins.',
    prerequisites: 'One ramp.',
    hints: ['Pin a tower and watch the dashed cells.', 'A ramp that climbs one block every step is fixed by its two ends.', 'Pin the first tower, the top of the hill and the last tower.'],
    parent: {
      notice: 'Whether your child pins the middle of the ramp, then sees it was not needed.',
      prompt: 'Why does the tower of 1 need no pin?',
      explanation: 'With 0 and 3 pinned, three steps climb three blocks, so the towers between must be 1 and 2. The last tower needs its own pin, because after the 3 it could be 2, 3 or 4. Three pins, and no fewer: without the 3, the hill could be lower.',
      extension: 'Which towers would need pins for 0, 1, 2, 2, 2?',
      connection: 'The fewest pins are the ends and every peak, valley or flat; every pinning that works includes them.'
    },
    provenance: 'New for the app, after Week 47 Problem 3 (a forced ramp) and 2–3 Problem 6 (which two clues force one landscape).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Just enough room',
    parameters: {mode: 'fill', sites: 7, top: 4, clues: [[0, 2], [3, 0], [6, 3]], cant: true},
    idea: 'Three steps for three blocks is tight but possible: the clues fit when no two are too far apart.',
    prerequisites: 'Too steep.',
    hints: ['Check each two clues: is there room to climb between them?', 'From 0 to 3 in three steps, every step must climb.', 'Build 0, 1, 2, 3 from the middle clue to the end, then come down from 2 to 0.'],
    parent: {
      notice: 'Whether your child presses Can’t because the last climb looks steep, or checks the steps first.',
      prompt: 'Is there room between the 0 and the 3?',
      explanation: 'Between the 0 and the 3 there are three steps, exactly enough when each step climbs. Between the 2 and the 0 there are three steps for two blocks, so there is a choice. Three landscapes fit.',
      extension: 'Change one clue so that Can’t is right.',
      connection: 'Clues can be completed exactly when every two differ in height by at most the number of steps between them (Week 47 grades 4–5 Problem 7).'
    },
    provenance: 'New for the app, after Week 47 grades 2–3 Problem 7 and grades 4–5 Problem 7 (when can a row of clues be filled?).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'The steep pair',
    parameters: {mode: 'fill', sites: 7, top: 4, clues: [[0, 1], [2, 3], [4, 0], [6, 2]], cant: true},
    idea: 'One pair of clues too far apart spoils the whole row, and the claim names that pair.',
    prerequisites: 'Too steep; Just enough room.',
    hints: ['Look at each two neighbouring clues.', 'From 3 down to 0 takes at least three steps.', 'The clues in columns 3 and 5 are too far apart. Press Can’t and tap both.'],
    parent: {
      notice: 'Whether your child checks the clues in pairs before building.',
      prompt: 'Which two clues are the trouble?',
      explanation: 'The 3 in column 3 and the 0 in column 5 are two steps apart but three blocks apart in height. Every other pair has room, so that pair is the certificate.',
      extension: 'Move one clue up or down by one so that the row can be filled.',
      connection: 'If two clues far apart are too steep for the steps between them, then two clues next to each other along the way are too; checking neighbouring clues is enough on a row.'
    },
    provenance: 'New for the app, after Week 47 grades 4–5 Problem 7.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Pin a valley',
    parameters: {mode: 'pin', sites: 7, top: 4, land: [3, 2, 1, 1, 2, 3, 4]},
    idea: 'A flat bottom needs both its towers pinned; the slopes on each side fill themselves.',
    prerequisites: 'Pin a hill.',
    hints: ['Which towers are not on a straight slope?', 'The two towers at the bottom are each beside a tower of the same height.', 'Pin the two ends and both towers of 1.'],
    parent: {
      notice: 'Whether your child pins only one tower of the flat bottom.',
      prompt: 'Why do both towers of 1 need pins?',
      explanation: 'The slopes 3, 2, 1 and 1, 2, 3, 4 are straight, so their ends fix them. But with only one tower of 1 pinned, its neighbour on the flat could be 1 or 2. Pinning both ends and both bottom towers fixes everything: four pins.',
      extension: 'Make a landscape of seven towers that needs only the two ends pinned.',
      connection: 'A tower is fixed exactly when it lies on a straight ramp between two pins.'
    },
    provenance: 'New for the app, after Week 47 grades 2–3 Problem 6.'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Ring of three',
    parameters: {mode: 'every', sites: 5, top: 3, ring: true, clues: [[0, 0], [3, 2]]},
    idea: 'On a ring both ways round count: the short way from 0 to 2 is two steps, and it is fixed only partly.',
    prerequisites: 'Four ways down.',
    hints: ['The last tower is next to the first. Watch both ways round.', 'Going the short way, the last tower must be 1.', 'The long way round has one level step, in one of three places.'],
    parent: {
      notice: 'Whether your child forgets the jump from the last tower back to the first.',
      prompt: 'Why must the last tower be 1?',
      explanation: 'The last tower is a neighbour of both the 0 (round the ring) and the 2, so it must be 1. The long way, from 0 to 2 in three steps, has one level step, in any of three places: 0,0,1,2,1, 0,1,1,2,1 and 0,1,2,2,1.',
      extension: 'On a ring of five, can a 0 and a 3 be clues at all?',
      connection: 'On a ring the distance between two clues is the shorter way round; the rule for when clues fit stays the same.'
    },
    provenance: 'Week 47 bonus Problem 1 (the ring A to E with A = 0 and D = 2 has exactly three landscapes).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Ten landscapes',
    parameters: {mode: 'every', sites: 7, top: 5, clues: [[0, 1], [4, 3], [6, 1]]},
    idea: 'Between 1 and 3 four steps apart there are several ways up; after the 3 the way down is fixed. Finding all of them needs an order.',
    prerequisites: 'Four ways down.',
    hints: ['After the 3, two steps down to 1: those towers are fixed.', 'From 1 up to 3 in four steps, the three middle towers vary.', 'Keep the second tower as low as it can go and change the others first.'],
    parent: {
      notice: 'Whether your child works in an order, or finds landscapes at random and loses track.',
      prompt: 'How will you know when you have them all?',
      explanation: 'The towers after the 3 must be 2, then the clue 1. Between the 1 and the 3 there are four steps for two blocks: two climbs and two others, which can be level steps or a down and an up. Listing them in order gives ten landscapes, from the lowest, 1,0,1,2,3,2,1, to the highest, 1,2,3,4,3,2,1.',
      extension: 'Which landscape has the fewest blocks in all? Which has the most?',
      connection: 'The lowest and highest landscapes bound every other, and every height between them occurs at each tower.'
    },
    provenance: 'Week 47 K–1 Problem 5 and grades 2–3 and 4–5 Problem 5 (clues 1, 3 and 1 on seven sites; exactly ten completions).'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Round the ring',
    parameters: {mode: 'fill', sites: 5, top: 3, ring: true, clues: [[0, 0], [3, 3]], cant: true},
    idea: 'On a row the 0 and the 3 have three steps between them; on a ring the short way round is only two.',
    prerequisites: 'Ring of three.',
    hints: ['Count the steps from the 0 to the 3 both ways round.', 'Round the back, the 0 and the 3 are only two steps apart.', 'Press Can’t and tap both clues.'],
    parent: {
      notice: 'Whether your child builds the long way round and then finds the jump back to the start too big.',
      prompt: 'How many steps from the 3 back to the 0 the other way?',
      explanation: 'The long way, 0, 1, 2, 3, climbs fine. But the 3 and the 0 are also two steps apart round the back, through the last tower, and two steps cannot drop three blocks. So the clues can never be joined.',
      extension: 'On a row instead of a ring, how many landscapes fit these clues?',
      connection: 'The rule is the same on a ring, with distance measured the shorter way round.'
    },
    provenance: 'Week 47 bonus Problem 1 (the ring with A = 0 and D = 3 is impossible, though the row A to E is not).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Pin a ring',
    parameters: {mode: 'pin', sites: 6, top: 3, ring: true, land: [0, 1, 2, 3, 2, 1]},
    idea: 'A ring has no ends; its lowest and highest towers are opposite, and both ways round are straight ramps.',
    prerequisites: 'Pin a valley; Ring of three.',
    hints: ['A ring has no ends to pin.', 'Which towers are not on a straight slope either way?', 'Pin the 0 and the 3.'],
    parent: {
      notice: 'Whether your child expects to pin as many towers as on a row.',
      prompt: 'Why are two pins enough?',
      explanation: 'The 0 and the 3 are three steps apart both ways round the ring, and three blocks apart in height. So both ways are straight ramps, and every other tower is fixed. Every tower except these two is strictly between its neighbours.',
      extension: 'Change one tower, keeping every jump gentle. How many pins does the new ring need?',
      connection: 'The fewest pins are the towers that are not strictly between their two neighbours; on a ring there are no ends.'
    },
    provenance: 'New for the app, after the Week 47 bonus rings (Problem 1).'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Pin a long ridge',
    parameters: {mode: 'pin', sites: 9, top: 5, land: [1, 2, 3, 2, 2, 3, 4, 3, 2]},
    idea: 'Peaks, valleys and flats need pins, and every other tower is fixed by them.',
    prerequisites: 'Pin a valley.',
    hints: ['Find the peaks, the dips and the level steps.', 'Both towers of a level step need pins.', 'Pin columns 1, 3, 4, 5, 7 and 9.'],
    parent: {
      notice: 'Whether your child pins a tower on a slope, then has to unpin it.',
      prompt: 'Which towers are fixed without pins, and why?',
      explanation: 'Columns 2, 6 and 8 each sit strictly between their neighbours on a straight slope, so the pins at the ends of the slope fix them. Every other tower is an end, a peak (3 and 4), or part of the level step 2, 2, and each of those could change if it were left unpinned. Six pins.',
      extension: 'Can you make a landscape of nine towers that needs exactly three pins?',
      connection: 'Every pinning that fixes the landscape contains these six towers, so six is the fewest.'
    },
    provenance: 'New for the app, after Week 47 grades 2–3 Problem 6 and the overview’s envelopes.'
  }
];

// The answer: the clues too far apart, every landscape, or the pins.
const solve = q => {
  if (q.mode === 'pin') {
    const pins = needed(q);
    if (!fixed(q, pins)) throw Error(`the needed pins do not fix ${q.land}`);
    return {pins, fewest: pins.length};
  }
  const clash = conflicts(q), all = completions(q);
  if (q.mode === 'every') {
    if (!all.length) throw Error(`nothing to find: ${JSON.stringify(q)}`);
    return {landscapes: all.map(h => h.join(',')), count: all.length};
  }
  if (clash.length) {
    if (!q.cant) throw Error(`impossible without Can’t: ${JSON.stringify(q)}`);
    return {apart: clash[0], pairs: clash};
  }
  return {landscape: all[0], count: all.length};
};
const common = {familyTitle: 'Gentle hills', mechanic: 'hills', band: 'all', revision: 1, sourceDocument: 'docs/hills/README.md'};
export const puzzles = authored.map(item => {
  const q = {...item.parameters, ring: item.parameters.ring ?? false, cant: item.parameters.cant ?? false, clues: item.parameters.clues ?? []};
  const objective = OBJECTIVE[q.mode];
  return {
    id: `hills-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    difficulty_level: item.difficulty_level,
    ...common,
    parameters: q,
    objective,
    visibleObjective: objective,
    instruction: objective,
    controls: controlsFor(q),
    rules: rulesFor(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['hills-week47', ...(/envelope|lowest and highest|fixed exactly|fit exactly|completed exactly/i.test(item.parent.connection) ? ['hills-mcshane'] : [])]},
    solution: solve(q),
    provenance: item.provenance
  };
});
const playground = {
  id: 'hills-playground',
  number: 0,
  title: 'Gentle hills playground',
  difficulty_level: 'playground',
  ...common,
  band: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Build landscapes and pin towers.',
  visibleObjective: '',
  instruction: 'Build landscapes and pin towers.',
  controls: 'Choose 5, 7 or 9 towers, and a row or a ring. Tap a level to build a tower to it, or drag. Tap a tower’s top block to pin it; empty towers then show, dashed, the heights the pins allow. Clear empties every tower that is not pinned.',
  rules: [...RULES, 'A red bar marks a jump of more than one block. Nothing needs finishing.'],
  idea: 'Free play with gentle landscapes: pin a few towers and see which heights the others can still take.',
  prerequisites: 'None.',
  hints: ['Pin two towers far apart and look at the dashed cells between them.', 'Pin two towers whose heights differ by more than the steps between them.', 'Try the same pins on a ring.'],
  parent: {
    notice: 'Whether your child predicts the dashed cells before pinning.',
    prompt: 'Which empty towers have only one height left?',
    explanation: 'Each empty tower can take every height between the lowest and the highest the pins allow, and no other. A tower has one height left exactly when two pins have a straight ramp through it.',
    extension: 'Pin three towers so that every empty tower has exactly two heights left.',
    connection: 'The dashed cells run from max(0, a − d) to the least a + d over the pins a at distance d: the least and greatest extensions (McShane, 1934).',
    sourceIds: ['hills-week47', 'hills-mcshane']
  },
  solution: null,
  provenance: 'Week 47 shared launch (towers, markers and the row of numbers) and free play with clues.'
};
export const pack = {title: 'Gentle hills', version: 1, families: [family], sources, puzzles: [playground, ...puzzles]};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/hills/hills.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.parameters.mode, JSON.stringify(p.solution).slice(0, 120));
}
