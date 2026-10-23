// Authoring list for Drawing machines (worksheet Week 85). Lays out each
// puzzle's paper, machine, pins and target, checks every claim the puzzles
// rest on by searching every lattice point with the mechanic's own methods
// (each dot's one knob dot, each outline's knob outline, the box's half-size
// region, the one pin, the one picture place, the second pin and every pair of
// pins for two machines), records a solution witness for each puzzle (played
// through the move rules), and writes dist/families/pantograph/pantograph.json.
// The validator (scripts/validate-pantograph.mjs) checks it all again with a
// model of its own.
// Run: node scripts/build-pantograph.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Q, quarter, key, legalPose, knobFor, lattice, insideDots, solutions, workable, tipsOf} from '../dist/families/pantograph/pantograph.js';
import {freshAttempt, move, isSolved} from '../dist/engine.js';

const PAPER = [10, 8];
const SOURCES = ['pantograph-week85', 'pantograph-card85', 'pantograph-check85'];

// --- Copy --------------------------------------------------------------------
const DRAG = 'Drag the knob (the yellow disc) to another dot: as it slides in a straight line, the pencil draws. Tap a dot to lift the knob and put it down there without drawing. On the knob, arrow keys draw one step and Shift with an arrow moves it without drawing. Undo takes back one move.';
const CONTROLS = {
  dots: `${DRAG} The pencil reaches a ringed dot by stopping on it or drawing through it.`,
  trace: `${DRAG} A pencil line on the pale outline turns green; a line off it turns red.`,
  region: `${DRAG} Each dot the knob visits gets a green dot if the pencil was in the box and a cross if it was not. Press That’s all when you have found every dot that keeps the pencil in the box.`,
  anchor: `Drag the pin to another dot, or use the arrow keys on it; each new place starts a fresh sheet and the last drawing fades. ${DRAG} Trace the green shape with the knob.`,
  shift: `The pin stays where it is. Drag the green shape, or use the arrow keys on it; each new place starts a fresh sheet. ${DRAG} Trace the green shape with the knob.`,
  chain: `Two machines: the first machine’s pencil holds the second machine’s knob, and the second pencil draws. Drag a pin, or use the arrow keys on it; each new place starts a fresh sheet. ${DRAG} Trace the green shape with the knob.`
};
const RULE_PAPER = 'The knob, the pencils and the pins stay on the paper, and a knob never goes onto its pin.';
const RULES = {
  dots: ['The pin stays still. Move the knob; the pencil draws.', 'Make the pencil reach every ringed dot.', RULE_PAPER],
  trace: ['The pin stays still. Move the knob; the pencil draws.', 'Make the pencil draw the whole pale outline and no other lines.', RULE_PAPER],
  region: ['The pin stays still. Move the knob; the pencil follows.', 'Find every dot for the knob that puts the pencil inside the box or on its edge.', RULE_PAPER],
  anchor: ['Move the pin first: a pin can move only between drawings.', 'Then trace the green shape with the knob, so that the pencil draws the pale outline and no other lines.', RULE_PAPER],
  shift: ['The pin stays still. Move the green shape first.', 'Then trace it with the knob, so that the pencil draws the pale outline and no other lines.', RULE_PAPER],
  chain: ['Move the pins first: a pin can move only between drawings.', 'Then trace the green shape with the knob, so that the second pencil draws the pale outline and no other lines.', RULE_PAPER]
};
const PREREQUISITES = {
  dots: 'None beyond dragging and tapping. K–1 children can play with a grown-up nearby; the halfway idea is for talk afterwards.',
  trace: 'Dragging to a dot and noticing corners. K–1 with a grown-up for the first outline; grades 2–3 alone.',
  region: 'Keeping track of which dots were tried, and deciding when every dot is found. Grades 2–3, or K–1 with a grown-up.',
  anchor: 'Comparing two drawings, and thinking backwards from where the copy should be to where the pin must go. Grades 2–3 with a grown-up, or grades 4–5.',
  shift: 'Comparing two pins and two copies and seeing how far and which way each moved. Grades 4–5.',
  chain: 'Thinking of two machines as one: the copy of a copy. Grades 4–5, or keen younger children with a grown-up.'
};
const OBJECTIVE = {
  dots: 'Make the pencil reach every ringed dot.',
  trace: 'Make the pencil draw the pale outline.',
  region: 'Where can the knob go with the pencil in the box?',
  anchor: 'Move the pin, then trace the green shape.',
  shift: 'Move the green shape, then trace it.',
  chain: q => q.movable.pins.filter(Boolean).length > 1 ? 'Move the pins, then trace the green shape.' : 'Move the pin, then trace the green shape.'
};
// The board shows the dots and outlines; a box, a pin to move or a shape to
// move needs its one sentence.
const VISIBLE = {dots: '', trace: '', region: OBJECTIVE.region, anchor: OBJECTIVE.anchor, shift: OBJECTIVE.shift, chain: OBJECTIVE.chain};

