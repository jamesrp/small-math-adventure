// Authoring list for Fold and stretch (worksheet Week 92, fold-and-stretch
// predictions), a group in Ruler strips. Computes every answer with the
// mechanic's helpers (meeting pairs, lowest and highest landings, starts that
// break a claim, bands meeting a width goal, the move a band first fills the
// track, the widest band from 0), checks them against the table in
// docs/tent/README.md, and writes dist/families/tent/tent.json.
// Run: node scripts/build-tent.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {UNIT, meetingPairs, landings, breakers, ratioBands, fillStarts, widestEnd, fmt, answersOf} from '../dist/families/tent/tent.js';

const u = x => Math.round(x * UNIT);
const sources = ['tent-week92', 'tent-card92', 'tent-teschl'];
const MOVE_RULE = 'One move takes a marker to twice its distance from the nearer end of the track: 13 is 3 from 16, so it moves to 6.';
const ROWS_RULE = 'The top row is the start. Each row below shows where things are after one more move.';
const BAND_RULE = 'A band is every start between its ends, not only whole numbers. Its shading in a row shows every place those starts can be after that many moves.';
const FULL_RULE = 'A band is full when its shading covers the whole track. First full on move 4 means full in row 4 and not before.';
const RULES = {
  pairs: [MOVE_RULE, ROWS_RULE, 'A pair of markers at different starts that land together goes on the shelf. That’s all says whether a pair is missing.'],
  break: [MOVE_RULE, ROWS_RULE, 'The marker can start anywhere in the gray band. The window is the claim: every start in the band lands inside it after the last move.', 'Can’t says no start lands outside. After it, pin the lowest and the highest landing; the two pins are checked together, and they decide whether Can’t is right.'],
  width: [MOVE_RULE, BAND_RULE, 'Each goal picture shows a start band over the band it lands on. Make a band that grows the same way.'],
  fill: [MOVE_RULE, ROWS_RULE, BAND_RULE, FULL_RULE],
  pieces: [MOVE_RULE, ROWS_RULE, BAND_RULE, FULL_RULE, 'Every band found goes on the shelf. That’s all says whether one is missing.'],
  widest: [MOVE_RULE, ROWS_RULE, BAND_RULE, 'The top ruler is the track from 0 to 1, drawn large. The window, 0 to 2, is the claim: every start in the band stays inside it on every row.', 'Widest says the band can’t be any wider. After it, pin the start that lands farthest; the pin decides whether Widest is right.']
};
const CONTROLS = {
  pairs: 'Drag a marker along the top row, or tap the row near it. Arrow keys move a focused marker. Undo takes back the last move.',
  break: 'Drag the marker along its gray band, or tap the band. Arrow keys move a focused marker. Press Can’t once you have tried a start, then move the marker and press Pin for the lowest landing and for the highest. Undo takes back the last move.',
  width: 'Drag an end of the band, or tap near it. Arrow keys move a focused end. Undo takes back the last move.',
  fill: 'Drag the band along the top row, or tap where it should go. Arrow keys move it half a unit. Undo takes back the last move.',
  pieces: 'Drag the band along the top row, or tap where it should go. Arrow keys move it half a unit. Undo takes back the last move.',
  widest: 'Drag the band’s right end, or tap near it. Arrow keys move it one step. Press Widest, then move the marker and press Pin for the start that lands farthest. Undo takes back the last move.'
};
const PREREQ = {
  k1: 'Count to 16 and double numbers up to 8, or count the spaces twice on the ruler. No reading; a grown-up can read the goal line and How to play.',
  claim: 'Double numbers up to 8 and find a distance from 16. A grown-up can read the goal line.',
  two: 'Double numbers up to 8, twice in a row. A grown-up can read the goal line.',
  bands: 'Read halves on a ruler and compare lengths. A grown-up can read How to play.',
  widest: 'Halve and double fractions such as 1/4 and 1/8, read from the enlarged ruler. Reading: one goal sentence.'
};
const claimWords = ([c, d]) => c === d ? `anywhere but ${fmt(c)}` : `outside ${fmt(c)} to ${fmt(d)}`;
const MOVES = ['', 'one move', 'two moves', 'three moves', 'four moves', 'five moves', 'six moves'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Pairs that meet', prereq: 'k1',
    parameters: {mode: 'pairs', step: UNIT, rows: 1, start: [u(2), u(5)]},
    check: q => assert.deepEqual(meetingPairs(q).map(([x, y]) => `${fmt(x)}&${fmt(y)}`), ['0&16', '1&15', '2&14', '3&13', '4&12', '5&11', '6&10', '7&9']),
    objective: 'Find every pair of whole-number starts that land together after one move, then press That’s all.', visible: 'Find every pair of starts that land together.',
    idea: 'Mirror starts land together: x and 16 − x are the same distance from the nearer end.',
    hints: ['Put one marker on 3. Where must the other go to land on the same place?', 'Two markers land together when they are the same distance from the nearer end.', 'Try 0 and 16, then 1 and 15. What comes next?'],
    parent: {notice: 'Whether your child moves one marker at random or starts to work along the track in order.', prompt: 'How do you know you have every pair?', explanation: 'A start x moves to twice its distance from the nearer end, so x and 16 − x always land together. Two different whole-number starts land together only this way, which gives the eight pairs 0 and 16, 1 and 15, … , 7 and 9; 8 has no partner, since 16 − 8 is 8.', extension: 'Find two starts that move farther apart on each of the first four moves. (0 and 1: their gap is 1, then 2, 4, 8 and 16.)', connection: 'The move is the tent map, T(x) = 2·min(x, 16 − x). It folds the track at 8 and stretches each half to the whole track, so it is two to one.'},
    provenance: 'Week 92 Problem 1 (“Find every pair that meets after one move”), with the markers as the worksheet’s whole-number starts.'},
  {number: 2, level: 'easy', title: 'Only the ends', prereq: 'claim',
    parameters: {mode: 'break', step: UNIT, band: [u(6), u(10)], moves: 1, window: [u(12), u(12)], start: u(6)},
    check: q => assert.deepEqual(breakers(q).map(fmt), ['7', '8', '9']),
    idea: 'The ends of a band can land together while the starts between them go farther.',
    hints: ['Both ends of the band land on 12. Try a start between them.', 'A start near 8 is far from both ends of the track.', 'Put the marker at 8: it is 8 from the nearer end.'],
    parent: {notice: 'Whether your child expects every start to land on 12 because both ends do.', prompt: 'Which start lands farthest from 12?', explanation: 'The ends 6 and 10 are each 6 from the nearer end, so both land on 12. But 7 lands on 14 and 8 on 16: the band crosses the turn at 8, and its starts land everywhere from 12 to 16. Moving only the ends misses the turn.', extension: 'Find another band whose ends land together. (Any band from 8 − h to 8 + h.)', connection: 'A band across 8 lands on [min(2a, 32 − 2b), 16]: the image of an interval is not the interval between the images of its ends.'},
    provenance: 'Week 92 Problem 4 (a child moves just the ends of the band from 6 to 10; both land at 12).'},
  {number: 3, level: 'easy', title: 'One side', prereq: 'claim',
    parameters: {mode: 'break', step: UNIT, band: [u(10), u(15)], moves: 1, window: [u(2), u(12)], start: u(12)},
    check: q => { assert.deepEqual(breakers(q), []); const e = landings(q); assert.deepEqual([e.lo, e.hi, e.lowStarts, e.highStarts], [u(2), u(12), [u(15)], [u(10)]]); },
    idea: 'A band on one side of 8 doubles, turned around on the right side; its ends do give its landing band.',
    hints: ['Try the ends of the band first.', 'On the right of 8, a start farther right lands farther left.', 'The lowest landing comes from 15 and the highest from 10.'],
    parent: {notice: 'Whether your child looks for a break and then accepts that none exists, and what makes them sure.', prompt: 'Why can’t any start in this band land outside 2 to 12?', explanation: 'Every start from 10 to 15 is on the right of 8, so its distance from the nearer end is 16 − x, from 6 down to 1. Doubled, the landings run from 12 down to 2, with no turn in between. The lowest landing (2, from 15) and the highest (12, from 10) are both inside the window, so Can’t is right.', extension: 'Compare with puzzle 2: why do the ends tell the whole story here but not there?', connection: 'On each half the move is linear (slope 2 on the left, −2 on the right), so a band on one half lands on the band between its ends’ landings.'},
    provenance: 'Week 92 Problem 2’s second band (10 to 15, reversed onto 2 to 12), as a claim to break.'},
  {number: 4, level: 'medium', title: 'Across the middle', prereq: 'claim',
    parameters: {mode: 'break', step: UNIT, band: [u(6), u(11)], moves: 1, window: [u(10), u(12)], start: u(11)},
    check: q => assert.deepEqual(breakers(q).map(fmt), ['7', '8', '9']),
    idea: 'Across 8 the band reaches 16, and its lower end comes from the end farther from 8.',
    hints: ['The ends land on 12 and 10. Where does a start near the middle land?', 'Which start in the band is farthest from both ends of the track?', 'Put the marker at 8.'],
    parent: {notice: 'Whether your child now goes straight to the middle of the track after puzzle 2.', prompt: 'Which end of the band gives the lowest landing, and why that one?', explanation: 'The ends 6 and 11 land on 12 and 10, so moving only the ends claims 10 to 12. The band crosses 8, so 8 lands on 16 and 7 and 9 land on 14. The true landing band is 10 to 16: it reaches 16, and its low end, 10, comes from 11, the end farther from 8 (11 is 3 from 8; 6 is only 2).', extension: 'Make the band 6 to 10 instead. What is its landing band? (12 to 16.)', connection: 'For a ≤ 8 ≤ b the landing band is [2·min(a, 16 − b), 16], twice the longer half of the band wide.'},
    provenance: 'Week 92 Problem 2’s third band (6 to 11; its ends give 10 to 12, the truth is 10 to 16).'},
  {number: 5, level: 'medium', title: 'Full on which move', prereq: 'bands',
    parameters: {mode: 'fill', step: UNIT / 2, width: UNIT, rows: 6, goals: [5], start: u(7)},
    check: q => { assert.deepEqual(fillStarts(q, 4).map(fmt), Array.from({length: 16}, (_, k) => String(k))); assert.equal(fillStarts(q, 5).length, 15); assert.deepEqual(fillStarts(q, 3), []); },
    objective: 'Place the band so the whole track is first full on move 5.', visible: '',
    idea: 'Where a band starts matters as well as how wide it is: half a unit can cost a whole move.',
    hints: ['The band from 7 to 8 is first full on move 4. Move it and watch which row is full first.', 'Try a band whose ends are not whole numbers.', 'Put the band from 7½ to 8½.'],
    parent: {notice: 'Whether your child predicts the row that fills before letting go, or only reads it after.', prompt: 'Why does the band from 7½ to 8½ need one more move than 7 to 8?', explanation: 'A band from a whole number m to m + 1 doubles four times, to a band 16 wide that is the whole track. A band from 7½ to 8½ crosses 8: it folds onto 15 to 16, only twice as wide as half of it, and needs four more moves. Every band 1 wide with whole ends is first full on move 4; every one with half-unit ends on move 5.', extension: 'Compare the band from 7 to 9, twice as wide. (It is also first full on move 4.)', connection: 'Each piece [m, m + 1] of the track is one of the sixteen pieces that the fourth move stretches onto the whole track; a band that straddles two pieces holds only halves of them.'},
    provenance: 'Week 92 Problem 3 (move a band until every place is possible; [1, 2] and the wider [7, 9] both take four moves), with the band width fixed and its place chosen: the start, 7 to 8, is first full on move 4.'},
  {number: 6, level: 'medium', title: 'Just as wide', prereq: 'bands',
    parameters: {mode: 'width', step: UNIT, rows: 1, goals: [[1, 1], [2, 3]], start: [u(4), u(6)]},
    check: q => { assert.equal(ratioBands(q, [1, 1]).length, 8); assert.deepEqual(ratioBands(q, [2, 3]).map(b => b.map(fmt).join('-')), ['2-10', '5-9', '6-14', '7-11']); },
    objective: 'Make a band that lands just as wide as it starts, and one that lands half as wide again.', visible: '',
    idea: 'A band never lands narrower; it lands just as wide only when 8 is its middle.',
    hints: ['Most bands land twice as wide. What has to happen for a band to grow less?', 'A band across 8 folds. Try one with 8 in the middle.', 'Make the band from 6 to 10, then from 5 to 9.'],
    parent: {notice: 'Whether your child tries to make a band land narrower, and what they conclude.', prompt: 'Could any band land narrower than it starts?', explanation: 'A band on one side of 8 lands twice as wide. A band from a to b across 8 lands from 2·min(a, 16 − b) to 16, twice its longer half wide. That is at least its whole width, and just as wide only when both halves are equal (6 to 10, say). Half as wide again needs one half three times the other: 5 to 9 (3 and 1) or 2 to 10 (6 and 2), and their mirror images 7 to 11 and 6 to 14.', extension: 'Can a band land three times as wide? (No: never more than twice.)', connection: 'Twice the longer half is at least the sum of the halves, with equality only when they are equal: the width never shrinks, the inequality behind every band eventually filling the track.'},
    provenance: 'Week 92 Problem 5 (a band that becomes wider, one that keeps the same width; could any become narrower?).'},
  {number: 7, level: 'medium', title: 'Two moves', prereq: 'two',
    parameters: {mode: 'break', step: UNIT, band: [u(3), u(8)], moves: 2, window: [u(0), u(12)], start: u(3)},
    check: q => assert.deepEqual(breakers(q).map(fmt), ['4']),
    idea: 'After two moves the turn that matters is where the first move lands on 8.',
    hints: ['The ends land on 12 and 0 after two moves. Try the starts between.', 'A start that lands on 8 after one move lands on 16 after two.', 'Put the marker at 4.'],
    parent: {notice: 'Whether your child tries every start in order or looks for the one that reaches 8 on the first move.', prompt: 'Why is 4 the only whole number that breaks the claim?', explanation: 'After one move the band 3 to 8 lands on 6 to 16, which crosses 8. The second move takes the start that landed on 8, which is 4, to 16. So the true landing band is 0 to 16, though the ends say 0 to 12. Every start strictly between 3 and 5 breaks the claim, since it lands between 6 and 10 on the first move; 4 is the only whole number there.', extension: 'Puzzle 8 has the same claim for the band 5 to 8. Guess before you try it.', connection: 'Two moves make a zigzag with turns at 4, 8 and 12, so a band’s landing band after two moves comes from its ends and any of those turns inside it.'},
    provenance: 'New, from Week 92 Problems 2 and 4 (ends miss the turn) taken two moves.'},
  {number: 8, level: 'hard', title: 'Two moves again', prereq: 'two',
    parameters: {mode: 'break', step: UNIT, band: [u(5), u(8)], moves: 2, window: [u(0), u(12)], start: u(6)},
    check: q => { assert.deepEqual(breakers(q), []); const e = landings(q); assert.deepEqual([e.lo, e.hi, e.lowStarts, e.highStarts], [u(0), u(12), [u(8)], [u(5)]]); },
    idea: 'A band that stays on one side of every turn lands between its ends’ landings.',
    hints: ['Try the ends of the band first.', 'After one move the band is 10 to 16. Does it cross 8 then?', 'The lowest landing comes from 8 and the highest from 5.'],
    parent: {notice: 'Whether your child expects a break like puzzle 7’s and how they decide there is none.', prompt: 'What is different from the band 3 to 8?', explanation: 'After one move the band 5 to 8 lands on 10 to 16, all on the right of 8, and the second move sends that, turned around, to 0 to 12. No start passes through 8 on the first move (that would need 4), so the ends give the whole story: 8 lands lowest, on 0, and 5 highest, on 12, both inside the window.', extension: 'Which bands from 5 to b break the claim 0 to 12 after two moves? (With whole-number ends, none up to 11; from 12 on, 12 lands on 8 and then on 16.)', connection: 'Two moves are linear on each quarter of the track, so a band inside one quarter lands between its ends’ landings.'},
    provenance: 'New: the contrast to puzzle 7, the same claim and two moves for the band 5 to 8.'},
  {number: 9, level: 'hard', title: 'Near zero', prereq: 'widest',
    parameters: {mode: 'widest', step: 1, zoom: UNIT, moves: 3, window: [0, u(2)], start: u(0.5)},
    check: q => assert.equal(widestEnd(q), u(0.25)),
    objective: 'Make the band from 0 as wide as you can while every start stays from 0 to 2 for three moves, then press Widest and pin the start that lands farthest.', visible: 'Make the widest band from 0 that stays from 0 to 2 for three moves.',
    idea: 'Near 0 each move doubles, so three moves stretch a band eight times.',
    hints: ['Watch the band’s right end: where does it leave the window?', 'Each move doubles. What start doubles three times to land on 2?', 'Move the band’s right end to 1/4.'],
    parent: {notice: 'Whether your child shrinks the band one step at a time or halves it.', prompt: 'Why 1/4?', explanation: 'Starts near 0 stay near 0 for a while, and there each move doubles: 1/4 lands on 1/2, 1 and 2. A band from 0 to 1/4 stays from 0 to 2 for three moves, and any wider band has a start that doubles three times to more than 2.', extension: 'How wide for four moves? (1/8.) For six? (1/32.)', connection: 'While 2^(k−1)·q ≤ 8 the band [0, q] lands on [0, 2^k·q], so it stays in [0, 2] for n moves exactly when q ≤ 2/2^n.'},
    provenance: 'Week 92 Problem 6, three moves, on the worksheet’s enlarged 0–1 line.'},
  {number: 10, level: 'hard', title: 'Near zero for longer', prereq: 'widest',
    parameters: {mode: 'widest', step: 1, zoom: UNIT, moves: 5, window: [0, u(2)], start: u(0.25)},
    check: q => assert.equal(widestEnd(q), 2),
    objective: 'Make the band from 0 as wide as you can while every start stays from 0 to 2 for five moves, then press Widest and pin the start that lands farthest.', visible: 'Make the widest band from 0 that stays from 0 to 2 for five moves.',
    idea: 'Every extra move halves the safe band, but for any named number of moves some band works.',
    hints: ['For three moves the widest band was 0 to 1/4. What does each extra move do?', 'Halve 1/4 twice.', 'Move the band’s right end to 1/16.'],
    parent: {notice: 'Whether your child uses puzzle 9’s answer, halving it once for each extra move.', prompt: 'Is there a band, however narrow, that stays from 0 to 2 for every number of moves?', explanation: 'Five doublings stretch 1/16 to 2, so the band from 0 to 1/16 is the widest that stays from 0 to 2 for five moves. The ruler’s smallest step, 1/32, is the widest band for six moves, so shrinking the band as far as it goes is too narrow here. For any named number n of moves the band from 0 to 2/2^n works, but no band with any width works forever: its right end doubles past 2 eventually.', extension: 'Explain why no band with width works for every number of moves.', connection: 'The order of “for every n there is a band” and “there is a band for every n” matters: sensitive dependence on starting places, made exact.'},
    provenance: 'Week 92 Problems 6 (three, four and six moves; five here, since 1/32 is the app’s finest step) and 7 (a band for any named number of moves).'},
  {number: 11, level: 'hard', title: 'Pieces that fill', prereq: 'bands',
    parameters: {mode: 'pieces', step: UNIT / 2, width: 2 * UNIT, rows: 4, on: 3, start: u(1)},
    check: q => assert.deepEqual(fillStarts(q, 3).map(fmt), ['0', '2', '4', '6', '8', '10', '12', '14']),
    objective: 'Find every band 2 wide that is first full on move 3, then press That’s all.', visible: 'Find every band that is first full on move 3.',
    idea: 'The track cut into eight equal pieces: each one is stretched onto the whole track by the third move, and no other band 2 wide is.',
    hints: ['Find one band that is full in row 3, then slide it and look for another.', 'The band from 0 to 2 works. What about the one from 2 to 4?', 'Every one starts at an even number.'],
    parent: {notice: 'Whether your child searches in order along the track and notices the even starts.', prompt: 'Why is the band from 1 to 3 not full until move 4?', explanation: 'Cut the track in half, then in quarters, then in eighths. Each move stretches a piece onto the piece of the cut before it: an eighth onto a quarter, a quarter onto a half, a half onto the whole track. So each of the eight pieces 0 to 2, 2 to 4, … , 14 to 16 is first full on move 3. A band 2 wide that straddles two pieces, like 1 to 3, holds only parts of them, and needs one more move.', extension: 'How many bands 1 wide are first full on move 4? (Sixteen, the pieces from m to m + 1.)', connection: 'Each cell of width 16/2^n is mapped by T^n affinely onto the whole track (Teschl, equation 11.14), and every band with width contains one, so every band eventually fills the track.'},
    provenance: 'Week 92 Problem 8 (pieces A to N, halves, quarters and eighths, each moved until it fills the track).'}
];

