// Authoring list for Ruler strips (worksheet Week 51, honest measurement
// ranges). Computes each puzzle's join range, gap range, breakability and
// widest card with the mechanic's own enumeration, checks them against the
// table in docs/ranges/README.md, and writes dist/families/ranges/ranges.json.
// Run: node scripts/build-ranges.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {extremes, breakable, widest, settings, reach, attack, safe, certificates} from '../dist/families/ranges/ranges.js';

const sources = ['ranges-week51', 'ranges-card51', 'ranges-moore'];
const RULES = {
  strips: 'Each strip’s end stays inside its gray band. Strips join end to end from 0, and the ruler shows where a join ends.',
  white: 'A white piece is exactly as long as its number.',
  twin: 'A letter drawn twice is one strip: both copies are always the same length.',
  window: 'The shaded window is the app’s claim: every join ends inside it.',
  cant: 'Can’t says no join ends outside the window. After it, pin the shortest and the longest join; the two pins are checked together.',
  widen: 'If some join can end outside the window, the app sets the strips to show one.',
  widest: 'Widest says the band can’t grow at either end. After it, pin the shortest and the longest join; the two pins are checked together.',
  gap: 'The gap is between the ends of two rows. Pin a setting with the biggest gap and one with the smallest; the two pins are checked together.',
  lock: 'A and B always add to 12: their row ends at the wall, and moving one end moves the other.'
};
const CONTROLS = {
  break: 'Drag the end of a strip, or tap its row, to change its length. Arrow keys move a focused end. Press Can’t once you have tried a join, then set the strips and press Pin for the shortest join and for the longest.',
  widen: 'Drag an end of B’s band, or tap near it. Arrow keys move a focused end. Press Widest, then set the strips and press Pin for the shortest join and for the longest.',
  gap: 'Drag the end of a strip, or tap its row, to change its length. Arrow keys move a focused end. Press Pin for a setting with the biggest gap and for one with the smallest.',
  playground: 'Drag the end of a strip or an end of its band, or tap near one. Arrow keys move a focused end.'
};
const PREREQUISITES = {
  break: 'Reading a ruler to 13 and comparing lengths. No adding: the ruler shows where the join ends.',
  widen: 'Reading a ruler and the break puzzles. The app does the attacking; the child decides how far each end of the band can go.',
  gap: 'Reading a ruler and comparing two ends. No subtracting: the gap is drawn between the ends.'
};