// --- Puzzles -----------------------------------------------------------------
const base = (mode, extra) => ({mode, paper: PAPER, machines: ['double'], ...extra});
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Dot to dot', q: base('dots', {pins: [[0, 0]], tracer: [1, 1], dots: [[6, 2], [10, 4], [8, 8], [2, 6], [4, 8]]}),
    idea: 'To send the pencil to a dot, the knob goes halfway there from the pin.',
    hints: ['Move the knob a little and watch where the pencil goes.', 'The pencil goes the same way as the knob, but farther.', 'Put the knob halfway between the pin and a dot.'],
    parent: {notice: 'Whether your child starts aiming the knob before moving it, rather than chasing the pencil.', prompt: 'Where will the pencil be if the knob goes there?', explanation: 'In every position the pin O, the knob T and the pencil P are on one line, with P twice as far from O as T: P = O + 2(T − O). So to put P on a dot, T goes to the midpoint of the pin and the dot. With the pin in the corner at (0, 0), the dot (6, 2) needs the knob at (3, 1). The pencil can reach each dot from only one knob dot.', extension: 'Can the pencil reach the dot (5, 5) with the knob on a dot? (No: the knob would need (2½, 2½). Dots with both numbers even are the only ones it can stop on.)', connection: 'A pantograph is a dilation by 2 about its pin. Week 85, Problem 2 (target D).'},
    provenance: 'Week 85 shared packet, Problem 2, target D (make P visit every dot by moving only T); new dot positions on a 10 by 8 sheet with the pin in a corner.'},
  {number: 2, level: 'easy', title: 'Pin in the middle', q: base('dots', {pins: [[5, 4]], tracer: [6, 4], dots: [[1, 2], [5, 0], [9, 2], [9, 8], [3, 8], [1, 6]]}),
    idea: 'With the pin in the middle the knob goes every way from it, always halfway to the dot.',
    hints: ['Which way must the knob go for the pencil to reach the dot at the bottom?', 'The knob, the pin and the pencil are always in a line.', 'Put the knob halfway between the pin and a dot.'],
    parent: {notice: 'Dots on the far side of the pin: the knob goes that way too, half as far.', prompt: 'How far does the knob go compared with the pencil?', explanation: 'The rule P = O + 2(T − O) holds in every direction, so the knob for each dot is the midpoint of the pin (5, 4) and the dot: (1, 2) needs (3, 3), (5, 0) needs (5, 2), (9, 8) needs (7, 6). All six knob dots sit in a half-size copy of the dot pattern, centred on the pin.', extension: 'Join the knob dots in order. What shape do they make, compared with the pencil’s dots? (The same shape, half the size, around the pin.)', connection: 'The centre of a dilation stays fixed; everything else moves straight away from it.'},
    provenance: 'Week 85 shared packet, Problem 2, target D, with the pin moved to the middle of the sheet; new dot positions.'},
  {number: 3, level: 'easy', title: 'Big square', q: base('trace', {pins: [[0, 0]], tracer: [1, 1], target: [[2, 2], [8, 2], [8, 8], [2, 8]]}),
    idea: 'The knob goes round a square half the size, and the pencil draws the big one.',
    hints: ['Drag the knob a little to the right. What does the pencil draw?', 'The pencil draws twice as far as the knob goes.', 'Drag the knob to (4, 1), then (4, 4), then (1, 4), then back.'],
    parent: {notice: 'The knob’s path stays on the sheet: a square of side 3 inside the pencil’s square of side 6.', prompt: 'How long is each side of the knob’s square?', explanation: 'Each knob side is half the pencil’s side, and parallel to it: P = 2T with the pin at the corner (0, 0). So the knob traces the square with corners (1, 1), (4, 1), (4, 4), (1, 4).', extension: 'How many little squares fit in the pencil’s square, and in the knob’s? (36 and 9: four times as many.)', connection: 'Lengths double and areas multiply by four (Week 85 upper Problem 2).'},
    provenance: 'Week 85 shared packet, Problem 1 (trace a path with T and compare the copy); a new square on a 10 by 8 sheet.'},
  {number: 4, level: 'easy', title: 'House', q: base('trace', {pins: [[0, 0]], tracer: [2, 2], target: [[2, 2], [10, 2], [10, 6], [6, 8], [2, 6]]}),
    idea: 'A half-size house for the knob gives the whole house for the pencil, slanting roof and all.',
    hints: ['Where must the knob be for the pencil to sit on a corner of the house?', 'Lift the knob to the dot halfway between the pin and a corner.', 'The knob goes round (1, 1), (5, 1), (5, 3), (3, 4) and (1, 3).'],
    parent: {notice: 'The knob’s path is a small house with the same slanting roof.', prompt: 'Why does the roof keep its slant?', explanation: 'The roof from (10, 6) to (6, 8) goes 4 left and 2 up; the knob’s roof from (5, 3) to (3, 4) goes 2 left and 1 up. Halving both steps keeps the slant. So the copy has the same shape, angles and direction, at twice the size.', extension: 'Trace the knob’s small house in your head: where is it on the sheet? (Corners (1, 1), (5, 1), (5, 3), (3, 4), (1, 3).)', connection: 'Week 85 Problem 2, target E: “Leave T’s paths on your overlays” leaves a half-size house.'},
    provenance: 'Week 85 shared packet, Problem 2, target E (make P follow the outline); a new house with a slanting roof.'},
  {number: 5, level: 'medium', title: 'Keep it in the box', q: base('region', {pins: [[1, 0]], tracer: [1, 2], box: [[3, 2], [9, 6]]}),
    idea: 'The knob keeps the pencil in the box exactly when it stays in a box half the size, halfway to the pin.',
    hints: ['Slide the knob along a row and watch the marks.', 'The green dots make a shape. What shape, and how big?', 'The knob can go from 2 to 5 across and from 1 to 3 up.'],
    parent: {notice: 'The green dots fill a rectangle 3 by 2, half the box’s 6 by 4, sitting between the pin and the box.', prompt: 'How do you know there are no more?', explanation: 'P = O + 2(T − O) is inside the box exactly when T is inside the box’s half-size copy towards the pin: the box from (3, 2) to (9, 6) with the pin at (1, 0) gives the knob region from (2, 1) to (5, 3). Its 4 × 3 = 12 dots are the answer; any other dot puts the pencil outside, as the crosses show.', extension: 'If the box were moved two dots up, where would the knob’s region go? (One dot up.)', connection: 'The inverse of a dilation by 2 is a dilation by ½ about the same point (Week 85 Problem 4).'},
    provenance: 'Week 85 shared packet, Problem 4 (where can T go while P stays inside the small box on insert F), on a new box.'},
  {number: 6, level: 'medium', title: 'Swap the tips', q: base('dots', {machines: ['half'], pins: [[5, 4]], tracer: [9, 6], dots: [[3, 3], [7, 2], [7, 6], [4, 6], [5, 2]]}),
    idea: 'With the tips swapped the pencil is halfway, so the knob must go twice as far.',
    hints: ['Move the knob and compare how far the pencil goes.', 'Now the pencil is the one in the middle.', 'Put the knob twice as far from the pin as a dot.'],
    parent: {notice: 'The knob reaches the edges of the sheet while the pencil stays near the pin.', prompt: 'What changed when the tips were swapped?', explanation: 'With the knob at the far tip, P = O + (T − O)/2. To put P on a dot D, T goes to 2D − O: the dot (7, 2) needs the knob at (9, 0), the dot (4, 6) needs (3, 8).', extension: 'Which dots can the pencil reach now with the knob on dots? (Every dot within the half-size sheet around the pin, and halfway points too.)', connection: 'Swapping the tips gives the inverse map, the dilation by ½ (Week 85 upper Problem 3).'},
    provenance: 'Week 85 upper packet, Problem 3 (now P traces and T draws), as dots; new dot positions.'},
  {number: 7, level: 'medium', title: 'Small box', q: base('trace', {machines: ['half'], pins: [[1, 1]], tracer: [1, 7], target: [[2, 2], [5, 2], [5, 4], [2, 4]]}),
    idea: 'A small copy needs a big path in the right place: twice as far from the pin.',
    hints: ['Try a box the size you think it needs. Where does the copy land?', 'Every knob corner is twice as far from the pin as its pencil corner.', 'The knob goes round (3, 3), (9, 3), (9, 7) and (3, 7).'],
    parent: {notice: 'A box the right size but in the wrong place gives a copy the right size in the wrong place.', prompt: 'Your copy was the right size. Why did it land somewhere else?', explanation: 'With the tips swapped, P = O + (T − O)/2, so the knob path for the small box from (2, 2) to (5, 4) is the box from (3, 3) to (9, 7): twice as big and twice as far from the pin at (1, 1). Moving the knob’s box by 2 moves the copy by 1.', extension: 'Where would the knob’s box go with the pin at (3, 1)? (From (1, 3) to (7, 7).)', connection: 'Week 85 upper Problem 3: J’s size in the wrong place gives the wrong copy of L.'},
    provenance: 'Week 85 upper packet, Problem 3 (find a rectangle for P that makes T follow the small box on insert L); a new box.'},
  {number: 8, level: 'medium', title: 'Place the pin', q: base('anchor', {pins: [[2, 6]], tracer: [3, 3], stencil: [[3, 1], [5, 1], [5, 2], [3, 3]], movable: {pins: [true]}, solution: [0, 1]}),
    idea: 'Each green corner must be halfway between the pin and the corner its copy should land on.',
    hints: ['Trace the green shape and see where the copy lands.', 'The copy is twice as far from the pin as the green shape. Which way must the pin go?', 'Put the pin at (0, 1).'],
    parent: {notice: 'Each try leaves its copy faded, so the child can see how a pin move shifted the copy.', prompt: 'When you moved the pin, which way did the copy go?', explanation: 'P = 2T − O, so the pin for a copy is O = 2T − P, using any corner and its partner. The green corner (3, 1) and its outline corner (6, 1) give O = (0, 1); every other pairing agrees. Searching every dot of the sheet finds this one pin and no other.', extension: 'Move the pin one dot right of the answer. Where does the copy go? (One dot left: the copy moves the opposite way, by the same amount.)', connection: 'The centre of a dilation is where the lines through matching corners meet (Week 85 upper Problem 4).'},
    provenance: 'Week 85 upper packet, Problem 4 (the anchor and the copy of triangle M), turned round: the copy is given and the child finds the anchor; a new shape.'},
  {number: 9, level: 'hard', title: 'Pin for a half copy', q: base('anchor', {machines: ['half'], pins: [[1, 7]], tracer: [2, 5], stencil: [[2, 1], [8, 1], [2, 5]], movable: {pins: [true]}, solution: [10, 7]}),
    idea: 'With the tips swapped each outline corner is halfway between the pin and its green corner, so the pin is beyond the outline, as far again.',
    hints: ['Trace the green shape and see where the small copy lands.', 'The pin, a green corner and its outline corner are in a line, with the outline corner in the middle.', 'Put the pin at (10, 7).'],
    parent: {notice: 'The pin ends up on the far side of the small copy from the green shape.', prompt: 'Where is the pin compared with the copy and the green shape?', explanation: 'Now P = (T + O)/2, so O = 2P − T. The green corner (2, 1) and the outline corner (6, 4) give O = (10, 7), and the other corners agree. A pin one dot off moves the half copy half a dot, onto halfway points.', extension: 'Move the pin two dots left. Where does the copy go? (One dot left: half as far, the same way.)', connection: 'A dilation by ½ moves its copy half as far as the centre moves; a dilation by 2 moves it the other way, as far.'},
    provenance: 'Week 85 upper packet, Problems 3 and 4 combined: the tips swapped and the anchor to be found; a new shape.'},
  // ghostPin is authoring data, not drawn: the outline is the copy an earlier
  // pin there made (the worksheet's anchor O before O′).
  {number: 10, level: 'hard', title: 'Move the picture', q: base('shift', {pins: [[2, 2]], ghostPin: [0, 0], tracer: [3, 4], stencil: [[3, 1], [5, 1], [3, 4]], movable: {stencil: true}, solution: [1, 1]}),
    idea: 'Moving the picture by m moves its copy by 2m, the same way; so the picture moves half as far as the copy has to.',
    hints: ['Trace the green shape where it is. Where does the copy land?', 'Moving the green shape one dot moves the copy two dots, the same way.', 'Move the green shape 1 right and 1 up.'],
    parent: {notice: 'Traced in place, the copy lands 2 left and 2 down of the outline.', prompt: 'Why does the picture move only half as far as the copy has to?', explanation: 'With the pin O at (2, 2) the copy of a corner M is 2M − O, so moving the picture by m moves the copy by 2m. Traced in place the copy is 2 left and 2 down of the outline, so m = (1, 1): each green corner is then halfway between the pin and its outline corner. Searching every place of the green shape finds only this one. On the worksheet the outline is the copy made with the pin at (0, 0): moving the pin 2 right and 2 up moved the copy 2 left and 2 down, and the picture moves half the pin’s move, the same way.', extension: 'If the outline were 2 dots further left, where should the green shape go? (1 dot further left than the answer: half as far.)', connection: 'A dilation about a moved centre is the old dilation followed by a translation: 2(T − O′) + O′ = 2(T − O) + O − (O′ − O).'},
    provenance: 'Week 85 upper packet, Problem 4 (trace M with anchor O, then with anchor O′; find a new place for M that puts the second copy on the first), with triangle M on a new sheet.'},
  {number: 11, level: 'hard', title: 'Two machines', q: {mode: 'chain', paper: PAPER, machines: ['double', 'half'], pins: [[8, 4], [2, 0]], tracer: [4, 2], stencil: [[4, 2], [6, 2], [6, 5]], target: null, slide: [-3, 2], movable: {pins: [false, true]}, solution: [[8, 4], [2, 8]]},
    idea: 'A ×2 machine and a ×½ machine together make a copy the same size, slid by half the gap between their pins.',
    hints: ['Trace the green shape and watch both pencils.', 'The copy is the same size as the green shape. How far did it slide, and how far apart are the pins?', 'Put the second pin at (2, 8).'],
    parent: {notice: 'The middle pencil draws a big copy, and the last pencil a copy the same size as the green shape.', prompt: 'How far does the copy slide when the second pin moves one dot?', explanation: 'The first machine draws 2T − O₁ and the second halves it towards O₂: (2T − O₁ + O₂)/2 = T + (O₂ − O₁)/2. So the copy is the green shape slid by half the gap between the pins. The outline is 3 left and 2 up, so O₂ = O₁ + (−6, 4) = (2, 8). Searching every dot finds no other second pin.', extension: 'Where should the second pin go to put the copy right on the green shape? (On the first pin: then the two machines undo each other.)', connection: 'Two dilations with factors 2 and ½ compose to a translation (Week 85 guide).'},
    provenance: 'Week 85 review card, App fit (chain a ×2 and a ×½ machine and place both pins); a new shape. The guide’s overview names the inverse and the composite.'},
  {number: 12, level: 'hard', title: 'Both pins', q: {mode: 'chain', paper: PAPER, machines: ['double', 'half'], pins: [[2, 6], [8, 2]], tracer: [5, 3], stencil: [[3, 3], [5, 3], [5, 6]], target: null, slide: [3, 1], movable: {pins: [true, true]}, solution: [[1, 4], [7, 6]], count: 14},
    idea: 'Only the gap between the pins matters: many pairs of places work, all with the second pin 6 right and 2 up from the first.',
    hints: ['Trace the green shape and see where the copy lands.', 'The copy slides half as far as the second pin is from the first.', 'Put the first pin at (1, 4) and the second at (7, 6).'],
    parent: {notice: 'Different children can solve it with different pins; compare the gaps.', prompt: 'Your pins are in a different place from mine, and both work. What is the same?', explanation: 'The copy is T + (O₂ − O₁)/2, so any pins with O₂ − O₁ = (6, 2) slide the green shape 3 right and 1 up onto the outline. Searching every pair of dots finds 14 pairs that work, and every one has that gap. Of the 21 other pairs with that gap, 20 send the middle pencil off the paper at a corner of the green shape (it draws a copy twice as big, twice as far from the first pin), and one folds the second machine shut: at a corner the middle pencil would sit on the second pin.', extension: 'Put the first pin at (2, 0) and the second at (8, 2): the gap is right. Why can’t the shape be traced? (The middle pencil draws a copy twice as big and twice as far from the first pin, and at the top corner it would be off the top of the paper.)', connection: 'The composite of dilations by 2 and ½ about different centres is a translation by half the difference of the centres; with equal centres it is the identity.'},
    provenance: 'Week 85 review card, App fit (place both pins); a new shape.'}
];
// Copy targets: the green shape's copy for the authored solution.
for (const item of PUZZLES) {
  const q = item.q;
  if (q.mode === 'anchor') q.target = q.stencil.map(p => q.machines[0] === 'double' ? [2 * p[0] - q.solution[0], 2 * p[1] - q.solution[1]] : [(p[0] + q.solution[0]) / 2, (p[1] + q.solution[1]) / 2]);
  if (q.mode === 'shift') q.target = q.stencil.map(p => [2 * p[0] - q.ghostPin[0], 2 * p[1] - q.ghostPin[1]]);
  if (q.mode === 'chain') q.target = q.stencil.map(p => [p[0] + q.slide[0], p[1] + q.slide[1]]);
}

