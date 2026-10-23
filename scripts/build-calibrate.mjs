// Authoring list for Hidden machines (worksheet Week 94, calibration lab), a group
// in Ruler strips. Computes every answer with the mechanic's helpers (the
// machines that fit, the fewest requests that always find a machine and the
// requests that do it, pairs of hidden lengths, repairs, the steepest and
// shallowest stretch), checks them against the table in
// docs/calibrate/README.md, and writes dist/families/calibrate/calibrate.json.
// Run: node scripts/build-calibrate.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {machinesOf, needed, requestsOf, lengthOf, buildAnswers, everyAnswers, repairAnswers, stretchExtremes, answersOf, fmt} from '../dist/families/calibrate/calibrate.js';

const sources = ['calibrate-week94', 'calibrate-card94', 'calibrate-nist'];
const KIT = {A: 2, B: 3, C: 4, D: 6};
const SLIPPERY = 'The machine is slippery: until you name it, it may be any machine that fits every report so far, and it answers each request to keep you guessing. Name it when only one machine fits.';
const DIAL_ROWS = 'Each row is a request and its report, a pine mark. Under it the dials build their own answer: copies of the strip, then the extra. A tick means it meets the report.';
const RULES = {
  extraFind: ['The machine adds the same extra, 1 to 6 units, to any strip: with extra 3, a strip 4 long reports 7.', 'Send a strip from the kit to the machine; the empty rows are the requests you have.', DIAL_ROWS, SLIPPERY],
  copyFind: ['The machine makes 1, 2 or 3 copies of a strip end to end, then adds an extra of 0 to 6 units: copies 2 and extra 3 turn a strip 4 long into 4 + 4 + 3 = 11.', 'Put strips in the tray end to end, then Send; the empty rows are the requests you have.', DIAL_ROWS, SLIPPERY],
  every: ['The machine makes 1, 2 or 3 copies of a strip end to end, then adds an extra of 0 to 6 units.', 'The row is a strip 2 long and its report. Under it the dials build their own answer; a tick means it meets the report.', 'Every machine that fits goes on the shelf. That’s all says whether one is missing.'],
  build: ['One machine adds the same extra to every strip. Each row lays a strip and the extra end to end; it fits when it ends on its report, the pine mark.'],
  buildEvery: ['Every pair of lengths that fits goes on the shelf. That’s all says whether one is missing.'],
  repairExtra: ['One machine, adding the same extra of 1 to 6 units, made all three reports, but one of them may be wrong. Each row shows a length and the extra up to its report.', 'Change one report at a time. Every repair that makes the three fit one machine goes on the shelf. That’s all says whether one is missing.'],
  repairLine: ['A stretch-and-shift machine multiplies every length by the same number and adds the same amount, so its reports lie on one line going up. One of these three reports may be wrong.', 'Change one report at a time, by halves. Every repair that puts the three points on one line going up goes on the shelf. That’s all says whether one is missing.'],
  stretch: ['A stretch-and-shift machine’s reports lie on a line. Each display can be up to 1 above or below its true report, so the true report is somewhere in its bar.', 'Move each true report inside its bar, by halves. The line through them shows the stretch: how much the report grows for each unit of length.', 'Pin the steepest and the shallowest line. The two pins are checked together.']
};
const CONTROLS = {
  find: 'Tap kit strips to put them in the tray (tap again to take one out), then press Send. Tap the dial numbers to set the machine. Once every row has a tick, press That’s the machine to name it; after a lost round, Again starts a new one.',
  every: 'Tap the dial numbers. A machine that fits goes on the shelf. Press That’s all when you have every one. Undo takes back the last move.',
  build: 'Tap a number in each row of numbers to set that length or the extra. Undo takes back the last move.',
  repair: 'Tap a report to change it, then press − or +. Press That’s all when you have every repair. Undo takes back the last move.',
  stretch: 'Press ▲ or ▼ to move a true report inside its bar, then Pin. Pin the steepest line and the shallowest. Undo takes back the last move.'
};
const PREREQ = {
  extra: 'Count units on a ruler and subtract within 12. A grown-up can read the goal line and How to play.',
  towers: 'Count to 6 and compare lengths. No reading; a grown-up can read How to play.',
  pairs: 'Add and subtract within 12. A grown-up can read How to play.',
  copies: 'Multiply by 2 and 3 and add within 30, and plan which request to send. Reading: one goal sentence and the dial names.',
  repair: 'Subtract within 12 and compare three differences. Reading: one goal sentence.',
  line: 'Read points on a grid and see when three lie on a straight line; halves. Reading: one goal sentence.',
  stretch: 'Read a grid, halves, and compare how steep two lines are. Reading: one goal sentence.'
};
const P = (name, report, length) => length === undefined ? {name, report} : {name, report, length};

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Find the extra', rules: 'extraFind', prereq: 'extra',
    parameters: {mode: 'find', kit: KIT, tray: 1, copies: [1], extras: [1, 6], budget: 1, ruler: 12},
    check: q => { assert.equal(machinesOf(q).length, 6); assert.equal(needed(q, machinesOf(q), 1), 1); assert.ok(requestsOf(q).every(r => new Set(machinesOf(q).map(([c, e]) => c * lengthOf(q, r) + e)).size === 6), 'any one strip tells every extra apart'); },
    objective: 'Send one strip from the kit to the machine, then set the extra and press That’s the machine.', visible: 'Find the machine’s extra.',
    idea: 'A strip whose length you know shows the extra: the report less the length.',
    hints: ['Send any strip. Then compare its report with its length.', 'The extra is how far the report goes past the strip.', 'Send A, which is 2 long. Its report less 2 is the extra.'],
    parent: {notice: 'Whether your child names a machine before sending anything, and what they make of the two machines shown when that loses.', prompt: 'Which strip would you send, and does it matter?', explanation: 'The machine reports a strip’s length plus its extra. Any known strip shows the extra: a strip 3 long that reports 7 has extra 4. Every strip in the kit works, so one request is always enough; naming with none loses, since six extras still fit.', extension: 'Could two strips you don’t know the lengths of tell you the extra? (No: see puzzle 3.)', connection: 'An instrument with an unknown offset is calibrated by one known standard: the offset is the reading less the true value.'},
    provenance: 'Week 94 Grades 2–3 Problem 1 (play the extra-number machine), with the kit’s strips A–D as the known strips and the app as a slippery keeper.'},
  {number: 2, level: 'easy', title: 'Towers in, towers out', rules: 'build', every: true, prereq: 'towers',
    parameters: {mode: 'build', every: true, rows: [P('P', 4), P('Q', 6)], extras: [1, 3], longest: 6, ruler: 8},
    check: q => assert.deepEqual(buildAnswers(q).map(x => `${x.P},${x.Q}+${x.e}`), ['3,5+1', '2,4+2', '1,3+3']),
    objective: 'P and Q went into one machine that adds 1, 2 or 3 and came out as 4 and 6. Find every pair of lengths they could have been, then press That’s all.', visible: 'Find every pair P and Q could be.',
    idea: 'Whatever the extra, Q is 2 longer than P.',
    hints: ['Choose an extra, then make P and Q end on their marks.', 'A bigger extra leaves room for shorter strips.', 'With extra 1, P is 3 and Q is 5.'],
    parent: {notice: 'Whether your child changes the extra on purpose and sees that P and Q move together.', prompt: 'Could P be longer than Q?', explanation: 'P and Q get the same extra, so Q is always 2 longer than P: 3 and 5 (extra 1), 2 and 4 (extra 2), 1 and 3 (extra 3). The reports alone can’t say which.', extension: 'What one more thing would tell you which pair it was? (The report of a tower you know.)', connection: 'Readings with a shared offset fix differences, never the values themselves: (x + t, e − t) reads the same.'},
    provenance: 'Week 94 K–1 Problem 5 (towers that come out as 4 and 6 with extras 1–3), on strips instead of cube towers.'},
  {number: 3, level: 'easy', title: 'Every pair', rules: 'build', every: true, prereq: 'pairs',
    parameters: {mode: 'build', every: true, rows: [P('P', 7), P('Q', 10)], extras: [1, 6], longest: 9, ruler: 12},
    check: q => assert.equal(buildAnswers(q).length, 6),
    objective: 'Hidden strips P and Q went into one machine that adds an extra of 1 to 6 and reported 7 and 10. Find every pair of lengths they could have, then press That’s all.', visible: 'Find every pair P and Q could be.',
    idea: 'Two reports from one machine fix how much longer Q is than P, but not the lengths.',
    hints: ['Choose an extra, then make P and Q end on their marks.', 'Try every extra in order.', 'Q is always 3 longer than P.'],
    parent: {notice: 'Whether your child works through the extras in order, and when they notice Q − P never changes.', prompt: 'What can you know about P and Q without learning the extra?', explanation: 'Each extra from 1 to 6 gives one pair: (6, 9), (5, 8), (4, 7), (3, 6), (2, 5), (1, 4). In every one Q is 3 longer than P, because the shared extra cancels: (Q + e) − (P + e) = Q − P = 10 − 7.', extension: 'Puzzle 4 adds a known strip. How many pairs then?', connection: 'This is Week 51’s cancellation: the same piece in two joins drops out of their difference.'},
    provenance: 'Week 94 Grades 2–3 Problems 2 and 3 (every pair of hidden lengths for reports 7 and 10; what can you know without the extra?).'},
  {number: 4, level: 'medium', title: 'A known strip', rules: 'build', prereq: 'pairs',
    parameters: {mode: 'build', every: false, rows: [P('K', 8, 4), P('P', 9), P('Q', 12)], extras: [1, 6], longest: 11, ruler: 14},
    check: q => assert.deepEqual(buildAnswers(q), [{P: 5, Q: 8, e: 4}]),
    objective: 'K is 4 long and reports 8. Make the extra, P and Q fit every report.', visible: 'Make every row end on its report.',
    idea: 'The known strip fixes the extra, and then the hidden lengths.',
    hints: ['Start with the row whose strip you know.', 'K is 4 long and reports 8. What is the extra?', 'The extra is 4, so P is 5 and Q is 8.'],
    parent: {notice: 'Whether your child starts with K or tries the extra and lengths at random.', prompt: 'How many answers did puzzle 3 have, and why only one now?', explanation: 'K is 4 long and reports 8, so the extra is 4. Then P reports 9, so P is 5, and Q reports 12, so Q is 8. One known strip turns six possible worlds into one.', extension: 'If K were 6 long, still reporting 8, what would P and Q be? (7 and 10.)', connection: 'A calibration standard identifies the offset, and then every other reading.'},
    provenance: 'Week 94 Grades 2–3 Problem 4, its first row (a known strip 4 long reports 8; hidden strips report 9 and 12).'},
  {number: 5, level: 'medium', title: 'One wrong report', rules: 'repairExtra', prereq: 'repair',
    parameters: {mode: 'repair', machine: 'extra', rows: [[2, 5], [4, 7], [6, 10]], extras: [1, 6], lo: 0, hi: 12, step: 1, ruler: 12},
    check: q => assert.deepEqual(repairAnswers(q), [[2, 9]]),
    objective: 'Change one report so that one machine, adding one extra, made all three. Find every way, then press That’s all.', visible: 'Find every way to change one report so one machine fits all three.',
    idea: 'Two reports that agree on the extra outvote the third: there is one repair.',
    hints: ['Compare the three extras: how far each report goes past its strip.', 'Two of the extras agree.', 'The report for 6 should be 9.'],
    parent: {notice: 'Whether your child looks for more repairs after finding one, and how they decide there are none.', prompt: 'Why can’t you repair it by changing the report for 2?', explanation: 'The extras are 3, 3 and 4. Changing the report for 2 or for 4 leaves a 3 and a 4 among the other two, so no one extra fits. Only changing 10 to 9 works. With an extra-only machine and one wrong report out of three, the two right reports always agree, so there is always exactly one repair.', extension: 'Make a list of three with one wrong report for a partner to repair.', connection: 'Redundant measurements against one offset detect and correct a single error, as a majority vote does.'},
    provenance: 'Week 94 Grades 2–3 Problems 6 and 7 (which boxes could be right; repair each by changing one report; such puzzles always have one repair), box I.'},
  {number: 6, level: 'medium', title: 'Copies and extra', rules: 'copyFind', prereq: 'copies',
    parameters: {mode: 'find', kit: KIT, tray: 1, copies: [1, 2, 3], extras: [0, 6], budget: 2, ruler: 24},
    check: q => { assert.equal(machinesOf(q).length, 21); assert.equal(needed(q, machinesOf(q), 1), Infinity, 'one single strip is never enough'); assert.equal(needed(q, machinesOf(q), 2), 2); },
    objective: 'Send two requests, then set the copies and the extra and press That’s the machine.', visible: 'Find the copies and the extra with two requests.',
    idea: 'Two different known lengths tell every machine apart.',
    hints: ['Send a strip, then set the dials so the row gets a tick. Do other dials fit too?', 'A second strip of another length tells apart the machines that fit the first.', 'Send A, then B.'],
    parent: {notice: 'Whether your child sends the same strip twice, and what the machines shown after a lost round teach them.', prompt: 'Why does a second, different strip always settle it?', explanation: 'Two machines that give the same report for a strip L differ in copies; for a second length M, their reports differ by (difference in copies) × (M − L), which is not 0. So two different strips always leave one machine. With the kit’s single strips, one request never does: each strip is shorter than 7, so some report is shared, such as 6 → 12 from copies 1 and extra 6 or copies 2 and extra 0.', extension: 'Puzzle 8 allows only one request. What would you send?', connection: 'Two reference standards determine a two-parameter calibration line.'},
    provenance: 'Week 94 Grades 4–5 Problem 1 (the copy-and-add machine: 21 machines; how few requests can you manage?), with the kit A, B, C, D as 2, 3, 4 and 6.'},
  {number: 7, level: 'medium', title: 'Two units report six', rules: 'every', prereq: 'copies',
    parameters: {mode: 'every', copies: [1, 2, 3], extras: [0, 6], given: [[2, 6]], ruler: 12},
    check: q => assert.deepEqual(everyAnswers(q), [[1, 4], [2, 2], [3, 0]]),
    objective: 'A strip 2 long reports 6. Set the dials for every machine that could do it, then press That’s all.', visible: 'Find every machine that turns 2 into 6.',
    idea: 'One report leaves one machine for each number of copies that fits.',
    hints: ['Set the copies first, then find the extra that makes the row meet 6.', 'Each number of copies gives at most one extra.', 'Copies 1 needs extra 4.'],
    parent: {notice: 'Whether your child goes through the copies in order.', prompt: 'Which second strip would tell these three machines apart?', explanation: 'Copies 1 needs extra 4, copies 2 extra 2, copies 3 extra 0: three machines. Any second strip of another length separates them (L + 4, 2L + 2 and 3L agree only at L = 2), so one more request finishes the job.', extension: 'Could one first request ever settle it? (With a partner, yes by luck: 6 → 24 fits only copies 3 and extra 6. Against the app’s slippery machine, only a strip 7 or longer.)', connection: 'One reference point leaves a one-parameter family of calibration lines through it.'},
    provenance: 'Week 94 Grades 4–5 Problem 2 (a 2-unit strip reports 6: find every machine; choose a second strip that separates them).'},
  {number: 8, level: 'hard', title: 'One request', rules: 'copyFind', prereq: 'copies',
    parameters: {mode: 'find', kit: KIT, tray: 2, copies: [1, 2, 3], extras: [0, 6], budget: 1, ruler: 36},
    check: q => {
      assert.equal(needed(q, machinesOf(q), 1), 1);
      const winners = requestsOf(q).filter(r => new Set(machinesOf(q).map(([c, e]) => c * lengthOf(q, r) + e)).size === 21).map(r => r.join('+'));
      assert.deepEqual(winners, ['B+C', 'A+D', 'B+D', 'C+D'], 'only joins 7 or longer');
      assert.ok(Object.values(KIT).every(L => L < 7));
    },
    objective: 'Send one request, then set the copies and the extra and press That’s the machine.', visible: 'Find the copies and the extra with one request.',
    idea: 'With an extra below 7, a strip 7 or longer keeps the copies from overlapping: build one by joining strips.',
    hints: ['Which reports can copies 1 give for your strip, and which can copies 2 give? Can they overlap?', 'A strip 7 long reports 7 to 13 with one copy, 14 to 20 with two, 21 to 27 with three.', 'Put B and C in the tray.'],
    parent: {notice: 'Whether your child tries single strips first, and whether the lost rounds’ two machines lead them to join strips.', prompt: 'Why does a strip 7 long always work, and 6 not?', explanation: 'For a strip L long, copies c give reports from cL to cL + 6. These ranges overlap when 6 ≥ L, so some report fits two machines (for L = 6, copies 1 extra 6 and copies 2 extra 0 both give 12). When L ≥ 7 they don’t overlap, and the extra is the report less cL. The kit’s longest strip is 6, so the request must join strips: B and C (7), A and D (8), B and D (9) or C and D (10).', extension: 'What is the shortest strip that works if the extra can be 0 to 9? (10.)', connection: 'Choosing a reference so that every possible instrument gives a different reading: an experiment designed to identify the model.'},
    provenance: 'Week 94 Grades 4–5 Problem 1 and its guide note: with the kit, B and C end to end make 7, and that one request identifies every rule.'},
  {number: 9, level: 'hard', title: 'Repair a line', rules: 'repairLine', prereq: 'line',
    parameters: {mode: 'repair', machine: 'line', rows: [[2, 7], [4, 11], [6, 16]], lo: 0, hi: 24, step: 0.5, xmax: 8, ymax: 24},
    check: q => assert.deepEqual(repairAnswers(q), [[0, 6], [1, 11.5], [2, 15]]),
    objective: 'Change one report so the three points lie on one line going up. Find every way, then press That’s all.', visible: 'Find every way to change one report so the three points line up.',
    idea: 'Any two points make a line, so each point can be the wrong one.',
    hints: ['Pick a point and move it until all three line up.', 'After one repair, try moving a different point.', 'There is a repair for each point: 6, 11½ and 15.'],
    parent: {notice: 'Whether your child stops after one repair, as in puzzle 5, or keeps looking.', prompt: 'Why does this machine have more repairs than puzzle 5’s?', explanation: 'Any two of the points fix a line going up, and the third can be moved onto it: the line through (4, 11) and (6, 16) gives 6 for length 2; through (2, 7) and (6, 16), 11½ for length 4 (halfway between 7 and 16); through (2, 7) and (4, 11), 15 for length 6. An extra-only machine has only one free number, so two reports already overrule the third.', extension: 'Is there a list of three reports with no repair at all? (Not for a line that may go up any amount: there is always one per point, unless a line would go down.)', connection: 'With a two-parameter model, three readings can detect an error but not say which reading is wrong.'},
    provenance: 'Week 94 Grades 4–5 Problem 4 (repair three reports: 2 → 7, 4 → 11, 6 → 16; three single-report repairs).'},
  {number: 10, level: 'hard', title: 'Close references', rules: 'stretch', prereq: 'stretch',
    parameters: {mode: 'stretch', refs: [[2, 8], [4, 12]], err: 1, step: 0.5, xmax: 12, ymax: 26},
    check: q => assert.deepEqual(stretchExtremes(q), {lo: 1, hi: 3}),
    objective: 'Each true report is within 1 of its display. Pin the steepest and the shallowest line through the two bars.', visible: 'Pin the steepest and the shallowest line.',
    idea: 'The steepest line goes from the bottom of the left bar to the top of the right one.',
    hints: ['Move one true report to an end of its bar and watch the line tilt.', 'Low on the left and high on the right makes the steepest line.', 'Pin 7 and 13, then 9 and 11.'],
    parent: {notice: 'Whether your child moves both reports to opposite ends of their bars.', prompt: 'How much could the stretch be off by?', explanation: 'The true reports lie in 7 to 9 and 11 to 13. The stretch is the rise over the 2 units between the references: from (11 − 9) ÷ 2 = 1 to (13 − 7) ÷ 2 = 3. The shown reports alone suggest 2, but anything from 1 to 3 fits.', extension: 'Puzzle 11 uses references 2 and 10 with the same errors. Guess its range first.', connection: 'With errors at most e, two references D apart leave the slope in an interval 4e/D wide.'},
    provenance: 'Week 94 Grades 4–5 Problem 6, reference pair A (2 → 8, 4 → 12, displays off by up to 1).'},
  {number: 11, level: 'hard', title: 'Far references', rules: 'stretch', prereq: 'stretch',
    parameters: {mode: 'stretch', refs: [[2, 8], [10, 24]], err: 1, step: 0.5, xmax: 12, ymax: 26},
    check: q => assert.deepEqual(stretchExtremes(q), {lo: 7 / 4, hi: 9 / 4}),
    objective: 'Each true report is within 1 of its display. Pin the steepest and the shallowest line through the two bars.', visible: 'Pin the steepest and the shallowest line.',
    idea: 'References far apart pin the stretch down: the same errors tilt the line less.',
    hints: ['Use the bars’ opposite ends, as in puzzle 10.', 'Low on the left and high on the right makes the steepest line.', 'Pin 7 and 25, then 9 and 23.'],
    parent: {notice: 'Whether your child compares the spread of lines with puzzle 10’s.', prompt: 'Which pair of references would you choose from lengths 1 to 10?', explanation: 'The stretch runs from (23 − 9) ÷ 8 = 1¾ to (25 − 7) ÷ 8 = 2¼, a range ½ wide against puzzle 10’s 2. Each display can be off by 1 either way, so the steepest and the shallowest line differ in rise by 4; dividing by the distance between the references, 8 here and 2 there, gives the range: 4/8 against 4/2. So references 1 and 10 are best, and one reference measured again and again never pins the stretch at all.', extension: 'Why can’t repeating one reference help? (A line through one point can have any stretch.)', connection: 'Worst-case design of a calibration: spread the standards across the working range.'},
    provenance: 'Week 94 Grades 4–5 Problems 6 (reference pair B, 2 → 8 and 10 → 24) and 7 (choose the best references).'}
];

