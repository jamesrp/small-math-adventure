// Authoring list for Mirror twins (worksheet Week 37, tetrahedron chirality).
// Every model is written as its letters by position: middle, top, right,
// left (the view from the middle corner). Computes each puzzle's answer with
// the mechanic's own rotations (whether the pair can match, the fewest taps,
// every merge, every set-up, the classes of a sort), checks it against the
// table in docs/tetra/README.md, and writes dist/families/tetra/tetra.json.
// Run: node scripts/build-tetra.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {canMatch, tapsTo, classesOf, ROTATIONS, rotated, LETTERS} from '../dist/families/tetra/tetra.js';

const L = s => s === '' ? ['', '', '', ''] : [...s];
const merge = (list, drop, keep) => list.map(x => x === drop ? keep : x);
const bag = list => [...list].sort().join('');

const MATH = 'A model is a solid with a letter on each of its four corners. It is drawn from one corner: that corner is in the middle, nearest you, and the other three make the triangle behind it. Two models match when one can be turned so that every corner shows the same letter as the other model’s corner in that place.';
const CONTROLS = {
  turn: 'Tap a corner of your model, the right-hand one, to turn it a third of the way round that corner. With a keyboard, Tab to a corner and press Enter or Space. Undo takes back a turn.',
  cant: 'If you think no turn can match them, press Can’t, then tap two letters round the middle of each model, the same two in the same order: an arrow goes from the first through the second. Both models need the same letter in the middle. Can’t opens once you have turned your model.',
  merge: 'Tap a letter under the models, then another: the first becomes the second on both models. That is your one change; Undo takes it back.',
  merges: 'Tap a letter under the models, then another: the first becomes the second on both models. When your model matches, that pair of letters goes on the shelf and both models start again. That’s all checks the shelf.',
  blank: 'Tap a blank corner of your model to put the next letter there, A first. Once all four are on, taps turn it. Start again takes the letters off.',
  change: 'Tap an A on each model to change it to D. Once both are changed, taps on your model turn it. Start again changes them back.',
  sort: 'Tap a small model to put it on the big board, then tap the big board’s corners to turn it a third of the way round each. Models that look exactly alike stack together. That’s all checks that no two stacks could be turned to match. If that is right, a model from each of two stacks with the same letters comes up as a pair, to show with Can’t that they can’t match.',
  proof: 'Tap the corners of the second one to turn it (its stack stays as it is) until both have the same letter in the middle. Then press Can’t and tap two letters round the middle of each model, the same two in the same order: an arrow goes from the first through the second.',
  playground: 'Tap a corner of either model to turn it a third of the way round that corner. Letters switches to changing letters: each tap moves a corner on to the next letter. Press Letters again to turn.'
};
const RULES = {
  model: 'A model is a regular tetrahedron with a letter on each corner, drawn from one corner: that corner is in the middle, nearest you, and the other three are the triangle of the far face.',
  turn: 'A tap on a corner turns the model a third of the way round that corner. The corner stays put and the other three move one place round it. Turning never changes the letters.',
  match: 'Two models match when every corner shows the same letter in the same place. Which way a letter faces does not count.',
  cant: 'Can’t is a claim. With the same letter in the middle of both models, tap the same two letters round it on each; the arrows show which way each model goes round.',
  merge: 'A change makes one letter into another on both models at once.',
  merges: 'Each pair of letters counts once, whichever of the two the other becomes.',
  sort: 'Models that show the same letter in every place stack together.'
};
const OBJECTIVE = {
  turn: 'Turn your model so it matches the other one.',
  cant: 'Turn your model so it matches the other one, or show with Can’t that no turn can.',
  merge: 'Make two letters the same, then turn to match.',
  changeMatch: 'Change one A on each to D so they match.',
  changeApart: 'Change one A on each to D so they can’t match.',
  blank: 'Put on A, B, C and D so the two can’t match.',
  merges: 'Find every pair of letters that, made the same, lets the models match.',
  sort: 'Turn models so the ones that match stack together.'
};
const PREREQUISITES = {
  turn: 'Recognise four letters and compare two pictures corner by corner. No reading or arithmetic; a grown-up can read How to play.',
  cant: 'Recognise letters, compare two pictures, and follow three letters round a middle one to say which way they go. A grown-up can read How to play.',
  change: 'Recognise letters and compare two pictures; plan a change before turning.',
  sort: 'Compare several small pictures with a large one and keep track of which already look alike, then follow three letters round a middle one to say which way they go. No arithmetic.'
};