// The table in docs/ranges/README.md.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two strips', mode: 'break', ruler: 13, cards: {A: [4, 6], B: [3, 4]}, start: {A: 5, B: 4}, rows: [['A', 'B']], window: [8, 10],
    check: {range: [7, 10], breakable: true},
    idea: 'One setting outside is enough to break a claim about every setting; the shortest join takes every strip at its shortest.',
    hints: ['Can the join get out of the window by being too short, or too long?', 'The shortest join uses the shortest A and the shortest B.', 'Make A 4 long and B 3 long: the join ends at 7.'],
    parent: {notice: 'Whether your child tries both directions, or reaches for the short end straight away.', prompt: 'Could a longer join break it?', explanation: 'The join runs from 4 + 3 = 7 to 6 + 4 = 10, and every end between occurs. Only the shortest setting, ending at 7, is outside 8 to 10: “always reaches 8” fails and “fits within 10” holds.', extension: 'What is the narrowest window the app could claim that nobody can break? (7 to 10.)', connection: 'Interval addition: [4, 6] + [3, 4] = [7, 10].'},
    provenance: 'Week 51 K–1 Problem 2 and Grades 2–3 and 4–5 Problem 2: the pair A (4 to 6 units) with B (3 to 4 units), against “always reaches 8 and fits within 10”.'},
  {number: 2, level: 'easy', title: 'A long strip', mode: 'break', ruler: 13, cards: {A: [6, 8], B: [2, 4]}, start: {A: 7, B: 3}, rows: [['A', 'B']], window: [8, 10],
    check: {range: [8, 12], breakable: true},
    idea: 'The other side of the window: the longest join takes every strip at its longest.',
    hints: ['Find the shortest and the longest join. Does either get out?', 'The shortest join ends at 8, inside. The longest uses the longest A and the longest B.', 'Make A 8 long: the join ends at 11.'],
    parent: {notice: 'Whether your child, after Puzzle 1, tries the short end first and then turns round.', prompt: 'Which joins get out, and which don’t?', explanation: 'The join runs from 6 + 2 = 8 to 8 + 4 = 12. It always reaches 8, so the short side holds; the joins ending at 11 or 12 (8 + 3, 7 + 4, 8 + 4) break “fits within 10”.', extension: 'Narrow the bands so nobody can break the claim. (For example A 6 to 7 and B 2 to 3: joins from 8 to 10.)', connection: 'Interval addition: [6, 8] + [2, 4] = [8, 12].'},
    provenance: 'Week 51 Grades 2–3 and 4–5 Problem 2 (and K–1 Problem 2): the pair E (6 to 8 units) with F (2 to 4 units), renamed A and B, against the same claim.'},
  {number: 3, level: 'easy', title: 'Two ends', mode: 'gap', ruler: 11, cards: {A: [4, 6], B: [3, 4]}, start: {A: 5, B: 3}, rows: [['A', 'B'], ['A']], pairs: [[0, 1]],
    check: {gaps: [[3, 4]]},
    idea: 'Taking away the very same A leaves exactly B: the gap runs from 3 to 4, not the 1 to 6 that the two rows’ separate ranges suggest.',
    hints: ['Move each strip in turn and watch the gap.', 'Both rows start with the same A, so moving A moves both ends together.', 'Pin B at 4, then B at 3.'],
    parent: {notice: 'Whether your child drags A, sees the gap stay put, and then turns to B.', prompt: 'Someone says the gap could be anything from 1 to 6, because the top row ends from 7 to 10 and the bottom from 4 to 6. What is wrong?', explanation: 'The top row is A + B and the bottom is that same A, so the gap is exactly B: 3 to 4. Using the two ranges separately pairs a long A on top with a short A below, which can’t happen. 1 to 6 is a safe claim but a loose one.', extension: 'What if the bottom row used a different strip with the same band as A? (Then the gap runs from 1 to 6.)', connection: 'The dependency problem of interval arithmetic: X + Y − X evaluated piece by piece is wider than Y.'},
    provenance: 'Week 51 Grades 4–5 Problem 9: join A (4 to 6) to B (3 to 4), then remove that very same A; the claimed 1 to 6 is safe but not tightest.'},
  {number: 4, level: 'medium', title: 'Two middling strips', mode: 'break', ruler: 13, cards: {A: [4, 5], B: [4, 5]}, start: {A: 4, B: 5}, rows: [['A', 'B']], window: [8, 10],
    check: {range: [8, 10], breakable: false},
    idea: 'A claim nobody can break is shown by the two extreme settings: if the shortest and the longest join are inside, every join is.',
    hints: ['Try the shortest join you can make, then the longest.', 'With both strips shortest the join ends at 8, and with both longest at 10.', 'Make A 4 and B 4, press Can’t and Pin, then make A 5 and B 5 and Pin.'],
    parent: {notice: 'Whether your child tries the extremes before pressing Can’t, or presses after one middling join.', prompt: 'How do you know no join gets out? You haven’t tried them all.', explanation: 'Every join is at least the two shortest strips, 4 + 4 = 8, and at most the two longest, 5 + 5 = 10. Both are inside 8 to 10, so every join is. The two pinned joins are the whole argument; a wrong pair of pins is refused.', extension: 'Make the window one unit narrower on either side. Which pinned join breaks it?', connection: 'An interval sum is attained at its endpoints: min (A + B) = min A + min B.'},
    provenance: 'Week 51 Grades 2–3 and 4–5 Problem 2 (and K–1 Problem 2): the pair C (4 to 5) with D (4 to 5), renamed A and B, the only pair that keeps both promises.'},
  {number: 5, level: 'medium', title: 'One band to widen', mode: 'widen', ruler: 12, cards: {A: [3, 4], B: [5, 6]}, edit: 'B', rows: [['A', 'B']], window: [7, 9],
    check: {widest: [[4, 5]], startSafe: false},
    idea: 'Each end of the widest band is pinned by one setting: A at 3 forces B to reach 4, and A at 4 stops B past 5.',
    hints: ['Watch the join the app makes. Which end of B’s band lets it out?', 'With A at 3, B must reach 4; with A at 4, B can be at most 5.', 'Make B’s band 4 to 5, press Widest, then pin 3 + 4 and 4 + 5.'],
    parent: {notice: 'Whether your child shrinks the end that the app’s join escapes through, and then tries to grow each end again.', prompt: 'Why can’t B’s band be 4 to 6?', explanation: 'A may be 3 or 4. If B could be 3, then 3 + 3 = 6 falls short of 7; if B could be 6, then 4 + 6 = 10 passes 9. So B’s band is at most 4 to 5, and 4 to 5 works: joins run from 3 + 4 = 7 to 4 + 5 = 9. The window is 2 wide and A’s band is 1 wide, which leaves 1 for B.', extension: 'If A were exactly 3, how wide could B’s band be? (4 to 6.)', connection: 'Widths add under interval addition: width(A + B) = width A + width B.'},
    provenance: 'Week 51 Grades 2–3 and 4–5 Problem 3 (A 3 to 4, every join from 7 to 9, the widest card for B), and K–1 Problem 3’s three B cards: the starting band 5 to 6 is its “too long” card.'},
  {number: 6, level: 'medium', title: 'One A, then a B', mode: 'gap', ruler: 11, cards: {A: [4, 6], B: [4, 6]}, start: {A: 5, B: 5}, rows: [['A', 4], ['A', 1], ['A', 4], ['B', 1]], pairs: [[0, 1], [2, 3]],
    check: {gaps: [[3, 3], [1, 5]]},
    idea: 'The same A on both rows cancels, so its gap is always 3; a separate B of the same band lets the gap run from 1 to 5, longest less shortest.',
    hints: ['Move A, then B, and watch both gaps.', 'The top gap is always 3. The bottom gap is biggest with the longest A and the shortest B.', 'Pin A 6 with B 4 for the biggest bottom gap, then A 4 with B 6 for the smallest.'],
    parent: {notice: 'Whether your child notices that the top gap never moves, and moves A and B opposite ways for the bottom one.', prompt: 'The bottom strips have the same bands as the top. Why does only the bottom gap change?', explanation: 'On top, both rows start with the same A, so the ends are A + 4 and A + 1, always 3 apart. Below, A + 4 runs from 8 to 10 and B + 1 from 5 to 7 on its own: the biggest gap is 10 − 5 = 5 and the smallest 8 − 7 = 1.', extension: 'Can the bottom gap be 3 with A and B different lengths? (No: A + 4 − (B + 1) = 3 needs A = B.)', connection: 'Dependency in interval arithmetic: (A + 4) − (A + 1) is exactly 3, while [8, 10] − [5, 7] = [1, 5].'},
    provenance: 'Week 51 K–1 Problem 4 and Grades 2–3 and 4–5 Problem 5: the same A twice against a separate B, both 4 to 6, with the white pieces 4 and 1 (the review card’s fix 2: both A’s are always the same).'},
  {number: 7, level: 'hard', title: 'Three strips', mode: 'widen', ruler: 16, cards: {A: [2, 3], B: [3, 5], C: [5, 5]}, edit: 'C', rows: [['A', 'B', 'C']], window: [9, 14],
    check: {widest: [[4, 6]], startSafe: true},
    idea: 'Widths add: the window is 5 wide, A’s and B’s bands use 1 and 2, so C’s widest band is 2 wide, pinned by the shortest and the longest join.',
    hints: ['Grow C’s band one end at a time, and watch for a join the app gets out.', 'The shortest join is 2 + 3 + C’s left end; the longest is 3 + 5 + C’s right end.', 'Make C’s band 4 to 6, press Widest, then pin 2 + 3 + 4 and 3 + 5 + 6.'],
    parent: {notice: 'Whether your child grows each end until the app escapes and then steps back, rather than guessing a band.', prompt: 'How could you tell the width of C’s band before trying?', explanation: 'The shortest join is 2 + 3 + c and must reach 9, so C’s left end is at least 4; the longest is 3 + 5 + C’s right end and must fit within 14, so C’s right end is at most 6. C 4 to 6 is the one widest band: its width 2 is the window’s 5 less A’s 1 and B’s 2.', extension: 'If B’s band were 3 to 6, how wide could C’s band be? (1: from 4 to 5.)', connection: 'width(A + B + C) = width A + width B + width C, so a target window leaves exactly its width less the others’ for the last band.'},
    provenance: 'New, from Week 51 Problem 3 (the widest card for B) and Grades 2–3 and 4–5 Problem 4 (which strip’s width matters), with a third strip.'},
  {number: 8, level: 'hard', title: 'Twelve in all', mode: 'gap', ruler: 13, cards: {A: [7, 10], B: [3, 7]}, start: {A: 8, B: 4}, rows: [['A', 'B'], ['A'], ['B']], pairs: [[1, 2]], total: {strips: ['A', 'B'], sum: 12},
    check: {gaps: [[2, 6]], reachA: [7, 9]},
    idea: 'A total locked at 12 ties B to A, cuts A’s band to 7 to 9 (A = 10 would need B = 2), and makes the gap 2A − 12: from 2 to 6.',
    hints: ['Drag A as far as it goes each way, and watch B.', 'A stops at 9, because B can’t be shorter than 3. Then the gap is 9 − 3.', 'Pin A at 9 for the biggest gap, then at 7 for the smallest.'],
    parent: {notice: 'Whether your child notices that A’s end stops before the end of its band, and why.', prompt: 'A’s band goes up to 10. Why can’t A be 10?', explanation: 'A + B = 12, so B = 12 − A. B’s band 3 to 7 forces A between 5 and 9, and A’s band 7 to 10 cuts that to 7 to 9. The gap A − B = 2A − 12 runs from 2 (A 7, B 5) to 6 (A 9, B 3). Without the lock the gap could be anything from 0 to 7.', extension: 'Change the total to 13. Does anything stop A now? (No: A runs over its whole band, 7 to 10, and B is cut to 3 to 6.)', connection: 'A constraint between variables tightens interval bounds: constraint propagation in interval analysis.'},
    provenance: 'Week 51 Grades 4–5 Problem 8: A 7 to 10, B 3 to 7, their join exactly 12; the smallest and largest gap between their ends.'}
];