const objectiveOf = item => {
  if (item.objective) return item.objective;
  const q = item.parameters;
  return `Make a start in the band land ${claimWords(q.window)}${q.moves > 1 ? ` after ${MOVES[q.moves]}` : ''}, or press Can’t and pin the lowest and the highest landing.`;
};
const visibleOf = item => {
  if (item.visible !== undefined) return item.visible;
  const q = item.parameters;
  return `Make a start land ${claimWords(q.window)}${q.moves > 1 ? ` after ${MOVES[q.moves]}` : ''}.`;
};
function solutionOf(q) {
  if (q.mode === 'pairs' || q.mode === 'pieces') return {answers: answersOf(q), count: answersOf(q).length};
  if (q.mode === 'break') { const e = landings(q), out = breakers(q); return out.length ? {breaks: out} : {cant: true, lowest: e.lo, highest: e.hi, lowStarts: e.lowStarts, highStarts: e.highStarts}; }
  if (q.mode === 'width') return {goals: q.goals.map(g => ratioBands(q, g))};
  if (q.mode === 'fill') return {goals: q.goals.map(k => fillStarts(q, k))};
  return {widest: widestEnd(q)};
}
const puzzles = PUZZLES.map(item => {
  item.check(item.parameters);
  const q = item.parameters, objective = objectiveOf(item);
  return {
    id: `tent-${String(item.number).padStart(2, '0')}`, number: item.number, title: item.title, difficulty_level: item.level,
    familyTitle: 'Ruler strips', libraryFamily: 'ranges', group: 'Fold and stretch', mechanic: 'tent', band: 'all', revision: 1, sourceDocument: 'docs/tent/README.md',
    parameters: q, objective, visibleObjective: visibleOf(item), instruction: objective, controls: CONTROLS[q.mode], rules: RULES[q.mode],
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution: solutionOf(q), provenance: item.provenance
  };
});
assert.equal(new Set(puzzles.map(p => p.title)).size, puzzles.length, 'titles differ');
for (const p of puzzles) assert.ok(!/\d/.test(p.title), `${p.id}: no digits in the title`);

