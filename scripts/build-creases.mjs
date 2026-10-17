// Authoring list for Flat folds (worksheet Week 28, single-vertex flat
// folding). Computes every answer with the mechanic's own functions, checks
// them against the table in docs/creases/README.md, and writes
// dist/families/creases/creases.json. Run: node scripts/build-creases.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {completions, shares, oddDisks, needs, alternating, image, validWords} from '../dist/families/creases/fold.js';
import {goodPlaces, rayAngles2} from '../dist/families/creases/creases.js';

const labels = word => [...word].map(c => (c === '?' ? null : c));
const RIGHT = [90, 90, 90, 90];
const row = ['M?V?', 'MM??', 'V?V?'].map(w => ({angles: RIGHT, fixed: labels(w)}));

const MATH = 'A crease is a mountain (M) when it rises towards you from the yellow front and a valley (V) when it sinks away; the wedges are the pieces between the rays.';
const RULES = {
  common: [
    'Every ray is folded all the way flat, as a mountain (M) or a valley (V) seen from the yellow front.',
    'Paper can’t pass through paper: layers may touch, but no fold may go through a layer.',
    'Printed letters (dark) stay as they are.'
  ],
  fold: 'Can’t: after a fold, press Can’t, colour each wedge by the side it would show facing up, and press Check.',
  tabs: 'Each tab labels one open ray, and every tab is used. Can’t: after a fold, press Can’t, tap the disks that show why, and press Check.',
  ray: 'The new ray goes on a tick of the rim; the ticks are 15° apart.',
  playground: 'Up to eight rays, on the ticks of the rim, 15° apart. Nothing needs finishing.'
};
const CONTROLS = {
  fold: `${MATH} Tap a ray or its letter to switch it between M and V, then press Fold to see the rim of the disk folded up from the side. If you think it can’t be done, press Can’t after a fold, tap each wedge to colour it yellow or green, and press Check.`,
  tabs: `${MATH} Each tab is an M or a V for one open ray. Tap an open ray to put a tab on it (M, then V, then off), and press Fold when every tab is on. If you think it can’t be done, press Can’t after a fold, tap the disks that show why, and press Check.`,
  ray: `${MATH} Drag the round knob round the rim, or tap the disk away from the rays, to put the new ray on a tick; arrow keys move the knob too. Tap a ray or its letter to switch it between M and V, then press Fold.`,
  playground: `${MATH} Tap inside the disk away from the rays to add a ray, tap a ray or its letter to switch it between M and V, and tap a ray’s end on the rim (or press Delete) to take it away. The round knob adds a ray too: drag it in, or use the arrow keys and Enter. Press Fold to fold it; Clear takes every ray away.`
};
const OBJECTIVE = {
  fold: 'Label the open rays so that the disk folds flat, or show that it can’t.',
  tabs: 'Use every tab so that every disk folds flat, or show that it can’t be done.',
  ray: 'Add one ray so that the disk folds flat, and fold it.',
  playground: 'Crease a disk and fold it.'
};
const VISIBLE = {fold: 'Fold the disk flat.', tabs: 'Use every tab so all the disks fold.', ray: 'Add a ray so the disk folds flat.', playground: ''};
const PREREQUISITES = {
  fold: 'No arithmetic needed to fold; reading the degrees on the wedges, and adding two or three of them, helps with the reason a disk can’t fold.',
  tabs: 'Count to six and keep track of tabs used. No reading beyond M, V and the disk letters.',
  ray: 'Count ticks (15° each) and add two or three angles to 180°.',
  playground: 'None.'
};
const sources = ['creases-week28', 'creases-card28', 'creases-hull'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'One ray short', mode: 'ray', rays: [0, 60, 180], fixed: labels('???'), check: {places: [300], words: 6},
    idea: 'An even number of wedges whose every other wedge adds to a half-turn: the missing ray must make the wedge after ray 3 as big as the wedge after ray 2.',
    hints: ['Put the new ray somewhere, label every ray, and press Fold. Look at where the two ends of the strip land.', 'Folded flat, the wedges after rays 1 and 3 point one way and the other two point back. Each pair has to make a half-turn, 180°.', 'The wedge after ray 1 is 60°, so the wedge after ray 3 must be 120°: put the new ray 8 ticks after ray 3.'],
    parent: {notice: 'Whether your child places the ray by looking (opposite ray 2, a mirror image) or by counting ticks, and what the gap at the seam tells them after a fold.', prompt: 'The ends missed. Which way should the new ray move?', explanation: 'With rays at 0°, 60° and 180° the wedges are 60°, 120°, then two wedges that share the last 180°. Folding flat turns the paper over at every crease, so the wedges after rays 1 and 3 point one way and the other two back; the strip closes only when 60° and the wedge after ray 3 make 180°, so that wedge is 120° and the new ray is at 300°, the mirror image of ray 2. Then 6 of the 16 labellings fold: three of one letter and one of the other, with the new ray, ray 1 and ray 2 (round the two 60° wedges) not all the same.', extension: 'Try rays at 0°, 30° and 180°, and at 0°, 120° and 180°.', connection: 'Kawasaki’s theorem: one vertex folds flat exactly when its alternating angles each add to 180° (with free mountains and valleys).'},
    provenance: 'Week 28 Grades 2–3 Problem 4, pattern B (rays at 0°, 60° and 180°): “Add one ray to each pattern so the two alternating groups of wedges both make a half-turn. Make a flat fold of each completed pattern.”'},
  {number: 2, level: 'easy', title: 'Two mountains printed', mode: 'fold', angles: [60, 120, 120, 60], fixed: labels('MM??'), check: {words: ['MMMV']},
    idea: 'Three of one letter and one of the other, and the two small wedges side by side can’t be rolled up one way.',
    hints: ['Label rays 3 and 4 and press Fold. Watch the strip.', 'Four creases fold with three of one letter and one of the other, so rays 3 and 4 need one M and one V.', 'Make ray 3 a mountain and ray 4 a valley.'],
    parent: {notice: 'Whether your child tries MMMM or MMVV first, and what the jam looks like when rays 4, 1 and 2 are all mountains.', prompt: 'Rays 3 and 4 need one of each. Which way round?', explanation: 'Four creases fold with three of one letter and one of the other (Maekawa), so rays 3 and 4 are M and V in some order. The two 60° wedges sit side by side across ray 1, between the 120° wedges. If rays 4, 1 and 2 all bend the same way, the pair can’t tuck in between the 120° wedges: the fold along ray 1 ends up inside them, and they would have to pass through it (the app marks where). So ray 4 is the valley: MMMV, the only way.', extension: 'With no printed letters, how many of the 16 labellings fold? (Six.)', connection: 'Maekawa’s theorem (|M − V| = 2) and the generalized big-little-big lemma for a run of equal smallest angles.'},
    provenance: 'Week 28 Grades 4–5 Problem 1, pattern C (60°, 120°, 120°, 60°); the printed mountains on rays 1 and 2 are new, so that random letters fold one time in four.'},
  {number: 3, level: 'easy', title: 'Six tabs', mode: 'tabs', disks: row, stock: {M: 2, V: 4}, check: {ways: 4},
    idea: 'Each right-angle disk folds with one or three mountains, so the printed letters decide how many M tabs each disk can take.',
    hints: ['Put the tabs on and press Fold. Which disks fold?', 'A disk of four right angles folds with three of one letter and one of the other. Disks B and C each need one M tab.', 'Disk A takes two V tabs. Disks B and C take one M and one V each.'],
    parent: {notice: 'Whether your child finishes one disk at a time, and what they do when the M tabs run out before disk C.', prompt: 'Which disk can manage with no M tabs?', explanation: 'A right-angle disk folds exactly when it has three of one letter and one of the other, that is one or three mountains. Disk A (M ? V ?) takes no M tab (MVVV) or two (MMVM); disks B (M M ? ?) and C (V ? V ?) take exactly one each. With two M tabs, disk A gets none, and B and C one each: 2 × 2 = 4 ways.', extension: 'With four M tabs and two V tabs? (Also four ways, with disk A taking two.)', connection: 'Maekawa’s theorem on four right angles: the 8 foldable labellings are the ones with an odd number of mountains.'},
    provenance: 'Week 28 K–1 Problem 4, row A: disks M?V?, MM?? and V?V? with 2 M and 4 V tabs, “use its six tabs to finish the disks.”'},
  {number: 4, level: 'easy', title: 'Sixty and ninety', mode: 'fold', angles: [60, 60, 60, 90, 90], fixed: labels('?????'), check: {words: [], cant: 'odd'},
    idea: 'Every crease turns the paper over, so the wedges face up and down in turn; with an odd number of creases two neighbours face the same way.',
    hints: ['Label every ray and press Fold. Look at the two ends of the strip.', 'Every crease turns the paper over. Which wedges face up when it is folded?', 'Going round, the wedges face up, down, up, down, up: the two wedges beside ray 1 both face up, though ray 1 is a crease.'],
    parent: {notice: 'Whether your child changes letters for a long time, or starts to wonder whether letters can fix it at all.', prompt: 'If the wedge after ray 1 faces up, which way does the next one face? And the one before ray 1?', explanation: 'Each crease turns the paper over, so neighbouring wedges face opposite ways when folded flat. Round five wedges that goes up, down, up, down, up, and the last wedge meets the first at ray 1 facing the same way, though ray 1 is a crease. So five creases can never fold flat, whatever the angles and letters. The certificate is a colouring with exactly one pair of matching neighbours: an odd ring can’t be coloured alternately.', extension: 'Does the same happen with three creases? With seven?', connection: 'A flat-foldable vertex has an even number of creases: the faces are properly 2-coloured by which side faces up.'},
    provenance: 'Week 28 Grades 4–5 Problem 2, pattern B (60°, 60°, 60°, 90°, 90°): “Can any of these patterns close flat along every ray?”'},
  {number: 5, level: 'medium', title: 'Two valleys printed', mode: 'fold', angles: [30, 60, 150, 120], fixed: labels('?VV?'), check: {words: ['MVVV']},
    idea: 'Around a wedge smaller than both its neighbours, the two creases must bend opposite ways (big-little-big).',
    hints: ['Label rays 1 and 4 and press Fold. Watch the slim wedge.', 'The 30° wedge is smaller than both neighbours, so rays 1 and 2 must bend opposite ways.', 'Make ray 1 a mountain and ray 4 a valley.'],
    parent: {notice: 'Whether your child counts letters (three of one, one of the other) and is surprised that VVVM still jams.', prompt: 'Rays 1 and 2 both fold the slim wedge. What happens if they bend the same way?', explanation: 'The counting rule leaves VVVM and MVVV. The 30° wedge lies between bigger wedges (120° and 60°). If rays 1 and 2 bend the same way, the slim wedge can’t tuck in: the fold along ray 2 ends up inside the bigger wedges, which would have to pass through it. So ray 1 is a mountain, opposite ray 2, and ray 4 is the valley: MVVV. Counting and angles together still do not settle a labelling.', extension: 'With no printed letters, how many labellings fold? (Four: MVMM, MVVV, VMMM and VMVV.)', connection: 'The big-little-big lemma: the creases round a strictly smallest angle have opposite letters.'},
    provenance: 'Week 28 Grades 4–5 Problem 1, pattern D (30°, 60°, 150°, 120°); the printed valleys on rays 2 and 3 are new, chosen so that letters that pass the counting rule (VVVM) still jam.'},
  {number: 6, level: 'medium', title: 'Six more tabs', mode: 'tabs', disks: row, stock: {M: 3, V: 3}, check: {ways: 0, odd: [1, 2]},
    idea: 'A parity certificate: the M tabs a set of disks can use come in fixed odd and even amounts, and the stock can miss them all.',
    hints: ['Put the tabs on and press Fold. Can you make every disk fold?', 'A right-angle disk folds with one or three mountains. How many M tabs can each disk take?', 'Disks B and C need one M tab each, and disk A takes none or two: 2 or 4 M tabs, never 3.'],
    parent: {notice: 'Whether your child keeps moving tabs, and when they start counting what each disk can take instead.', prompt: 'How many M tabs can disk A take? And disk B?', explanation: 'Each disk folds with one or three mountains. Disk A (M ? V ?) takes 0 or 2 M tabs, and disks B and C take exactly 1 each, so the three disks use 2 or 4 M tabs, never 3. The certificate is disks B and C: the two disks that need exactly one M tab and one V tab. In parity terms: three folded disks have an odd number of mountains, but the printed three plus three tabs make six.', extension: 'Which stocks of six tabs work? (2 or 4 M tabs.)', connection: 'A parity invariant from Maekawa’s theorem; the worksheet’s concrete proof sets the two choices for disk A beside the forced one-M disks.'},
    provenance: 'Week 28 K–1 Problem 4, row B: the same disks with 3 M and 3 V tabs, which can’t be done (guide p. 8, “Why row B cannot work”).'},
  {number: 7, level: 'medium', title: 'Where does it go?', mode: 'ray', rays: [0, 60, 150], fixed: labels('???'), check: {places: [270], words: 4},
    idea: 'The new ray is placed by the half-turn rule, not by symmetry: no ray here is a mirror of another.',
    hints: ['Put the new ray somewhere, label every ray, and press Fold. How far apart do the ends land?', 'The wedges after rays 1 and 3 must make 180° together, and so must the other two. The wedge after ray 1 is 60°.', 'The wedge after ray 3 must be 120°: put the new ray 8 ticks after ray 3.'],
    parent: {notice: 'Whether your child places the ray opposite one of the others (a guess from puzzle 1) and uses the gap to correct it.', prompt: 'Which wedges point the same way when it is folded?', explanation: 'The wedges are 60°, 90°, then two wedges sharing the last 210°. The wedges after rays 1 and 3 must add to 180°, so the wedge after ray 3 is 120° and the new ray is at 270° (the last wedge is then 90°, and 90 + 90 = 180 too). Then 4 of the 16 labellings fold: the counting rule, with the creases round the 60° wedge bending opposite ways.', extension: 'Can you add a ray to rays at 0°, 60° and 150° so that it folds with a different ray? (No: the half-turn rule fixes the place.)', connection: 'Kawasaki’s theorem fixes the last angle: with all but one ray placed, at most one position closes.'},
    provenance: 'New, in the form of Week 28 Grades 2–3 Problem 4 (add one ray so the alternating groups make half-turns), with rays at 0°, 60° and 150° so that the answer is not a mirror image.'},
  {number: 8, level: 'medium', title: 'Forty-five', mode: 'fold', angles: [45, 90, 90, 135], fixed: labels('????'), check: {words: [], cant: 'gap'},
    idea: 'Every other wedge must make a half-turn; when the alternate wedges add to 135° and 225°, no letters can close the disk.',
    hints: ['Label every ray and press Fold. Look at where the ends of the strip land.', 'Folded flat, every other wedge points the same way, and each set has to make a half-turn, 180°.', 'The wedges after rays 1 and 3 make 45 + 90 = 135°, and the other two make 90 + 135 = 225°.'],
    parent: {notice: 'Whether your child keeps relabelling, or notices that the gap at the seam is the same size whatever the letters.', prompt: 'The gap is the same every time. What could change it?', explanation: 'Folding flat turns the paper over at every crease, so the wedges lie alternately one way and back. Going round, the rim travels 45° forward, 90° back, 90° forward and 135° back: it ends 90° from where it started, whatever the letters, so the seam can’t close. The certificate is the two fans: the wedges after rays 1 and 3 make 135°, the other two 225°, and each would have to be a half-turn.', extension: 'Move one ray so that it folds. (Move ray 4 three ticks on, from 225° to 270°: then 45 + 135 and 90 + 90 both make 180°.)', connection: 'Kawasaki’s condition is necessary: the alternating sums must both be 180°.'},
    provenance: 'Week 28 Grades 4–5 Problem 1, pattern B (45°, 90°, 90°, 135°), and Problem 3, pattern A: “Explain why every other sector must total 180°.”'},
  {number: 9, level: 'hard', title: 'Six creases', mode: 'fold', angles: [30, 30, 60, 60, 90, 90], fixed: labels('V?V?V?'), check: {words: ['VMVMVV']},
    idea: 'Small wedges fold away in pairs, and what is left must fold too: the rules apply again to the smaller disk.',
    hints: ['Label rays 2, 4 and 6 and press Fold. Where does it jam?', 'Six creases fold with four of one letter and two of the other. Round the two 30° wedges, rays 1, 2 and 3 can’t all bend the same way.', 'Make ray 2 a mountain, ray 4 a mountain and ray 6 a valley.'],
    parent: {notice: 'Whether your child works from the small wedges outwards, and what they make of a jam that moves when a far ray changes.', prompt: 'Which ray must differ from rays 1 and 3?', explanation: 'Six creases fold with four of one letter and two of the other (Maekawa), so with three valleys printed one more of rays 2, 4, 6 is a valley. Round the run of two 30° wedges, rays 1, 2 and 3 can’t all be valleys, so ray 2 is a mountain; one of rays 4 and 6 is the other. Folding the 30° pair away (a crimp) leaves wedges 60°, 60° between two 90° wedges with rays 3, 4 and 5, which again can’t all bend the same way: ray 4 is the mountain and ray 6 a valley, VMVMVV.', extension: 'With no printed letters, how many labellings fold? (18 of 64.)', connection: 'Crimp reduction (Hull): fold away a smallest wedge or run of equal wedges, then check the smaller vertex. It decides every single-vertex labelling.'},
    provenance: 'Week 28 Grades 4–5 Problem 3, pattern B and Problem 6 (30°, 30°, 60°, 60°, 90°, 90°); the printed valleys on rays 1, 3 and 5 are new, so that random letters fold one time in eight.'},
  {number: 10, level: 'hard', title: 'Thirty, thirty, thirty', mode: 'fold', angles: [30, 30, 30, 60, 90, 120], fixed: labels('??????'), check: {words: [], cant: 'gap'},
    idea: 'With six wedges the half-turn rule still decides: alternate wedges adding to 150° and 210° can’t close.',
    hints: ['Label every ray and press Fold. Look at the seam.', 'Folded flat, every other wedge points the same way, and each set of three has to make a half-turn, 180°.', 'The wedges after rays 1, 3 and 5 make 30 + 30 + 90 = 150°, and the others 30 + 60 + 120 = 210°.'],
    parent: {notice: 'Whether your child uses the colouring from the four-ray disks, or starts again with letters.', prompt: 'Which wedges point the same way when it is folded?', explanation: 'Folded flat, the wedges alternate forward and back: 30 − 30 + 30 − 60 + 90 − 120 = −60, so the rim ends 60° short of closing whatever the letters. The certificate is the two fans: the wedges after rays 1, 3 and 5 make 150° and the others 210°, not two half-turns.', extension: 'Reorder the same six angles so that the disk folds. (Puzzle 9’s order works; the worksheet counts 12 orders starting with 30°.)', connection: 'Kawasaki’s condition for six creases.'},
    provenance: 'Week 28 Grades 4–5 Problem 3, pattern C (30°, 30°, 30°, 60°, 90°, 120°).'},
  {number: 11, level: 'hard', title: 'Four disks', mode: 'tabs', disks: ['MM??', 'V?V?', 'M?V?', '?M?V'].map(w => ({angles: RIGHT, fixed: labels(w)})), stock: {M: 4, V: 4}, check: {ways: 8},
    idea: 'Disks that need exactly one M tab are settled first; the disks that take none or two then share what is left.',
    hints: ['Put the tabs on and press Fold. Which disks fold?', 'Disks A and B need one M tab each. Disks C and D each take none or two.', 'One of disks C and D takes two M tabs and the other takes two V tabs.'],
    parent: {notice: 'Whether your child sorts the disks by what they can take before placing tabs, or places tabs and repairs.', prompt: 'How many M tabs are left once disks A and B have theirs?', explanation: 'Every right-angle disk folds with one or three mountains. Disks A (M M ? ?) and B (V ? V ?) take exactly one M tab each. Disks C (M ? V ?) and D (? M ? V) take none or two. With four M tabs, one of C and D takes two and the other none: 2 choices, times 2 ways for each of A and B, gives 8 ways.', extension: 'Which stocks of eight tabs work? (2, 4 or 6 M tabs.)', connection: 'The same parity bookkeeping as puzzle 6, with a real choice between disks.'},
    provenance: 'New: Week 28 K–1 Problem 4 extended to four disks and eight tabs.'},
  {number: 12, level: 'hard', title: 'The last crease', mode: 'ray', rays: [0, 30, 90, 150, 240], fixed: labels('?????'), check: {places: [330], words: 18},
    idea: 'With five rays given, the sixth is placed by the half-turn rule for three alternate wedges.',
    hints: ['Put the new ray somewhere, label every ray, and press Fold. How far apart do the ends land?', 'The wedges after rays 1, 3 and 5 must make 180° together. The first two are 30° and 60°.', 'The wedge after ray 5 must be 90°: put the new ray 6 ticks after ray 5.'],
    parent: {notice: 'Whether your child adds up alternate wedges before placing the ray, or moves it and watches the gap shrink.', prompt: 'How big must the wedge after ray 5 be?', explanation: 'The wedges are 30°, 60°, 60°, 90°, then two wedges sharing the last 120°. The wedges after rays 1, 3 and 5 must make 180°, so the wedge after ray 5 is 90° and the new ray is at 330° (the last wedge is 30°, and 60 + 90 + 30 = 180 too). Then 18 of the 64 labellings fold.', extension: 'Move ray 5 to 210°. Where does the new ray go now? (At 300°.)', connection: 'Kawasaki’s theorem for six creases fixes the last angle.'},
    provenance: 'New, in the form of Week 28 Grades 2–3 Problem 4, with six creases as in Grades 4–5 Problem 6.'}
];