const id = n => `ranges-${String(n).padStart(2, '0')}`;
const OBJECTIVE = {
  break: q => `Set the strips so the join ends outside ${q.window[0]} to ${q.window[1]}, or press Can’t and pin the shortest and the longest join.`,
  widen: q => `Make ${q.edit}’s band as wide as you can while every join ends from ${q.window[0]} to ${q.window[1]}, then press Widest and pin the shortest and the longest join.`,
  gap: q => q.total ? `With A + B always ${q.total.sum}, pin the biggest and the smallest gap between the ends of A and B.` : `Pin the biggest and the smallest gap${q.pairs.length > 1 ? ' in each pair of rows' : ''}.`
};
const VISIBLE = {
  break: q => `Make the join end outside ${q.window[0]} to ${q.window[1]}.`,
  widen: q => `Make ${q.edit}’s band as wide as you can while every join ends from ${q.window[0]} to ${q.window[1]}.`,
  gap: q => q.total ? `With A + B always ${q.total.sum}, pin the biggest and the smallest gap.` : 'Pin the biggest and the smallest gap.'
};
const rulesFor = q => [RULES.strips, ...(q.rows.flat().some(x => typeof x === 'number') ? [RULES.white] : []), ...(q.rows.flat().filter(x => x === 'A').length > 1 ? [RULES.twin] : []),
  ...(q.mode === 'break' ? [RULES.window, RULES.cant] : q.mode === 'widen' ? [RULES.window, RULES.widen, RULES.widest] : [RULES.gap, ...(q.total ? [RULES.lock] : [])])];