const solutionOf = q => {
  if (q.mode === 'find') return {machines: machinesOf(q).length, fewest: needed(q, machinesOf(q), q.budget)};
  if (q.mode === 'stretch') return stretchExtremes(q);
  const answers = answersOf(q);
  return answers ? {answers, count: answers.length} : null;
};
const puzzles = PUZZLES.map(item => {
  const q = item.parameters;
  item.check(q);
  const modeKey = q.mode === 'repair' ? 'repair' : q.mode;
  return {
    id: `calibrate-${String(item.number).padStart(2, '0')}`, number: item.number, title: item.title, difficulty_level: item.level,
    familyTitle: 'Ruler strips', libraryFamily: 'ranges', group: 'Hidden machines', mechanic: 'calibrate', band: 'all', revision: 1, sourceDocument: 'docs/calibrate/README.md',
    parameters: q, objective: item.objective, visibleObjective: item.visible, instruction: item.objective, controls: CONTROLS[modeKey],
    rules: [...RULES[item.rules], ...(item.every ? RULES.buildEvery : [])],
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution: q.mode === 'build' && !q.every ? {answer: buildAnswers(q)[0]} : solutionOf(q), provenance: item.provenance
  };
});
assert.equal(new Set(puzzles.map(p => p.title)).size, puzzles.length);
for (const p of puzzles) assert.ok(!/\d/.test(p.title), `${p.id}: no digits in the title`);