const json = {
  title: 'Fold and stretch',
  version: 1,
  families: [{id: 'tent', title: 'Ruler strips: Fold and stretch', mathematics: 'A marker on the track from 0 to 16 moves to twice its distance from the nearer end: the tent map T(x) = 2·min(x, 16 − x). Mirror starts x and 16 − x land together. A band of starts on one half doubles, reversed on the right half; a band [a, b] across 8 lands on [2·min(a, 16 − b), 16], twice its longer half wide, so the ends of a band can miss the turn and no band ever lands narrower. Near 0 each move doubles, so [0, q] stays in [0, 2] for n moves exactly when q ≤ 2/2ⁿ: for every named n some band works, but no band with width works forever. Each piece of width 16/2ⁿ is stretched onto the whole track by move n, and every band with width holds one, so every band eventually fills the track.', rules: [MOVE_RULE, ROWS_RULE], sourceIds: sources}],
  sources: [
    {id: 'tent-week92', title: 'Bellingham Math Circle — Week 92: Fold-and-stretch predictions (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-92', kind: 'local curriculum'},
    {id: 'tent-card92', title: 'Week 92 review card and math check (App fit: a tent-move group in Ruler strips; Break, Widest and Fill on move k)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-92.md', kind: 'review'},
    {id: 'tent-teschl', title: 'Gerald Teschl, Ordinary Differential Equations and Dynamical Systems, §11.3 (the tent map’s iterates, equations 11.13–11.14)', url: 'https://www.mat.univie.ac.at/~gerald/ftp/book-ode/ode.pdf', kind: 'reference'}
  ],
  puzzles
};
await writeFile(new URL('../dist/families/tent/tent.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(JSON.stringify({puzzles: puzzles.length, levels: puzzles.map(p => p.difficulty_level[0]).join('')}));