const PLAYGROUND = {
  id: 'pantograph-playground', number: 0, title: 'Drawing machines playground', band: 'playground', difficulty_level: 'playground', mechanic: 'pantograph', familyTitle: 'Drawing machines', revision: 1,
  parameters: {mode: 'playground', paper: PAPER, machines: ['double'], pins: [[2, 2]], tracer: [4, 3], movable: {pins: [true]}},
  objective: 'Draw with the machine, move its pin and swap its tips.', visibleObjective: '', instruction: 'Draw with the machine, move its pin and swap its tips.',
  controls: `${DRAG} Drag the pin, or use the arrow keys on it, to move it; ×2 and ×½ swap the knob and the pencil. Each change starts a fresh sheet and the old drawings fade. Clear wipes the paper.`,
  rules: ['The pin stays still while you draw.', RULE_PAPER],
  idea: 'Free drawing with one machine: any picture, any pin, either way round.',
  prerequisites: 'None.',
  hints: ['Draw a letter with the knob.', 'Draw the same letter with the pin somewhere else.', 'Swap the tips and draw it again.'],
  parent: {notice: 'Whether your child predicts where the pencil will be before dragging.', prompt: 'Can you put the pin where the knob and the pencil draw the same picture in the same place?', explanation: 'The playground has no goal and is never solved. It holds the worksheet’s Problem 1 and 3 experiments: draw an elbow or a staircase and compare; try to put O, T and P off one line (it can’t be done: the frame keeps them in line, with P twice as far, Week 85 Problem 3).', extension: 'Draw a square with the knob, then swap the tips and draw the same square again. How do the two copies compare? (The ×2 copy is four times as wide as the ×½ copy.)', connection: 'A pantograph is the dilation by 2 about its pin; swapped, by ½.', sourceIds: SOURCES},
  provenance: 'Week 85 shared packet, Problems 1 and 3, and the upper packet’s swapped tips.',
  sourceDocument: 'docs/pantograph/README.md'
};