const out = PUZZLES.map(item => {
  const {number, level, title, check, idea, hints, parent, provenance, ...rest} = item;
  const q = rest;
  let solution;
  if (q.mode === 'break') {
    const [e] = extremes(q, q.cards);
    assert.deepEqual([e.lo, e.hi], check.range, `${id(number)}: join range`);
    assert.equal(breakable(q), check.breakable, `${id(number)}: breakable`);
    solution = check.breakable
      ? {breaks: settings(q, q.cards).filter(len => { const end = len.A + len.B; return end < q.window[0] || end > q.window[1]; })}
      : {cant: true, pins: [e.low, e.high]};
  } else if (q.mode === 'widen') {
    assert.deepEqual(widest(q), check.widest, `${id(number)}: the widest band`);
    assert.equal(safe(q, q.cards[q.edit]), check.startSafe, `${id(number)}: the starting band`);
    const cards = {...q.cards, [q.edit]: check.widest[0]}, [e] = extremes(q, cards);
    assert.deepEqual([e.lo, e.hi], q.window, `${id(number)}: the widest band’s joins touch both edges`);
    solution = {band: check.widest[0], pins: [e.low, e.high], start: attack(q, q.cards[q.edit])};
  } else {
    const ex = extremes(q, q.cards);
    assert.deepEqual(ex.map(e => [e.lo, e.hi]), check.gaps, `${id(number)}: gap ranges`);
    if (check.reachA) assert.deepEqual(reach(q, q.cards, q.start, 'A'), check.reachA, `${id(number)}: where A can reach`);
    solution = {gaps: ex.map(e => ({smallest: e.lo, biggest: e.hi})), pins: certificates(q, q.cards)[0]};
  }
  return {
    id: id(number), number, title, difficulty_level: level, familyTitle: 'Ruler strips', mechanic: 'ranges', band: 'all', revision: 1, sourceDocument: 'docs/ranges/README.md',
    parameters: q,
    objective: OBJECTIVE[q.mode](q), visibleObjective: VISIBLE[q.mode](q), instruction: OBJECTIVE[q.mode](q),
    controls: CONTROLS[q.mode], rules: rulesFor(q),
    idea, prerequisites: PREREQUISITES[q.mode], hints,
    parent: {...parent, sourceIds: sources}, solution, provenance
  };
});

