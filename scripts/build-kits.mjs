// Builds dist/families/kits/kits.json, the Odd-pebble Balance weight kits
// group, from the authoring list below. Each puzzle's answers (the targets a
// kit balances, every way to balance a target, or the kits that work) are
// computed here by listing every placement (dist/families/kits/kits.js) and
// checked again by scripts/validate-kits.mjs with a different count. Design
// notes and sources: docs/kits/README.md.
import {writeFile} from 'node:fs/promises';
import {waysFor, reachable, pickAnswers} from '../dist/families/kits/kits.js';

const WEEK30 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-30';
export const sources = [
  {id: 'kits-week30', title: 'Bellingham Math Circle — Week 30: Two-pan weight kits, packets and adult guide', url: WEEK30, kind: 'local curriculum'},
  {id: 'kits-bachet', title: 'Bachet’s weights problem (C. G. Bachet, Problèmes plaisans et délectables, 1612): weights 1, 3, 9, 27 weigh every whole load to 40 on a two-pan balance', url: 'https://en.wikipedia.org/wiki/Balanced_ternary#Applications', kind: 'research'},
  {id: 'kits-ternary', title: 'Balanced ternary: every integer has exactly one expansion in powers of 3 with digits −1, 0 and 1', url: 'https://en.wikipedia.org/wiki/Balanced_ternary', kind: 'undergraduate'}
];
export const family = {
  id: 'kits',
  title: 'Odd-pebble Balance weight kits',
  mathematics: 'A target on one pan balances when it equals the weights on the other pan minus the weights beside it, so a kit balances exactly the targets that are signed sums of its weights, each weight counted +1, 0 or −1. A kit of m weights has 3^m placements; all off gives 0 and the rest pair up as mirror images, so at most (3^m − 1)/2 positive targets. Weights 1, 3, 9, …, 3^(m−1) reach that bound with no gaps: every target from 1 to (3^m − 1)/2 balances in exactly one way (balanced ternary). If the first weights reach every target to R, a next weight w extends the run without a gap exactly when w ≤ 2R + 1, and w = 2R + 1 carries it to 3R + 1.',
  rules: [
    'The target sits on the left pan. Each weight goes beside the target, on the other pan, or off.',
    'The scale balances when both pans hold the same total: the target and the weights beside it against the weights opposite.',
    'A target lights up when it balances.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = {
  balance: family.rules,
  which: [...family.rules, 'That’s all says no other target in the row can balance with this kit. A wrong claim is refused.'],
  ways: [...family.rules, 'Each different placement that balances the target is listed. That’s all says there is no other way. A wrong claim is refused.'],
  choose: [...family.rules, 'The weights at the top make the kit. A weight that leaves the kit leaves the pans, and the targets it balanced go dark.'],
  playground: [...family.rules, 'Choose up to four weights. Nothing needs finishing.']
};
const PLACE = 'Tap ◀ to put a weight beside the target, ▶ to put it on the other pan, or ● to take it off. Clear pans takes every weight off.';
const CONTROLS = {
  balance: PLACE,
  targets: `Tap a target to put it on the scale. ${PLACE}`,
  which: `Tap a target to put it on the scale. ${PLACE} Press That’s all when no other target can balance.`,
  ways: `${PLACE} Each new way joins the list. Press That’s all when there is no other way.`,
  choose: `Tap weights at the top to choose the kit, then tap a target to put it on the scale. ${PLACE}`,
  stepper: `Use − and + at the top to choose the new weight, then tap a target to put it on the scale. ${PLACE}`,
  playground: `Tap weights at the top to choose up to four, and tap any target to put it on the scale. ${PLACE}`
};
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Two with one and three',
    parameters: {mode: 'balance', kit: [1, 3], targets: [2]},
    objective: 'Balance target 2 with weights 1 and 3.',
    visibleObjective: 'Balance the scale.',
    idea: 'A weight beside the target counts against it: 2 + 1 = 3.',
    prerequisites: 'Compare two small totals. Nothing to read but numbers.',
    hints: ['Put a weight on the other pan. Which side is heavier?', 'A weight can also go beside the target.', 'Put 1 beside the target and 3 on the other pan: 2 + 1 = 3.'],
    parent: {
      notice: 'Whether your child thinks of putting a weight on the target’s own pan. Many children only add weights to the empty pan.',
      prompt: 'What happens when a weight joins the target?',
      explanation: 'With weights only on the other pan, that side holds 1, 3 or 4, never 2. Putting 1 beside the target makes the left side 3, and 3 on the other pan balances it. A weight beside the target takes away: 2 = 3 − 1.',
      extension: 'Which other targets can 1 and 3 balance?',
      connection: 'Each weight counts +1 (opposite), 0 (off) or −1 (beside the target), so a target balances exactly when it is a signed sum of the weights.'
    },
    provenance: 'Week 30 whole-group launch (target 3 with weights 1 and 4: 3 + 1 = 4), on the instance of K–1 Problem 1’s target 2 with weights 1 and 3.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'One and three',
    parameters: {mode: 'balance', kit: [1, 3], targets: [1, 2, 3, 4]},
    objective: 'Balance every target from 1 to 4 with weights 1 and 3.',
    visibleObjective: 'Balance every target.',
    idea: 'Two weights, 1 and 3, reach every target from 1 to 4, because 2 = 3 − 1.',
    prerequisites: 'Weight kits puzzle 1. Add and compare totals up to 4.',
    hints: ['Tap a target to put it on the scale.', 'Target 2 needs a weight beside it.', 'Target 4 is 1 + 3.'],
    parent: {
      notice: 'Whether the move from puzzle 1, a weight beside the target, comes back for target 2 without help.',
      prompt: 'Which target was hardest?',
      explanation: '1 and 3 each balance themselves, 4 = 1 + 3, and 2 = 3 − 1 with the 1 beside the target. Each of the four targets has exactly one placement.',
      extension: 'Could two weights balance every target from 1 to 5?',
      connection: 'Two weights have 3 × 3 = 9 placements. All off gives 0, and the other 8 pair up as mirror images (swap the pans), so two weights balance at most 4 targets. Weights 1 and 3 reach that bound with no gap.'
    },
    provenance: 'Week 30 K–1 Problem 1 (weights 1 and 3, targets 1 to 4).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'One and two',
    parameters: {mode: 'which', kit: [1, 2], targets: range(1, 5)},
    objective: 'Balance every target from 1 to 5 that weights 1 and 2 can, then press That’s all.',
    visibleObjective: 'Balance every target you can, then press That’s all.',
    idea: 'Weights 1 and 2 reach only 1, 2 and 3: the other pan never holds more than the whole kit.',
    prerequisites: 'Weight kits puzzles 1 and 2.',
    hints: ['Light every target you can first.', 'Both weights on the other pan make 3. Can anything make more?', 'Light 1, 2 and 3, then press That’s all: 4 and 5 are too heavy.'],
    parent: {
      notice: 'Whether your child stops at 3 by reasoning (1 + 2 is the most) or keeps trying 4 and 5.',
      prompt: 'What is the heaviest target 1 and 2 could ever balance?',
      explanation: 'The other pan holds at most 1 + 2 = 3, and a weight beside the target only makes its side heavier, so 4 and 5 cannot balance. Target 1 balances two ways (1 alone, or 1 + 1 = 2), and that repeat is why this kit stops short of 4.',
      extension: 'Swap the 2 for another weight so that the kit reaches 4.',
      connection: 'A kit reaches no further than its total. Two placements with the same total waste one of the 4 targets two weights could reach.'
    },
    provenance: 'Week 30 K–1 Problem 2 (weights 1 and 2, targets 1 to 5).'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'One and four',
    parameters: {mode: 'which', kit: [1, 4], targets: range(1, 6)},
    objective: 'Balance every target from 1 to 6 that weights 1 and 4 can, then press That’s all.',
    visibleObjective: 'Balance every target you can, then press That’s all.',
    idea: 'Weights 1 and 4 reach 1, 3, 4 and 5 but skip 2: a gap can sit in the middle.',
    prerequisites: 'Weight kits puzzles 1 to 3.',
    hints: ['Light every target you can first.', 'Target 3 needs the 1 beside it.', 'Light 1, 3, 4 and 5, then press That’s all: 2 and 6 can’t balance.'],
    parent: {
      notice: 'Whether your child expects a kit to reach every target below its total.',
      prompt: 'Why can’t 1 and 4 make 2?',
      explanation: 'The placements of 1 and 4 give 1, 3 (4 − 1), 4 and 5 (4 + 1). Target 2 would need two weights that differ by 2 or add to 2, and 6 is more than the whole kit. So 1 and 4 balance four targets, as many as 1 and 3, but with a gap.',
      extension: 'Which two weights balance every target from 1 to 4 with no gap?',
      connection: 'All 8 nonzero placements of 1 and 4 give different totals, so this kit also reaches the bound of 4 targets; only where they fall differs.'
    },
    provenance: 'Week 30 K–1 Problem 3 (compare weights 1 and 4 with 1 and 3 on targets 1 to 6); grades 2–3 Problem 1.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Doubled',
    parameters: {mode: 'choose', fixed: [], choices: range(1, 8), pick: 2, targets: [2, 4, 6, 8]},
    objective: 'Choose two of the weights 1 to 8 so that targets 2, 4, 6 and 8 all balance, and balance them.',
    visibleObjective: 'Choose two weights that balance every target.',
    idea: 'Doubling every weight doubles every target: 2 and 6 do for 2, 4, 6, 8 what 1 and 3 did for 1, 2, 3, 4.',
    prerequisites: 'Weight kits puzzles 2 and 4.',
    hints: ['Tap two weights at the top to make the kit.', 'These targets are puzzle 2’s targets, doubled.', 'Choose 2 and 6: 4 = 6 − 2 and 8 = 6 + 2.'],
    parent: {
      notice: 'Whether your child connects the targets to puzzle 2 and doubles the kit, or searches pair by pair.',
      prompt: 'How are 2, 4, 6 and 8 like 1, 2, 3 and 4?',
      explanation: 'Two weights a < b balance at most four targets: a, b, b − a and a + b. To get 2, 4, 6 and 8, the largest, a + b, must be 8, and the other three must be 2, 4 and 6. Only 2 and 6 do that. It is 1 and 3 with every weight doubled, and every placement doubles with it.',
      extension: 'Which two weights balance 3, 6, 9 and 12?',
      connection: 'Signed sums scale: multiplying every weight by k multiplies every balanced target by k, so a kit’s targets are a pattern that can be stretched.'
    },
    provenance: 'New instance for Week 30 K–1 Problem 4 and grades 4–5 Problem 1 (find every two-weight kit for targets 1 to 4, whose only answer is 1 and 3), with the targets doubled.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Every way to make four',
    parameters: {mode: 'ways', kit: [1, 3, 8], target: 4},
    objective: 'Find every way to balance target 4 with weights 1, 3 and 8, then press That’s all.',
    visibleObjective: 'Find every way to balance 4, then press That’s all.',
    idea: '4 = 1 + 3, and also 4 + 1 + 3 = 8: the kit 1, 3, 8 makes 4 twice.',
    prerequisites: 'Weight kits puzzles 1 to 4.',
    hints: ['Each new way joins the list.', 'Can 8 help, though it is heavier than 4?', 'Put 1 and 3 beside the target and 8 on the other pan: 4 + 1 + 3 = 8.'],
    parent: {
      notice: 'Whether your child uses the heavy 8 at all, and how they decide there is no third way.',
      prompt: 'Can a weight heavier than the target ever help?',
      explanation: 'The two ways are 4 = 1 + 3 with 8 off, and 4 + 1 + 3 = 8. With 8 on the other pan, the target side must make up 4 more, which only 1 and 3 together do. With 8 beside the target, its side is already 12 or more, and 1 and 3 hold only 4. Because 4 is made twice, the kit balances one target fewer than it might: 1 to 12, then a gap at 13.',
      extension: 'Is there a target that 1, 3 and 9 balance in two ways?',
      connection: 'Three weights have 27 placements, so at most 13 positive targets. Each repeat, like the two ways to make 4, costs the kit one target.'
    },
    provenance: 'Week 30 grades 2–3 Problem 4 (every way to balance 4 with 1, 3, 8, then with 1, 3, 9).'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'A third weight',
    parameters: {mode: 'choose', fixed: [1, 3], choices: [8, 9, 10], pick: 1, targets: range(5, 13)},
    objective: 'Add 8, 9 or 10 to weights 1 and 3 so that every target from 5 to 13 balances, and balance them all.',
    visibleObjective: 'Choose a third weight that balances every target.',
    idea: '1 and 3 can add or take away up to 4, so a new weight w reaches w − 4 to w + 4. Only 9 covers 5 to 13.',
    prerequisites: 'Weight kits puzzles 2 and 6.',
    hints: ['Tap 8, 9 or 10 to add it to the kit.', '1 and 3 can add or take away up to 4. How far either side of 9 does that reach?', 'Choose 9: 5 = 9 − 4 and 13 = 9 + 4.'],
    parent: {
      notice: 'Whether your child sees the run around the new weight, from w − 4 to w + 4.',
      prompt: 'With 8 in the kit, which target fails?',
      explanation: '1 and 3 make every amount from 1 to 4, on either pan. With a new weight w on the other pan, they reach every target from w − 4 to w + 4. With 8 that is 4 to 12, so 13 fails; with 10 it is 6 to 14, so 5 fails; with 9 it is exactly 5 to 13. With 1 to 4 from before, the kit 1, 3, 9 balances every target from 1 to 13.',
      extension: 'Which fourth weight would carry the run on past 13?',
      connection: 'This is one step of balanced ternary: if the first weights reach every target to R, the weight 2R + 1 extends the run to 3R + 1, and any heavier weight leaves a gap at R + 1.'
    },
    provenance: 'Week 30 K–1 Problem 5 (choose 8, 9 or 10 with 1 and 3 for targets 5 to 13); grades 2–3 Problem 2; grades 4–5 Problem 2.'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'One, three and ten',
    parameters: {mode: 'which', kit: [1, 3, 10], targets: range(1, 9)},
    objective: 'Balance every target from 1 to 9 that weights 1, 3 and 10 can, then press That’s all.',
    visibleObjective: 'Balance every target you can, then press That’s all.',
    idea: '10 is one too heavy: the run around 10 starts at 6, so 5 is a gap.',
    prerequisites: 'Weight kits puzzle 7.',
    hints: ['Light every target you can first.', 'Targets 6 to 9 use 10 on the other pan.', 'Light every target but 5, then press That’s all.'],
    parent: {
      notice: 'Whether your child finds the single gap in the middle of the row and can say why 5 is missed.',
      prompt: 'Which targets need the 10?',
      explanation: '1 and 3 alone give 1 to 4. With 10 opposite they add or take away up to 4, giving 6 to 14. Target 5 is in neither run, so it cannot balance. All 27 placements of 1, 3, 10 give different totals, so this kit balances 13 targets, as many as 1, 3, 9, with a gap at 5.',
      extension: 'What is the first target 1, 3 and 8 cannot balance?',
      connection: 'Thirteen targets is the most three weights can balance; among whole-number kits, only 1, 3, 9 balances them with no gap.'
    },
    provenance: 'Week 30 grades 2–3 Problem 3 (the first target that 1, 3, 8; 1, 3, 9; and 1, 3, 10 cannot balance).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Five with one, three and nine',
    parameters: {mode: 'ways', kit: [1, 3, 9], target: 5},
    objective: 'Find every way to balance target 5 with weights 1, 3 and 9, then press That’s all.',
    visibleObjective: 'Find every way to balance 5, then press That’s all.',
    idea: 'With 1, 3 and 9 there is just one way: 5 + 1 + 3 = 9.',
    prerequisites: 'Weight kits puzzles 6 and 7.',
    hints: ['1 + 3 is only 4.', 'Put 9 on the other pan. How much is the target side short?', 'Put 1 and 3 beside the target and 9 opposite. There is no other way.'],
    parent: {
      notice: 'Whether your child keeps looking for a second way, as in puzzle 6, and how they decide there is none.',
      prompt: 'Why is there no second way this time?',
      explanation: '5 + 1 + 3 = 9 is the only way. Without 9 the weights hold at most 4. With 9 opposite, the target side is short by 4, which needs both 1 and 3 beside the target. With 9 beside the target, that side is already 14. In fact every target from 1 to 13 has exactly one way with 1, 3, 9: the 27 placements give 27 different totals, from −13 to 13.',
      extension: 'Find every target that 1, 3 and 8 balance in two ways.',
      connection: 'Exactly one way for each target is balanced ternary: every whole number is a sum of powers of 3, each taken once, not at all, or subtracted, in exactly one way.'
    },
    provenance: 'Week 30 grades 4–5 Problem 3 (can any target be balanced two ways with 1, 3, 9?) and grades 2–3 Problem 4, on a new target.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Two, three and nine',
    parameters: {mode: 'which', kit: [2, 3, 9], targets: range(10, 14)},
    objective: 'Balance every target from 10 to 14 that weights 2, 3 and 9 can, then press That’s all.',
    visibleObjective: 'Balance every target you can, then press That’s all.',
    idea: 'A kit can reach its whole total, 14, and still miss 13: 2 and 3 make 1, 2, 3 and 5, never 4.',
    prerequisites: 'Weight kits puzzles 7 and 8.',
    hints: ['Light every target you can first.', 'Every target here needs 9 on the other pan. What can 2 and 3 add or take away?', 'Light every target but 13, then press That’s all: 13 needs 4 from 2 and 3.'],
    parent: {
      notice: 'Whether your child expects every target up to the kit’s total to balance.',
      prompt: 'Why does 14 balance when 13 does not?',
      explanation: 'Targets from 10 up all need 9 on the other pan; 2 and 3 then add or take away 1 (3 − 2), 2, 3 or 5. That gives 10 = 9 + 3 − 2, 11 = 9 + 2, 12 = 9 + 3 and 14 = 9 + 2 + 3. Target 13 would need 2 and 3 to make 4, which they cannot.',
      extension: 'Change one weight so that the kit balances every target from 1 to 13.',
      connection: 'A new weight w fills a run around itself only as wide as what the lighter weights make. Because 2 and 3 skip 4, the kit skips 9 + 4 = 13.'
    },
    provenance: 'New instance for Week 30 grades 2–3 Problem 3 (the first target a kit cannot balance).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Twenty-two',
    parameters: {mode: 'balance', kit: [1, 3, 9, 27], targets: [22]},
    objective: 'Balance target 22 with weights 1, 3, 9 and 27.',
    visibleObjective: 'Balance the scale.',
    idea: '22 + 9 = 27 + 3 + 1: start with the heaviest weight and let each tilt say where the next weight goes.',
    prerequisites: 'Weight kits puzzles 7 and 9. Totals up to 40.',
    hints: ['Start with 27. Which way does the scale tip?', 'The other pan is 5 too heavy. Which weights make up 5?', 'Put 9 beside the target and 27, 3 and 1 opposite: 22 + 9 = 27 + 3 + 1.'],
    parent: {
      notice: 'Whether your child works from the heaviest weight down, using each tilt to place the next weight.',
      prompt: 'After the 27, which side was heavier, and by how much?',
      explanation: 'With 27 opposite, that side is 5 too heavy. Putting 9 beside the target makes the target side 4 too heavy. Then 3 and 1 opposite make 31 = 31. In balanced ternary, 22 = 27 − 9 + 3 + 1.',
      extension: 'Balance 14 and 32 with the same kit.',
      connection: 'Heaviest first always works with 1, 3, 9, 27: after each weight, what is left to fix is never more than the lighter weights together can make. That is how balanced ternary digits are found.'
    },
    provenance: 'New instance for Week 30 grades 4–5 Problem 6 (the kit 1, 3, 9 with a fourth weight).'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'A fourth weight',
    parameters: {mode: 'choose', fixed: [1, 3, 9], choices: range(14, 40), pick: 1, targets: [14, 22, 31, 40]},
    objective: 'Add one weight to 1, 3 and 9 so that targets 14, 22, 31 and 40 all balance, and balance them.',
    visibleObjective: 'Choose a fourth weight that balances every target.',
    idea: '1, 3 and 9 add or take away up to 13, so the new weight must be within 13 of both 14 and 40: only 27.',
    prerequisites: 'Weight kits puzzles 7 and 11.',
    hints: ['Use − and + to choose the new weight.', '1, 3 and 9 add or take away anything up to 13. Which weights are within 13 of 14 and of 40?', 'Choose 27: 14 = 27 − 13 and 40 = 27 + 13.'],
    parent: {
      notice: 'Whether your child reasons from the two end targets rather than trying weights one by one.',
      prompt: 'With 26, which target fails? With 28?',
      explanation: 'Every target from 14 up needs the new weight w on the other pan, and 1, 3 and 9 then shift it by any amount up to 13 either way. So w − 13 ≤ 14 and w + 13 ≥ 40, which forces w = 27. With 27, the kit 1, 3, 9, 27 balances every target from 1 to 40, each in exactly one way.',
      extension: 'With five weights, how far can the run go?',
      connection: 'Each new weight one more than twice the old reach gives runs of 1, 4, 13, 40, 121 = (3^m − 1)/2, and the 3^m placements of m weights show no kit can do better.'
    },
    provenance: 'Week 30 grades 2–3 Problem 6 and grades 4–5 Problem 6 (a fourth weight for 1, 3, 9), with four spot targets in place of the whole run to 40.'
  }
];