// The worksheet's models, read as the view from the apex A: its ABCD (A at
// the apex, B lower left, C lower right, D behind) is A in the middle, D at
// the top, C right and B left.
const MODEL = 'ADCB', TWIN = 'ADBC', AABC = 'ACBA', ABAC = 'ACAB';

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Turn it back', kind: 'turn', left: MODEL, right: 'ACBD', check: {can: true, fewest: [0]},
    idea: 'A tap turns the model round one corner: that corner stays put and the other three move round it.',
    hints: ['Which letters are already where they should be?', 'A is in the middle on both. Turn round A.', 'Tap the middle once.'],
    parent: {notice: 'Whether your child expects the tapped corner to stay where it is, and watches which way the other three go round.', prompt: 'Which letter never moves when you tap the middle?', explanation: 'Tapping a corner turns the solid a third of the way round the line through that corner and the middle of the opposite face. The tapped corner stays put; the other three move one place round it, clockwise as you look at that corner. Here A is in the middle of both models and the other three are one place round from where they should be, so one tap on the middle matches them. Three taps on one corner bring a model back where it started.', extension: 'How many taps on the middle bring the model back to where it started? (Three.)', connection: 'Each tap is a rotation of the regular tetrahedron by 120° about an axis through a corner.'},
    provenance: 'Week 37, every band: the worked “turn around A” (ABCD → ADBC) before Problem 1, played backwards; K–1 Problem 1.'},
  {number: 2, level: 'easy', title: 'Hide and turn', kind: 'turn', cant: true, left: MODEL, right: 'BACD', check: {can: true, fewest: [0, 1]},
    idea: 'An outer corner can be turned round too, and then the middle letter moves out and another comes in.',
    hints: ['Where is A on your model, and where should it be?', 'Bring A to the middle, then look at the other three.', 'Tap the middle, then the top corner.'],
    parent: {notice: 'Whether your child brings A to the middle on purpose, or taps corners and watches what happens.', prompt: 'Which taps move A? Which taps leave it where it is?', explanation: 'A must end where the other model has A, in the middle. A tap moves every corner except the one tapped, so tapping A’s own corner never moves A, and tapping another corner moves A one place round that corner. Here a tap on the middle sends A from the top to the right, and then a tap on the top corner brings A into the middle with every other letter in place. Two taps are the fewest; there are other ways in three.', extension: 'Turn your model into any pose with your eyes shut, then turn it back to match.', connection: 'The four turns reach all twelve rotations of the tetrahedron; every pose is at most three taps from every other.'},
    provenance: 'Week 37 K–1 Problem 1 (“Hide and turn one, then let your partner turn it back to match”), 2–3 and 4–5 Problem 1.'},
  {number: 3, level: 'easy', title: 'The printed pair', kind: 'turn', cant: true, left: MODEL, right: 'BDCA', check: {can: false},
    idea: 'With four different letters, a model and its mirror twin never match: seen from A, the others go round opposite ways.',
    hints: ['Put A in the middle of your model too. What do you notice about the other three?', 'With A in the middle of both, follow B to C to D on each. Which way round do they go?', 'Press Can’t, then tap B and then C on each model.'],
    parent: {notice: 'Whether your child keeps turning, or stops and says why no turn can work.', prompt: 'With A in the middle of both, which way do B, C and D go round on each?', explanation: 'A turn that matches the models must put A on A, here in the middle. That leaves three turns: none, one tap on the middle, or two. Each keeps the way B, C and D go round A, and on these two models they go round opposite ways, so none of the three works. That is a complete proof: A has to go on A, and all three turns about A fail. The two arrows show the same thing at once.', extension: 'Does it matter which letter you put in the middle? (No: from any letter, the other three go round opposite ways on the twins.)', connection: 'A model with four different letters is chiral, like a carbon atom with four different groups: its mirror image is a different object.'},
    provenance: 'Week 37 K–1 Problem 2, 2–3 Problem 2 and 4–5 Problems 2 and 3 (the view from A as the certificate).'},
  {number: 4, level: 'easy', title: 'Two Cs', kind: 'turn', cant: true, left: merge(L(MODEL), 'D', 'C').join(''), right: merge(L(TWIN), 'D', 'C').join(''), check: {can: true, fewest: [0]},
    idea: 'Make two letters the same and the twins match.',
    hints: ['This is the printed pair with D changed to C on both. Can you match them now?', 'Keep A in the middle and turn round it.', 'Tap the middle once.'],
    parent: {notice: 'Whether your child expects the twins still can’t match, and presses Can’t.', prompt: 'What changed from the twins before, and why does it matter?', explanation: 'Changing D to C on both models gives each two Cs. One tap on the middle moves your left C to the top and your top C to the right, and every letter then matches. With two equal letters a model is its own mirror image: the mirror through A, B and the middle of the edge between the Cs swaps the two Cs and changes nothing, so the mirror twin is the model itself, turned.', extension: 'Change one C back to D on just one model. Can they match then? (No: the letters are different.)', connection: 'A repeated label gives the tetrahedron a reflection symmetry, so it is no longer chiral.'},
    provenance: 'Week 37 K–1 Problem 3 (“Change D to C on both models from Problem 2”).'},
  {number: 5, level: 'medium', title: 'Two As', kind: 'turn', cant: true, left: AABC, right: ABAC, check: {can: true, fewest: [1]},
    idea: 'With two As there is always a way: the second A lets a turn do what the first can’t.',
    hints: ['Which letters can you bring into the middle?', 'Try bringing the other A into the middle.', 'Tap the top corner once.'],
    parent: {notice: 'Whether your child tries only turns round the middle A, decides it can’t be done and presses Can’t.', prompt: 'There are two As. Does it matter which one goes in the middle?', explanation: 'The two models look like mirror twins, and with A in the middle of both the other three go round opposite ways. But each has a second A, so the middle A can be matched with either. One tap on the top corner brings your right-hand A into the middle and sends your middle A to the left, and then every letter matches. In fact all twelve ways to put A, A, B and C on a model match each other: swapping the two As changes nothing, so any arrangement can be turned into any other.', extension: 'Can anyone make two A, A, B, C models that can’t be turned to match? (No.)', connection: 'The labelling A, A, B, C has a mirror symmetry, so its mirror image is itself.'},
    provenance: 'Week 37 K–1 Problem 4 and 2–3 Problem 5: the printed A, A, B, C pair.'},
  {number: 6, level: 'medium', title: 'Make two the same', kind: 'merge', left: MODEL, right: TWIN, hintMerge: ['D', 'C'], check: {can: false},
    idea: 'Any two letters made the same let the twins match.',
    hints: ['No turn matches these. Which two letters could you make the same?', 'Tap D, then C, to change D to C on both.', 'Change D to C, then tap the middle once.'],
    parent: {notice: 'Which pair your child chooses: B and C are in each other’s places here, so making them the same needs no turn at all.', prompt: 'Does it matter which two letters you make the same?', explanation: 'On these twins B and C are in each other’s places, so making them the same leaves nothing to turn. Any other pair works too, after one to three taps: changing D to C needs one tap on the middle. All six pairs work, which puzzle 8 asks for.', extension: 'After Restart, try a different pair. Is there a pair that doesn’t work? (No.)', connection: 'Two equal labels give the tetrahedron a mirror symmetry, so the mirror twin is a turned copy.'},
    provenance: 'Week 37 2–3 Problem 4 (“Try other choices of two letters to make equal”), with the child choosing the pair; K–1 Problem 3.'},
  {number: 7, level: 'medium', title: 'A becomes D', kind: 'change', goal: 'match', left: AABC, right: ABAC, check: {match: [[0, 2], [3, 0]], apart: [[0, 0], [3, 2]]},
    idea: 'Which As you change decides it: only two As that meet in the match can both become D and still match.',
    hints: ['The models match now. Which A of yours lands on which A of the other?', 'Change the middle A on the left model and the right-hand A on yours.', 'Then tap the top corner once.'],
    parent: {notice: 'Whether your child changes two As at random and then tries turning, or first works out which As meet when the models match.', prompt: 'When the two models match, which of your As sits on the other model’s middle A?', explanation: 'Before the change, one tap on your top corner matches the models: your right-hand A goes to the middle, onto the other model’s middle A, and your middle A goes to the left, onto its left A. Changing two As that meet in that match keeps a match: the left model’s middle A with your right-hand A, or the left model’s left A with your middle A. The other two choices give four different letters arranged as mirror twins, which can never match (puzzle 10).', extension: 'Which changes make a pair that can’t match? (Both middle As, or the left model’s left A with your right-hand A.)', connection: 'Putting a fourth letter back makes the model chiral again, and either chirality can come out.'},
    provenance: 'Week 37 2–3 Problem 6, its first question (“Can you choose the changes to make a matching pair?”).'},
  {number: 8, level: 'medium', title: 'Which pairs?', kind: 'merges', left: MODEL, right: TWIN, order: ['CD', 'BC', 'AB', 'BD', 'AC', 'AD'], check: {taps: {AB: 1, AC: 2, AD: 3, BC: 0, BD: 2, CD: 1}},
    idea: 'All six pairs work: two equal letters always make a model its own mirror image.',
    hints: ['Start with any two letters, then try a pair you haven’t tried.', 'Each pair goes on the shelf once, whichever letter the other becomes.', 'Make each pair the same in turn, match the models, and press That’s all when you have them all.'],
    parent: {notice: 'Whether your child expects some pairs, such as those with A in them, not to work.', prompt: 'Why does every pair work?', explanation: 'Whichever two letters are equal, the model has a mirror symmetry: the plane through the other two corners and the middle of the equal letters’ edge swaps the equal corners and changes nothing. Two reflections make a turn, so the mirror twin, which is the model reflected, is also the model reflected twice: the model turned. The fewest taps differ: none for B and C (they are in each other’s places), one for C and D or A and B, two for B and D or A and C, three for A and D.', extension: 'What if three letters were the same, A, A, A and B? (Still a match, for the same reason.)', connection: 'Equal labels at two vertices add a reflection to the labelled tetrahedron’s symmetry group.'},
    provenance: 'Week 37 2–3 Problem 4 and 4–5 Problem 4 (“Which choices allow a match by turning? Explain why your conclusion covers every choice”).'},
  {number: 9, level: 'hard', title: 'Four blank corners', kind: 'blank', left: MODEL, right: '', check: {apart: 12, of: 24},
    idea: 'Of the 24 ways to put on four letters, 12 match the other model and 12 make its mirror twin.',
    hints: ['Think of a copy of the other model, then change it. What change can no turn undo?', 'Put A in the middle, as on the other, and put B and C in each other’s places.', 'Put A in the middle, D at the top, B on the right and C on the left; then turn round the middle and press Can’t.'],
    parent: {notice: 'Whether your child places letters at random and checks by turning, or builds the mirror twin on purpose by swapping two letters of a copy.', prompt: 'If you swap two letters of a copy, can turning ever swap them back?', explanation: 'Half of the 24 placements can be turned to match the other model and half can’t. The ones that can’t are exactly the turned copies with two letters swapped: seen from a letter the swap leaves alone, the swap reverses the way the others go round, and turns never reverse it. The arrows of Can’t show it. A placement that matches is not a solve; Start again takes the letters off.', extension: 'How many placements can’t match? (12 of the 24.)', connection: 'A swap is an odd permutation, and the rotations of the tetrahedron are exactly the even permutations of its corners.'},
    provenance: 'Week 37 K–1 Problem 5 (“Make one pair that matches and one pair that you think cannot match”) and 2–3 Problem 3 (“Make another pair with A, B, C and D”), as a placement that can’t match the printed model.'},
  {number: 10, level: 'hard', title: 'A becomes D again', kind: 'change', goal: 'apart', left: AABC, right: ABAC, check: {match: [[0, 2], [3, 0]], apart: [[0, 0], [3, 2]]},
    idea: 'The other two changes give four different letters arranged as mirror twins.',
    hints: ['When the two models match, which A of yours lands on which A of the other?', 'Change the middle A on both models.', 'Change both middle As, turn round the middle once, then press Can’t.'],
    parent: {notice: 'Whether your child uses what puzzle 7 showed about which As meet.', prompt: 'Why do these changes give a pair that can’t match?', explanation: 'Changing both middle As, or the left model’s left A with your right-hand A, changes two As that don’t meet in the match. The result has four different letters, and the models are mirror twins: with the same letter in the middle of both, the other three go round opposite ways.', extension: 'Of the four ways to change one A on each, how many give a pair that can’t match? (Two.)', connection: 'Restoring distinct labels can land in either chirality class; which one depends on how the changed corners correspond under the match.'},
    provenance: 'Week 37 2–3 Problem 6, its second question (“Can you choose them to make a pair that will not match?”).'},
  {number: 11, level: 'hard', title: 'Six models', kind: 'sort', cards: ['ADCB', 'ABCD', 'BCDA', 'CABD', 'DCAB', 'DBAC'], check: {classes: [[0, 2, 4], [1, 3, 5]], twins: [[0, 1]]},
    idea: 'Six models with A, B, C and D make only two stacks: every placement of four different letters matches one of two.',
    hints: ['Choose one model and turn another to look exactly like it.', 'If a model can’t be made to look like the first, try the others.', 'Make every model look like one of two, press That’s all, then show with Can’t that the two can’t match.'],
    parent: {notice: 'Whether your child expects more than two stacks, and how they decide that a model can’t join a stack.', prompt: 'Why can’t the last two stacks become one?', explanation: 'Twelve turns give each model twelve different looks, and the 24 ways to put on four different letters fall into two groups of twelve: on one, seen from A, the other three go round clockwise, and on the other anticlockwise. So six models make two stacks. After That’s all, the child shows with Can’t, as in puzzle 3, that the two can’t join: with the same letter in the middle of both, the arrows run opposite ways.', extension: 'How many different models can be made with A, B, C and D if models that match count as the same? (Two.)', connection: 'The 24 labellings form two orbits of the tetrahedron’s rotation group A4, which has 12 elements: 24 ÷ 12 = 2.'},
    provenance: 'Week 37 4–5 Problem 6 (“How many genuinely different models can be made if models that match by turning count as the same?”), as a sort of six of the 24 placements; the review card’s fix 8 fixes the letters as A, B, C and D.'},
  {number: 12, level: 'hard', title: 'Eight models', kind: 'sort', cards: [AABC, 'ADCB', 'ABCD', ABAC, 'DCAB', 'BACA', 'CABD', 'BCDA'], check: {classes: [[0, 3, 5], [1, 4, 7], [2, 6]], twins: [[1, 2]]},
    idea: 'Models with two As all stack together, mirror-looking ones included; four different letters give two stacks.',
    hints: ['Sort the models with two As apart from the ones with four different letters.', 'Two of the A, A, B, C models look like mirror twins. Try turning one to look like the other.', 'Make one stack of the A, A, B, C models and two of the others, press That’s all, then show with Can’t that those two can’t match.'],
    parent: {notice: 'Whether your child gives the A, A, B, C mirror look-alikes separate stacks.', prompt: 'Why do all the A, A, B, C models stack, when the A, B, C, D ones make two stacks?', explanation: 'All twelve ways to put on A, A, B and C match each other (puzzle 5): swapping the two As changes nothing, so any arrangement can be turned into any other. The models with four different letters fall into two groups, as in puzzle 11. So the eight models make three stacks. Only the two stacks of four different letters need the Can’t certificate after That’s all; stacks with different letters can never match.', extension: 'What about A, A, B and B? (All of those stack together too.)', connection: 'A labelling with a repeated letter is its own mirror image, so its orbit under rotation is also its orbit under every symmetry.'},
    provenance: 'New, after Week 37 4–5 Problem 6, with the A, A, B, C models of K–1 Problem 4 and 2–3 Problem 5.'}
];