// --- Checks and witnesses ----------------------------------------------------
const lat = p => [p[0] / Q, p[1] / Q];
const knobsFor = (q, kinds, pins, p) => lattice(q).filter(t => { const tips = legalPose(q, kinds, pins.map(quarter), quarter(t)); return tips && tips.at(-1)[0] === Q * p[0] && tips.at(-1)[1] === Q * p[1]; });
function traceWitness(q, K, from) {
  const out = [];
  if (from[0] !== K[0][0] || from[1] !== K[0][1]) out.push({type: 'hop', to: K[0]});
  for (let i = 1; i <= K.length; i++) out.push({type: 'draw', to: K[i % K.length]});
  return out;
}
const out = PUZZLES.map(item => {
  const q = structuredClone(item.q), kinds = q.machines, pins = q.pins.map(quarter);
  assert.ok(legalPose(q, kinds, pins, quarter(q.tracer)), `${item.title}: the start is legal`);
  if (q.mode === 'dots') {
    q.witness = q.dots.map(d => {
      const knobs = knobsFor(q, kinds, q.pins, d);
      assert.equal(knobs.length, 1, `${item.title}: one knob dot puts the pencil on ${d}`);
      assert.deepEqual(knobs[0], knobFor(kinds, pins, quarter(d)));
      return {type: 'hop', to: knobs[0]};
    });
    assert.ok(!q.dots.some(d => tipsOf(kinds, pins, quarter(q.tracer)).at(-1).every((v, i) => v === Q * d[i])), `${item.title}: the pencil starts off the dots`);
  }
  if (q.mode === 'trace') {
    const K = q.target.map(c => knobFor(kinds, pins, quarter(c)));
    assert.ok(K.every(Boolean), `${item.title}: every corner has a knob dot`);
    K.forEach(k => assert.ok(legalPose(q, kinds, pins, quarter(k)), `${item.title}: the knob can rest on ${k}`));
    // The knob dots whose pencil lies on the outline are the knob outline's dots.
    const onTarget = lattice(q).filter(t => { const tips = legalPose(q, kinds, pins, quarter(t)); return tips && q.target.some((c, i) => onSeg(tips.at(-1), quarter(c), quarter(q.target[(i + 1) % q.target.length]))); }).map(key).sort();
    const onKnob = lattice(q).filter(t => K.some((c, i) => onSeg(quarter(t), quarter(c), quarter(K[(i + 1) % K.length])))).map(key).sort();
    assert.deepEqual(onTarget, onKnob, `${item.title}: the knob outline is exactly the dots that put the pencil on the outline`);
    q.knobOutline = K;
    q.witness = traceWitness(q, K, q.tracer);
  }
  if (q.mode === 'region') {
    const inside = insideDots(q), [[x0, y0], [x1, y1]] = q.box, O = q.pins[0];
    const half = lattice(q).filter(([x, y]) => 2 * x - O[0] >= x0 && 2 * x - O[0] <= x1 && 2 * y - O[1] >= y0 && 2 * y - O[1] <= y1).map(key);
    assert.deepEqual([...inside].sort(), half.sort(), `${item.title}: the knob region is the half-size box`);
    q.inside = inside.length;
    assert.equal(q.inside, 12);
    assert.ok(!inside.includes(key(q.tracer)), `${item.title}: the knob starts outside the region`);
    const rows = [...new Set(inside.map(k => k.split(',')[1]))].map(Number).sort((a, b) => a - b);
    q.witness = rows.flatMap(y => { const xs = inside.filter(k => Number(k.split(',')[1]) === y).map(k => Number(k.split(',')[0])); return [{type: 'hop', to: [Math.min(...xs), y]}, {type: 'draw', to: [Math.max(...xs), y]}]; });
    q.witness.push({type: 'all'});
  }
  if (q.mode === 'anchor' || q.mode === 'shift' || q.mode === 'chain') {
    const sols = solutions(q);
    if (q.mode === 'chain' && q.movable.pins[0]) {
      assert.equal(sols.length, q.count, `${item.title}: ${q.count} pairs of pins work`);
      assert.ok(sols.every(s => s.pins[1][0] - s.pins[0][0] === 2 * q.slide[0] && s.pins[1][1] - s.pins[0][1] === 2 * q.slide[1]), `${item.title}: every working pair has the gap twice the slide`);
      assert.ok(sols.some(s => s.pins.every((p, k) => p[0] === q.solution[k][0] && p[1] === q.solution[k][1])));
    } else {
      assert.equal(sols.length, 1, `${item.title}: exactly one answer`);
      const s = sols[0];
      if (q.mode === 'anchor') assert.deepEqual(s.pins[0], q.solution);
      if (q.mode === 'shift') { assert.deepEqual(s.at, q.solution); assert.deepEqual(s.at, [(q.pins[0][0] - q.ghostPin[0]) / 2, (q.pins[0][1] - q.ghostPin[1]) / 2], `${item.title}: the picture moves half the pin’s move`); }
      if (q.mode === 'chain') assert.deepEqual(s.pins, q.solution);
    }
    assert.ok(!workable(q, kinds, pins, [0, 0]), `${item.title}: the start is not an answer`);
    // The witness: move what must move, lift the knob to a green corner, trace.
    const goal = q.mode === 'chain' ? q.solution : q.mode === 'anchor' ? [q.solution] : q.pins, at = q.mode === 'shift' ? q.solution : [0, 0];
    const w = [];
    goal.forEach((pin, k) => { if (pin[0] !== q.pins[k][0] || pin[1] !== q.pins[k][1]) w.push({type: 'pin', k, to: pin}); });
    if (at[0] || at[1]) w.push({type: 'stencil', to: at});
    const K = q.stencil.map(p => [p[0] + at[0], p[1] + at[1]]), here = q.tracer;
    q.witness = [...w, ...traceWitness(q, K, here)];
  }
  if (q.mode === 'shift') {
    // Traced in place, the copy lands moved by minus the pin's move.
    const d = [q.pins[0][0] - q.ghostPin[0], q.pins[0][1] - q.ghostPin[1]];
    assert.ok(workable({...q, target: q.target.map(p => [p[0] - d[0], p[1] - d[1]])}, kinds, pins, [0, 0]), `${item.title}: in place the copy moves by −d`);
  }
  const id = `pantograph-${String(item.number).padStart(2, '0')}`, objective = typeof OBJECTIVE[q.mode] === 'function' ? OBJECTIVE[q.mode](q) : OBJECTIVE[q.mode];
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'pantograph', familyTitle: 'Drawing machines', revision: 1,
    parameters: q,
    objective, visibleObjective: typeof VISIBLE[q.mode] === 'function' ? VISIBLE[q.mode](q) : VISIBLE[q.mode], instruction: objective,
    controls: CONTROLS[q.mode], rules: RULES[q.mode],
    idea: item.idea, prerequisites: PREREQUISITES[q.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    provenance: item.provenance,
    sourceDocument: 'docs/pantograph/README.md'
  };
});
function onSeg(p, a, b) { return (b[0] - a[0]) * (p[1] - a[1]) === (b[1] - a[1]) * (p[0] - a[0]) && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]); }