const PLAYGROUND = {
  idea: 'Free play with creases: add, label and remove rays and fold, to test guesses about which disks fold.',
  hints: ['Make four right angles and find every labelling that folds.', 'Try five rays. Can any letters fold it?', 'Move one ray of a folding disk by a tick. What happens at the seam?'],
  parent: {notice: 'Whether your child predicts the fold before pressing Fold, and which guesses they test.', prompt: 'What do the disks that fold have in common?', explanation: 'A single vertex folds flat exactly when it has an even number of creases, its alternate angles each add to 180° (Kawasaki), and the letters pass a check that the app makes by searching every order of the layers. Two more of one letter than of the other (Maekawa: |M − V| = 2) is necessary, and big-little-big and crimp reduction finish the job.', extension: 'Make a disk with eight rays that folds, then change one letter so that it jams.', connection: 'Single-vertex flat foldability: Kawasaki–Justin, Maekawa–Justin and Hull’s crimp reduction.'},
  provenance: 'Week 28 shared launch (crease a disk, label it from the marked front, and fold it) and Grades 2–3 Problem 3.'
};

const id = n => `creases-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  let q, solution;
  if (item.mode === 'fold') {
    q = {mode: 'fold', angles: item.angles, fixed: item.fixed};
    assert.equal(q.angles.reduce((a, b) => a + b, 0), 360, `${id(item.number)}: a whole disk`);
    const words = completions(q.angles, q.fixed);
    assert.deepEqual(words, item.check.words, `${id(item.number)}: completions`);
    if (words.length) solution = {words};
    else {
      const img = image(q.angles);
      assert.equal(img.odd ? 'odd' : 'gap', item.check.cant, `${id(item.number)}: why it can't`);
      // The colouring certificate covers only these two reasons.
      assert.ok(img.odd || !img.closes, `${id(item.number)}: a can't must be an odd count or a gap`);
      solution = img.odd ? {cant: 'odd', rays: q.angles.length} : {cant: 'gap', sums: alternating(q.angles)};
    }
  } else if (item.mode === 'tabs') {
    q = {mode: 'tabs', disks: item.disks, stock: item.stock};
    const blanks = q.disks.reduce((s, d) => s + d.fixed.filter(f => !f).length, 0);
    assert.equal(blanks, q.stock.M + q.stock.V, `${id(item.number)}: one tab for each open ray`);
    const ways = shares(q.disks, q.stock);
    assert.equal(ways.length, item.check.ways, `${id(item.number)}: ways`);
    if (ways.length) solution = {ways: ways.map(ws => ws.join('/'))};
    else {
      assert.deepEqual(oddDisks(q.disks, q.stock), item.check.odd, `${id(item.number)}: the certificate disks`);
      solution = {cant: 'tabs', disks: item.check.odd, takes: q.disks.map(needs)};
    }
  } else {
    q = {mode: 'ray', rays: item.rays, fixed: item.fixed};
    assert.deepEqual(goodPlaces(q), item.check.places, `${id(item.number)}: where the ray goes`);
    const angles = rayAngles2(q, item.check.places[0]);
    assert.equal(validWords(angles).length, item.check.words, `${id(item.number)}: labellings that fold`);
    solution = {at: item.check.places[0], angles, words: validWords(angles).length};
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Flat folds', mechanic: 'creases', band: 'all', revision: 1, sourceDocument: 'docs/creases/README.md',
    parameters: q,
    objective: OBJECTIVE[item.mode], visibleObjective: VISIBLE[item.mode], instruction: OBJECTIVE[item.mode],
    controls: CONTROLS[item.mode],
    rules: [...RULES.common, RULES[item.mode]],
    idea: item.idea, prerequisites: PREREQUISITES[item.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
const playground = {
  id: 'creases-playground', number: 0, title: 'Flat folds playground', difficulty_level: 'playground', familyTitle: 'Flat folds', mechanic: 'creases', band: 'playground', revision: 1, sourceDocument: 'docs/creases/README.md',
  parameters: {mode: 'playground'},
  objective: OBJECTIVE.playground, visibleObjective: VISIBLE.playground, instruction: OBJECTIVE.playground,
  controls: CONTROLS.playground,
  rules: [RULES.common[0], RULES.common[1], RULES.playground],
  idea: PLAYGROUND.idea, prerequisites: PREREQUISITES.playground, hints: PLAYGROUND.hints,
  parent: {...PLAYGROUND.parent, sourceIds: sources}, solution: null, provenance: PLAYGROUND.provenance
};

const json = {
  title: 'Flat folds',
  version: 1,
  families: [{id: 'creases', title: 'Flat folds', mathematics: 'A paper disk creased along rays from its centre folds flat only if every crease turns the paper over, so neighbouring wedges face opposite ways: the number of creases is even, and the alternate wedges each add to a half-turn, 180° (Kawasaki; with free letters this is also enough). The letters must then pass more checks: three of one letter and one of the other on four creases, |M − V| = 2 in general (Maekawa); the two creases round a strictly smallest wedge differ (big-little-big); and folding away a smallest wedge leaves a smaller vertex that must fold too (crimp reduction, which decides every labelling). Four right angles fold in exactly the 8 labellings with an odd number of mountains, so tab stocks can fail by parity.', rules: RULES.common, sourceIds: sources}],
  sources: [
    {id: 'creases-week28', title: 'Bellingham Math Circle — Week 28: Single-vertex flat folding (student packets K–1, 2–3 and 4–5, and the adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-28', kind: 'local curriculum'},
    {id: 'creases-card28', title: 'Week 28 review card, its second run, math check and foldcheck.py (App fit and Decision: labels round fixed ones, shared tabs, the missing ray, and three certificates)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-28.md', kind: 'local curriculum'},
    {id: 'creases-hull', title: 'Thomas C. Hull — The Combinatorics of Flat Folds: a Survey, in Origami³ (A K Peters, 2002): Kawasaki, Maekawa, big-little-big and crimps', url: 'https://arxiv.org/abs/1307.1065', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/creases/creases.json', import.meta.url), `${JSON.stringify(json, null, 2)}\n`);
console.log(`Wrote ${out.length} puzzles and a playground to dist/families/creases/creases.json`);