const json = {
  title: 'Hidden machines',
  version: 1,
  families: [{id: 'calibrate', title: 'Ruler strips: Hidden machines', mathematics: 'A hidden machine reports c·L + e for a strip L long: c copies of the strip, then an extra e. With c = 1, every report shares the extra, so (x + t, e − t) read the same: two reports fix only the difference of two hidden lengths (the extra cancels, as in Week 51), and one known strip fixes the extra. With c in 1–3 and e in 0–6 there are 21 machines; two different known lengths always tell them apart, and one request does exactly when it is 7 or longer, since then the ranges cL to cL + 6 don’t overlap. Three reports from one machine can be checked and one wrong report repaired: one way for an extra-only machine, one way per point for a stretch and a shift. With displays off by at most 1, two references D apart leave the stretch in a range 4/D wide. The request puzzles play against a slippery machine that keeps every machine that fits and answers to leave the most doubt, so a round is won only by requests that always work.', rules: [RULES.copyFind[0]], sourceIds: sources}],
  sources: [
    {id: 'calibrate-week94', title: 'Bellingham Math Circle — Week 94: Calibration lab (student packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-94', kind: 'local curriculum'},
    {id: 'calibrate-card94', title: 'Week 94 review card, its second run and the math check (App fit: a hidden machine fed known strips; a slippery 21-rule machine, shared-offset pairs, repairs and noisy-band extremes)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-94.md', kind: 'review'},
    {id: 'calibrate-nist', title: 'NIST/SEMATECH e-Handbook of Statistical Methods, §2.3.6 (instrument calibration with known references) and §2.4.5 (bias)', url: 'https://www.itl.nist.gov/div898/handbook/mpc/section3/mpc361.htm', kind: 'reference'}
  ],
  puzzles
};
await writeFile(new URL('../dist/families/calibrate/calibrate.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(JSON.stringify({puzzles: puzzles.length, levels: puzzles.map(p => p.difficulty_level[0]).join(''), stretch: puzzles.filter(p => p.parameters.mode === 'stretch').map(p => `${fmt(p.solution.lo)}–${fmt(p.solution.hi)}`)}));