// Every witness solves its puzzle through the move rules.
for (const p of out) {
  let a = freshAttempt(p);
  for (const action of p.parameters.witness) { const next = move(p, a, action); assert.ok(next, `${p.id}: witness step ${JSON.stringify(action)}`); a = next; }
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
}

const pack = {
  title: 'Drawing machines',
  version: 1,
  families: [{id: 'pantograph', title: 'Drawing machines', mathematics: 'A pantograph is four bars: two long bars pierced at their midpoints and two half-length bars, joined in a rhombus. Pinned at O, every open pose has its knob T and its pencil P on one line through O with P = O + 2(T − O): the machine is the dilation by 2 about O. Lengths double, angles and direction stay, areas multiply by 4. With the tips swapped it is the dilation by ½. Moving the pin by d moves the copy by −d, so the picture must move d/2 to put the copy back. A ×2 machine whose pencil drives a ×½ machine slides the picture by half the gap between the pins. On screen the knob stays on lattice dots, so every copy is exact.', rules: RULES.trace, sourceIds: SOURCES}],
  sources: [
    {id: 'pantograph-week85', title: 'Bellingham Math Circle — Week 85: Drawing machines (worksheets, materials and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-85', kind: 'worksheet'},
    {id: 'pantograph-card85', title: 'Bellingham Math Circle — Week 85 review card (Drawing machines), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-85.md', kind: 'worksheet'},
    {id: 'pantograph-check85', title: 'Bellingham Math Circle — Week 85 mathematics check (pantograph poses, copies, areas and anchors)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-85-math.md', kind: 'worksheet'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
await writeFile(new URL('../dist/families/pantograph/pantograph.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${p.title}: ${p.parameters.witness.length} moves`).join('\n'));