const id = n => `tetra-${String(n).padStart(2, '0')}`;
// Every way to finish a set-up from the start, as final letters.
function setups(item) {
  if (item.kind === 'blank') {
    const out = [];
    (function go(rest, used) { if (!rest.length) { out.push({right: used}); return; } rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...used, x])); })(LETTERS, []);
    return out.map(({right}) => ({left: L(item.left), right, choice: right.join('')}));
  }
  const left = L(item.left), right = L(item.right), out = [];
  for (const i of [0, 1, 2, 3].filter(k => left[k] === 'A')) for (const j of [0, 1, 2, 3].filter(k => right[k] === 'A')) {
    const a = [...left], b = [...right]; a[i] = 'D'; b[j] = 'D'; out.push({left: a, right: b, choice: [i, j]});
  }
  return out;
}
const SOURCES = ['tetra-week37', 'tetra-card37', 'tetra-schwartz', 'tetra-openstax'];
const out = PUZZLES.map(item => {
  let q, solution, objective, controls, rules = [RULES.model, RULES.turn, RULES.match], prereq;
  if (item.kind === 'sort') {
    const cards = item.cards.map(L);
    assert.equal(new Set(item.cards).size, cards.length, `${id(item.number)}: no two cards start alike`);
    const classes = classesOf(cards);
    assert.deepEqual(classes, item.check.classes, `${id(item.number)}: classes`);
    for (const c of classes) assert.ok(c.every(n => bag(cards[n]) === bag(cards[c[0]])), `${id(item.number)}: a class keeps its letters`);
    // The stacks that need the Can't certificate after That's all: two classes
    // with the same letters, which are mirror twins.
    const twins = classes.flatMap((c, i) => classes.slice(i + 1).flatMap((d, j) => bag(cards[c[0]]) === bag(cards[d[0]]) ? [[i, i + 1 + j]] : []));
    assert.deepEqual(twins, item.check.twins, `${id(item.number)}: stacks to show apart`);
    for (const [i, j] of twins) assert.ok(new Set(cards[classes[i][0]]).size === 4 && !canMatch(cards[classes[i][0]], cards[classes[j][0]]), `${id(item.number)}: twins with four different letters`);
    q = {mode: 'sort', cards};
    solution = {classes, turns: classes.flatMap(c => c.slice(1).map(n => ({card: n, taps: tapsTo(cards[c[0]], cards[n])}))), twins};
    objective = OBJECTIVE.sort; controls = `${CONTROLS.sort} ${CONTROLS.proof}`; rules = [RULES.model, RULES.turn, RULES.sort, RULES.cant]; prereq = PREREQUISITES.sort;
  } else if (item.kind === 'merges') {
    const left = L(item.left), right = L(item.right);
    assert.equal(canMatch(left, right), false, `${id(item.number)}: the twins can't match before a change`);
    const taps = {};
    for (const pair of item.order) {
      const [keep, drop] = pair, both = [[keep, drop], [drop, keep]].map(([k, d]) => tapsTo(merge(left, d, k), merge(right, d, k)));
      assert.ok(both.every(t => t !== null), `${id(item.number)}: ${pair} works either way`);
      assert.equal(both[0].length, both[1].length, `${id(item.number)}: ${pair} takes as many taps whichever letter stays`);
      taps[pair] = both[0].length;
    }
    assert.deepEqual(taps, item.check.taps, `${id(item.number)}: fewest taps after each merge`);
    assert.deepEqual([...item.order].sort(), ['AB', 'AC', 'AD', 'BC', 'BD', 'CD'], `${id(item.number)}: every pair in the hint order`);
    q = {mode: 'merges', left, right, order: item.order};
    solution = {pairs: [...item.order].sort(), taps};
    objective = OBJECTIVE.merges; controls = `${CONTROLS.turn} ${CONTROLS.merges}`; rules = [...rules, RULES.merge, RULES.merges]; prereq = PREREQUISITES.change;
  } else {
    const left = L(item.left), right = L(item.right);
    q = {mode: 'pair', left, right, goal: item.goal || 'match', cant: Boolean(item.cant || item.kind === 'blank' || (item.kind === 'change' && item.goal === 'apart')), merge: item.kind === 'merge'};
    if (item.kind === 'merge') q.hintMerge = item.hintMerge;
    if (item.kind === 'blank') q = {...q, goal: 'apart', place: {right: {letters: [...LETTERS], on: ''}}};
    if (item.kind === 'change') q.place = {left: {letters: ['D'], on: 'A'}, right: {letters: ['D'], on: 'A'}};
    if (item.kind === 'turn') {
      assert.equal(canMatch(left, right), item.check.can, `${id(item.number)}: can match`);
      assert.equal(bag(left), bag(right), `${id(item.number)}: the same letters`);
      assert.ok(!left.every((x, i) => x === right[i]), `${id(item.number)}: starts unmatched`);
      if (item.check.can) assert.deepEqual(tapsTo(left, right), item.check.fewest, `${id(item.number)}: fewest taps`);
      solution = item.check.can ? {taps: tapsTo(left, right)} : {cant: true};
      objective = q.cant ? OBJECTIVE.cant : OBJECTIVE.turn; controls = `${CONTROLS.turn}${q.cant ? ` ${CONTROLS.cant}` : ''}`;
      if (q.cant) rules = [...rules, RULES.cant];
      prereq = q.cant && !item.check.can ? PREREQUISITES.cant : PREREQUISITES.turn;
    } else if (item.kind === 'merge') {
      assert.equal(canMatch(left, right), false, `${id(item.number)}: no turn matches before a change`);
      const merges = [];
      for (const d of LETTERS) for (const k of LETTERS) if (d !== k) { const t = tapsTo(merge(left, d, k), merge(right, d, k)); assert.ok(t, `${id(item.number)}: ${d} to ${k} works`); merges.push({drop: d, keep: k, taps: t}); }
      assert.deepEqual(merges.find(m => m.drop === item.hintMerge[0] && m.keep === item.hintMerge[1]).taps, [0], `${id(item.number)}: the hinted merge, then the middle`);
      solution = {merges};
      objective = OBJECTIVE.merge; controls = `${CONTROLS.turn} ${CONTROLS.merge}`; rules = [...rules, RULES.merge]; prereq = PREREQUISITES.change;
    } else {
      const all = setups(item), apart = all.filter(s => !canMatch(s.left, s.right)), match = all.filter(s => canMatch(s.left, s.right));
      for (const s of all) assert.equal(bag(s.left), bag(s.right), `${id(item.number)}: both models end with the same letters`);
      if (item.kind === 'blank') {
        assert.equal(apart.length, item.check.apart, `${id(item.number)}: placements that can't match`);
        assert.equal(all.length, item.check.of, `${id(item.number)}: every placement`);
        // Exactly the turned copies of the other model with two letters swapped.
        const left = L(item.left), swapped = new Set();
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const w = [...left]; [w[i], w[j]] = [w[j], w[i]]; for (const g of ROTATIONS) swapped.add(rotated(w, g).join('')); }
        assert.deepEqual([...swapped].sort(), apart.map(s => s.right.join('')).sort(), `${id(item.number)}: the placements that can't match are the turned copies with a swap`);
        solution = {apart: apart.map(s => s.choice)};
        objective = OBJECTIVE.blank; controls = `${CONTROLS.blank} ${CONTROLS.turn} ${CONTROLS.cant}`; rules = [...rules, RULES.cant]; prereq = PREREQUISITES.cant;
      } else {
        assert.deepEqual(match.map(s => s.choice), item.check.match, `${id(item.number)}: changes that match`);
        assert.deepEqual(apart.map(s => s.choice), item.check.apart, `${id(item.number)}: changes that can't`);
        assert.ok(canMatch(left, right), `${id(item.number)}: the pair matches before the change`);
        solution = item.goal === 'match' ? {changes: match.map(s => ({left: s.choice[0], right: s.choice[1], taps: tapsTo(s.left, s.right)}))} : {changes: apart.map(s => ({left: s.choice[0], right: s.choice[1]}))};
        objective = item.goal === 'match' ? OBJECTIVE.changeMatch : OBJECTIVE.changeApart;
        controls = `${CONTROLS.change} ${CONTROLS.turn}${item.goal === 'apart' ? ` ${CONTROLS.cant}` : ''}`;
        if (item.goal === 'apart') rules = [...rules, RULES.cant];
        prereq = PREREQUISITES.change;
      }
    }
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Mirror twins', mechanic: 'tetra', band: 'all', revision: 1, sourceDocument: 'docs/tetra/README.md',
    parameters: q,
    objective, visibleObjective: item.kind === 'turn' ? '' : objective, instruction: objective,
    controls: `${MATH} ${controls}`, rules, idea: item.idea, prerequisites: prereq, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution, provenance: item.provenance
  };
});