const playground = {
  id: 'ranges-playground', number: 0, title: 'Ruler strips playground', difficulty_level: 'playground', familyTitle: 'Ruler strips', mechanic: 'ranges', band: 'playground', revision: 1, sourceDocument: 'docs/ranges/README.md',
  parameters: {mode: 'playground', ruler: 12, cards: {A: [2, 4], B: [3, 5]}, start: {A: 3, B: 4}, rows: [['A', 'B']]},
  objective: 'Set any bands for A and B and try their joins.', visibleObjective: '',
  instruction: 'Set any bands for A and B and try their joins.',
  controls: CONTROLS.playground,
  rules: [RULES.strips],
  idea: 'Free play with two strips and their bands: where can the join end?',
  prerequisites: 'None. A partner can set the bands and a claim, and the other tries to break it.',
  hints: ['Set the bands, then find the shortest and the longest join.', 'Make one band wider by one. How much wider does the spread of joins get?', 'Set both bands to one length each. How many places can the join end?'],
  parent: {notice: 'Whether your child can predict, before dragging, where the shortest and the longest join will end.', prompt: 'Make a claim like “always reaches 8 and fits within 10” and challenge your child to break it.', explanation: 'The join ends anywhere from the sum of the left ends to the sum of the right ends, and the spread of joins is as wide as the two bands together.', extension: 'Ask for the widest band for B that keeps every join inside a window you choose.', connection: 'Interval addition and its widths.', sourceIds: sources},
  provenance: 'Week 51 page 1’s launch (A 2 to 3, B 1 to 2) and Problem 1, made free.'
};

const json = {
  title: 'Ruler strips',
  version: 1,
  families: [{id: 'ranges', title: 'Ruler strips', mathematics: 'Each strip’s length is a whole number of units somewhere in its band [lo, hi]. Strips laid end to end from 0 make a join, which ends somewhere in [Σ lo, Σ hi], and every end in between occurs, so one setting outside a window breaks a claim about every join, and the shortest and longest joins together certify a claim nobody can break. Widths add, so the widest band for one strip that keeps every join in a window is the window’s width less the other bands’ widths, pinned at each end by one extreme setting. A strip drawn twice is one strip: in a gap it cancels, so (A + 4) − (A + 1) is exactly 3 while (A + 4) − (B + 1) runs from 1 to 5, and the same A taken away leaves exactly B. A locked total A + B = 12 ties the two strips and can cut a band short. This is interval arithmetic and its dependency problem.', rules: [RULES.strips, RULES.twin], sourceIds: sources}],
  sources: [
    {id: 'ranges-week51', title: 'Bellingham Math Circle — Week 51: Honest measurement ranges (student packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-51', kind: 'local curriculum'},
    {id: 'ranges-card51', title: 'Week 51 review card, its second run and the math check (App fit and Decision; fixes 2, 3 and 4)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-51.md', kind: 'local curriculum'},
    {id: 'ranges-moore', title: 'Ramon E. Moore, R. Baker Kearfott and Michael J. Cloud — Introduction to Interval Analysis, SIAM (2009): interval arithmetic, widths, and the dependency problem', url: 'https://doi.org/10.1137/1.9780898717716', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/ranges/ranges.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${JSON.stringify(p.solution.breaks ? {breaks: p.solution.breaks.map(len => Object.values(len).join('+'))} : p.solution.band ? {band: p.solution.band} : p.solution.gaps ? {gaps: p.solution.gaps.map(g => [g.smallest, g.biggest])} : {cant: true})}`).join('\n'));