function answers(q) {
  if (q.mode === 'ways') return {ways: waysFor(q.kit, q.target)};
  if (q.mode === 'which') return {balance: q.targets.filter(t => reachable(q.kit, t)), cannot: q.targets.filter(t => !reachable(q.kit, t))};
  if (q.mode === 'choose') return {picks: pickAnswers(q)};
  return {ways: Object.fromEntries(q.targets.map(t => [t, waysFor(q.kit, t)]))};
}
const controlsFor = q => q.mode === 'choose' ? CONTROLS[q.choices.length > 10 ? 'stepper' : 'choose'] : q.mode === 'balance' ? CONTROLS[q.targets.length > 1 ? 'targets' : 'balance'] : CONTROLS[q.mode];
const common = {band: 'all', mechanic: 'kit', libraryFamily: 'weigh', familyTitle: 'Odd-pebble Balance', revision: 1, sourceDocument: 'docs/kits/README.md'};
export const puzzles = authored.map(item => {
  const q = item.parameters, solution = answers(q);
  if (q.mode === 'choose' && !solution.picks.length) throw new Error(`kits-${item.number}: no kit works`);
  if (q.mode === 'balance' && q.targets.some(t => !solution.ways[t].length)) throw new Error(`kits-${item.number}: a target cannot balance`);
  return {
    id: `kits-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    difficulty_level: item.difficulty_level,
    group: 'Weight kits',
    ...common,
    parameters: q,
    objective: item.objective,
    visibleObjective: item.visibleObjective ?? item.objective,
    instruction: item.objective,
    controls: controlsFor(q),
    rules: RULES[q.mode],
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['kits-week30', ...(/ternary|powers of 3|\(3\^m/i.test(item.parent.connection + item.parent.explanation) ? ['kits-ternary'] : [])]},
    solution,
    provenance: item.provenance
  };
});
const playground = {
  id: 'kits-playground',
  number: 0,
  title: 'Weight kits playground',
  difficulty_level: 'playground',
  ...common,
  band: 'playground',
  parameters: {mode: 'playground', fixed: [], choices: [1, 2, 3, 4, 5, 8, 9, 10, 27], pick: 4, start: [1, 3], targets: range(1, 40)},
  objective: 'Choose up to four weights and balance any target from 1 to 40.',
  visibleObjective: '',
  instruction: 'Choose up to four weights and balance any target from 1 to 40.',
  controls: CONTROLS.playground,
  rules: RULES.playground,
  idea: 'Free play with signed sums: which kits light the most targets, and which leave gaps?',
  prerequisites: 'None.',
  hints: ['Tap a target, then put weights on the pans until it balances.', 'A weight beside the target takes away.', 'Weights 1, 3, 9 and 27 light every target from 1 to 40.'],
  parent: {
    notice: 'Which kits your child tries, and whether they look for one that lights the whole row.',
    prompt: 'Which four weights light the most targets?',
    explanation: 'A target balances when it is a signed sum of the kit. Four weights have 81 placements, so at most 40 positive targets, and 1, 3, 9, 27 lights all of them, each in one way.',
    extension: 'Find a kit that lights every target from 1 to 13 with just three weights.',
    connection: 'Bachet’s weights problem (1612): 1, 3, 9 and 27 weigh every whole load to 40, which is balanced ternary.',
    sourceIds: ['kits-week30', 'kits-bachet', 'kits-ternary']
  },
  solution: null,
  provenance: 'Free play with the Week 30 balance.'
};
export const pack = {title: 'Odd-pebble Balance weight kits', version: 1, families: [family], sources, puzzles: [playground, ...puzzles]};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/kits/kits.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, JSON.stringify(p.parameters), JSON.stringify(p.solution));
}