// The twelve rotations and the two classes, once more, for the record.
assert.equal(ROTATIONS.length, 12);
const playground = {
  id: 'tetra-playground', number: 0, title: 'Mirror twins playground', difficulty_level: 'playground', familyTitle: 'Mirror twins', mechanic: 'tetra', band: 'playground', revision: 1, sourceDocument: 'docs/tetra/README.md',
  parameters: {mode: 'playground', left: L(MODEL), right: L(TWIN)},
  objective: 'Turn two models and change their letters to make pairs that match, or twins that can’t.', visibleObjective: '',
  instruction: 'Turn two models and change their letters to make pairs that match, or twins that can’t.',
  controls: `${MATH} ${CONTROLS.playground}`,
  rules: [RULES.model, RULES.turn, RULES.match],
  idea: 'Free play with two models: turn either one, change letters, and make a pair for someone else to match.',
  prerequisites: 'None. A grown-up or a partner can set a pair as a challenge.',
  hints: ['Make a pair for someone else, then let them try to match it.', 'Swap two letters on one model and see whether any turn undoes it.', 'Make two letters the same and try again.'],
  parent: {notice: 'Whether your child makes pairs for someone else, and predicts before turning whether they can match.', prompt: 'Can you make two models that look different but match?', explanation: 'Any two models with the same four different letters either match or are mirror twins. With a repeated letter, any two models with the same letters match.', extension: 'Make a pair of mirror twins, then change one letter on both so they match.', connection: 'The two models are a hands-on picture of the rotation group of the tetrahedron acting on labellings.', sourceIds: SOURCES},
  provenance: 'Week 37 K–1 Problem 1 and Problem 5 (“Make one pair that matches and one pair that you think cannot match”), as free play.'
};
const json = {
  title: 'Mirror twins',
  version: 1,
  families: [{id: 'tetra', title: 'Mirror twins', mathematics: 'A model is a regular tetrahedron with a letter on each corner, drawn from one corner. A tap turns it a third of the way round a corner; the four turns reach all twelve rotations and never a reflection. Two models match when a rotation carries one onto the other letter for letter. With four different letters the 24 labellings fall into two classes of twelve, each the mirror image of the other: seen from A, the other three run clockwise on one and anticlockwise on the other, and a turn never reverses that, so mirror twins can’t match. Make any two letters equal and the model is its own mirror image, so it matches its twin; all twelve labellings with A, A, B, C match each other.', rules: [RULES.model, RULES.turn, RULES.match], sourceIds: SOURCES}],
  sources: [
    {id: 'tetra-week37', title: 'Bellingham Math Circle — Week 37: Mirror twins (student packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-37', kind: 'local curriculum'},
    {id: 'tetra-card37', title: 'Week 37 review card and math check (the view-from-A certificate, every merge, the A, A, B, C class; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-37.md', kind: 'local curriculum'},
    {id: 'tetra-schwartz', title: 'Richard Evan Schwartz — Symmetry Groups of Platonic Solids, handout (Brown University, 2007), §3, Rotations of the Tetrahedron, printed p. 3', url: 'https://www.math.brown.edu/reschwar/MFS/handout3.pdf', kind: 'research'},
    {id: 'tetra-openstax', title: 'OpenStax — Organic Chemistry, §5.1, Enantiomers and the Tetrahedral Carbon', url: 'https://openstax.org/books/organic-chemistry/pages/5-1-enantiomers-and-the-tetrahedral-carbon', kind: 'reference'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/tetra/tetra.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode}${p.parameters.goal ? ` ${p.parameters.goal}` : ''}${p.parameters.cant ? ' cant' : ''} ${JSON.stringify(p.solution).slice(0, 90)}`).join('\n'));
