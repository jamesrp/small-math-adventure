// Authoring list for Footprint borders (worksheet Week 35, frieze symmetry).
// For each puzzle this computes, with the mechanic's own functions, the
// answers it claims: every border that solves a build (a search over every
// cell, or every arrangement of the starting Fs), the shortest slide and
// glide of a fixed border with their certificates, and the half-turn centres
// two crossing flips force. It checks them against the table in
// docs/friezes/README.md, plays the hints from a fresh board to a solve to
// record a solution witness, and writes dist/families/friezes/friezes.json.
// Run: node scripts/build-friezes.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as F from '../dist/families/friezes/friezes.js';

const N = null, A = 0, V = 1, H = 2, R = 3;
const E = P => [Array(P).fill(N), Array(P).fill(N)];
// A cell in letters, top row / bottom row, · for a gap.
export const show = cell => cell.map(row => row.map(v => (v === null ? '·' : 'AVHR'[v])).join('')).join('/');
const parse = text => text.split('/').map(row => [...row].map(ch => (ch === '·' ? null : 'AVHR'.indexOf(ch))));

const MATH = 'A border repeats its framed cell forever both ways. The blue copy matches when every F in it lands on an F facing exactly the same way.';
const SLIDE = 'Drag the copy to slide it, or use the arrow keys.';
const TOOL_WORDS = {flip: 'flip it over the middle line', mirror: 'flip it end to end', turn: 'turn it halfway round'};
const toolsSentence = tools => (tools.length === 1 ? `The button below will ${TOOL_WORDS[tools[0]]} where it is.` : `The buttons below ${tools.slice(0, -1).map(t => TOOL_WORDS[t]).join(', ')} or ${TOOL_WORDS[tools.at(-1)]}, where it is.`).replace('will flip it', 'flips it');
const EDIT = {
  free: 'Choose an F below, then tap a place to put it there; tap it again to take it away.',
  move: 'Tap an F in the cell to pick it up, then tap an empty place to put it there.'
};
const CLAIM = {
  cant: 'A crossed-out move must not match. Once the copy has tried it, press its Can’t, then tap an F and the place that move puts it, which has no F like it.',
  family: 'A crossed-out half-turn or flip across must fail everywhere. Once the copy has tried it, press its Can’t, tap an F, then the F it would become, which the row it lands in lacks.',
  shortest: 'Once the copy matches, press Shortest, then tap an F and the nearest F it could land on, as far as the copy went.',
  centre: 'Then press Turn here and tap the point a half-turn goes round.'
};
const RULES = [
  'The border repeats its cell forever both ways. Only the Fs count, not the strip’s ends or the lines.',
  'A match needs every F of the copy on an F facing the same way.',
  'A slide must move the copy. A glide is the flip over the middle line followed by a slide along it.',
  'The copy stays on the strip: a half-turn goes round a point of the middle line, and a flip across goes over a line straight across the strip.'
];
function controlsOf(q) {
  const parts = [MATH, SLIDE];
  if (q.tools.length) parts.push(toolsSentence(q.tools));
  if (q.edit !== 'none') parts.push(EDIT[q.edit]);
  if (q.goals.some(g => g.type === 'cant' && !F.isFamily(g))) parts.push(CLAIM.cant);
  if (q.goals.some(F.isFamily)) parts.push(CLAIM.family);
  if (q.goals.some(g => g.type === 'shortest')) parts.push(CLAIM.shortest);
  if (q.goals.some(g => g.type === 'centre')) parts.push(CLAIM.centre);
  return parts.join(' ');
}

const SEE = 'Tell the four Fs apart by the notch and the arrow.';
const PUZZLES = [
  {number: 1, level: 'easy', title: 'First slide',
    q: {cell: parse('AV·/··R'), edit: 'none', tools: [], goals: [{type: 'match', move: 'slide'}]},
    check: {slides: [3]},
    objective: 'Slide the copy along the border until it matches.', visible: 'Slide the copy until it matches.',
    idea: 'A slide matches only when every F lands on one facing the same way; here that first happens a whole cell along.',
    prereq: `${SEE} No reading or counting.`,
    hints: ['Watch the as-drawn F in the copy. Where is the next one like it in its row?', 'Slides of 1 or 2 places put that F on a gap or on a flipped-across F.', 'Slide the copy 3 places.'],
    parent: {notice: 'Whether your child watches one F (the as-drawn one, say) and slides until it reaches the next one like it, or slides until nothing is red.', prompt: 'Which F tells you fastest that a slide misses?', explanation: 'The F has no symmetry, so a matching slide must carry the as-drawn F in the top row onto another as-drawn F in the top row. The next one is 3 places along, and a 3-place slide carries every F onto its own repeat; slides of 1 or 2 places put it on the flipped-across F or a gap. A 3-place slide either way matches, and so does every multiple of 3.', extension: 'Make a border where a 1-place slide matches. (The same F in every place of a row.)', connection: 'The matching slides of a border are all the multiples of the shortest one, a subgroup of the translations (Gallian, Ch. 28).'},
    provenance: 'Week 35 K–1 Problem 1 (find slides that match and slides that do not), on a given border; the border is new.'},
  {number: 2, level: 'easy', title: 'How far?',
    q: {cell: parse('AVAV/·R·R'), edit: 'none', tools: [], goals: [{type: 'shortest', move: 'slide'}]},
    check: {shortest: {slide: 2}},
    objective: 'Find the shortest slide that matches, then press Shortest and tap an F and the nearest F like it that shows why.', visible: 'Find the shortest slide that matches.',
    idea: 'The cell drawn need not be the shortest repeat: the shortest slide is set by the nearest F like a given one.',
    prereq: `${SEE} Compare two distances by eye.`,
    hints: ['Find a slide that matches. How do you know no shorter slide does?', 'Every F must land on an F like it in its own row. How far is the nearest one like the as-drawn F?', 'Slide the copy 2 places, press Shortest, then tap an as-drawn F and the next one along.'],
    parent: {notice: 'Whether your child stops at the first match they see, 4 places along, where the copy’s frame lines up with the cell.', prompt: 'The cell is 4 places long. Must the shortest slide be 4?', explanation: 'The cell is 4 places, but the border repeats every 2: in the top row as-drawn and flipped-across Fs take turns, and a half-turned F sits below every other place. A slide must carry an as-drawn F onto another in its own row, and the nearest is 2 places away, so no shorter slide can match, and the 2-place slide carries every F onto one like it. That pair is the certificate. The 4-place slide matches too; claiming it is refused, because a nearer as-drawn F is 2 places away.', extension: 'Draw the same border with a cell of 2 places. Is it the same border?', connection: 'The guide’s warning: do not infer the shortest period from the block a child happened to draw. The matching slides are the multiples of the primitive period.'},
    provenance: 'Week 35 K–1 Problem 2, grades 2–3 Problem 1 and grades 4–5 Problem 1 (shortest matching slides), with the guide’s warning that a drawn block need not be the shortest repeat (p. 4); the border is new.'},
  {number: 3, level: 'easy', title: 'A glide',
    q: {cell: E(2), edit: 'free', tools: ['flip'], goals: [{type: 'match', move: 'glide'}, {type: 'cant', move: 'flip'}], witnesses: [parse('A·/·H')]},
    check: {count: 20},
    objective: 'Make a border that matches after a glide, a flip and a slide, but not after the flip alone, then press Can’t and show why the flip fails.', visible: 'Make a border that matches after a glide but not after the flip alone.',
    idea: 'A glide can match when neither of its parts, the flip or the slide, matches alone.',
    prereq: `${SEE} No reading: a grown-up can read the goal.`,
    hints: ['Put an F in each row, then flip the copy and slide it.', 'After the flip, an F in the top row lands in the bottom row, flipped down. Put that F in the bottom row, but not straight below.', 'One answer: an as-drawn F in the top row, place 1, and a flipped-down F in the bottom row, place 2. Flip and slide 1, then press Can’t and tap the as-drawn F and the gap below it.'],
    parent: {notice: 'Whether your child builds a flip first (an F straight above its flipped-down twin) and then has to move one of the pair.', prompt: 'After the flip, where does this F land? What would have to be there?', explanation: 'After the flip, an F in the top row lands straight below itself, flipped down. For a glide to match, the bottom row must hold that flipped-down F some places along; for the flip alone to fail, some F must have a gap or a different F straight across the middle line. With a 2-place cell, 20 borders work, such as the guide’s Border G: an as-drawn F above and a flipped-down F below, one place along. The certificate for Can’t is one F and the place straight across from it.', extension: 'Can a border match after the glide and after the flip? (Yes: put each flipped-down F straight below; then a flip and a slide of a whole cell is a glide.)', connection: 'Gallian’s frieze pattern II (Ch. 28, pp. 446–449): a glide reflection with no reflection, whose square is the smallest translation.'},
    provenance: 'Week 35 K–1 Problem 3 and grades 2–3 Problem 2 (a glide that works when the flip alone fails); the guide’s Border G is one answer.'},
  {number: 4, level: 'easy', title: 'Move the Fs',
    q: {cell: parse('A·/H·'), edit: 'move', tools: ['flip'], goals: [{type: 'match', move: 'glide'}, {type: 'cant', move: 'flip'}], witnesses: [parse('·A/H·')]},
    check: {count: 4},
    objective: 'Move Fs so that a glide matches but the flip alone doesn’t, then press Can’t and show why the flip fails.', visible: 'Move Fs so a glide matches but the flip alone doesn’t.',
    idea: 'Moving the bottom row half a cell along turns a flip border into a glide border: the old move breaks, the glide stays.',
    prereq: `${SEE} No reading: a grown-up can read the goal.`,
    hints: ['Flip the copy. Why does the flip alone match now?', 'The flipped-down F is straight below the as-drawn F. Move one of them a place along.', 'Move the as-drawn F to the top row, place 2. Flip and slide 1, then press Can’t.'],
    parent: {notice: 'Whether your child moves one F and tests again, or moves both and loses the glide.', prompt: 'What has to be straight below the as-drawn F for the flip to match?', explanation: 'The start is the guide’s Border H: the flip matches because the flipped-down F is straight below the as-drawn one. Moving either F one place along breaks the flip and keeps a glide: after the flip, the as-drawn F lands on a gap, and a flip with a 1-place slide carries it onto the flipped-down F. Exactly 4 arrangements work: the two Fs in different rows and different places.', extension: 'Put it back with one move. Which move did each change break, and which did it keep?', connection: 'The guide’s K–1 Problem 5 edit: shift the lower row of Border H half a period to get Border G.'},
    provenance: 'Week 35 K–1 Problem 5 (make a flip border, then change it so the flip fails) and grades 2–3 Problem 6, starting from the guide’s Border H.'},
  {number: 5, level: 'medium', title: 'A half-turn',
    q: {cell: E(2), edit: 'free', tools: ['flip', 'turn'], goals: [{type: 'match', move: 'turn'}, {type: 'cant', move: 'flip'}], witnesses: [parse('A·/·R')]},
    check: {count: 40},
    objective: 'Make a border that matches after a half-turn but not after the flip, then press Can’t and show why the flip fails.', visible: 'Make a border that matches after a half-turn but not after the flip.',
    idea: 'A half-turn carries each F to the other row, half-turned, so it needs different partners from the flip.',
    prereq: `${SEE} No reading: a grown-up can read the goal.`,
    hints: ['Put an F in each row, then turn the copy and slide the turned copy along.', 'Turned halfway, an F in the top row lands in the bottom row as a half-turned F.', 'One answer: an as-drawn F in the top row, place 1, and a half-turned F in the bottom row, place 2. Turn, try the flip alone, then press Can’t.'],
    parent: {notice: 'Whether your child expects the flip and the half-turn to need the same thing below, and what they see when the flip misses.', prompt: 'Turned halfway, which F does the as-drawn F become, and in which row?', explanation: 'A half-turn round a point of the middle line carries an F to the other row, half-turned, as far on the other side of the point. So the bottom row must hold the half-turned F of each F above (and the reverse), while the flip needs the flipped-down one straight below. The guide’s Border R, an as-drawn F above and a half-turned F below one place along, has the half-turn round the point midway between them and no flip. With a 2-place cell, 40 borders work.', extension: 'Find every point a half-turn of your border goes round. (For Border R, one every place along the middle line, here; half a cell apart.)', connection: 'Week 35 grades 4–5 Problem 5; the half-turn centres of Border R are spaced half a period apart (guide p. 3).'},
    provenance: 'Week 35 grades 2–3 Problem 5, K–1 Problem 6 and grades 4–5 Problem 5 (a half-turn that matches when the flip fails); the guide’s Border R is one answer.'},
  {number: 6, level: 'medium', title: 'Flip, no turn',
    q: {cell: E(2), edit: 'free', tools: ['flip', 'turn'], goals: [{type: 'match', move: 'flip'}, {type: 'cant', move: 'turn'}], witnesses: [parse('A·/H·')]},
    check: {count: 20},
    objective: 'Make a border that matches after the flip but never after a half-turn, round any point, then press Can’t and show an F a half-turn can’t place.', visible: 'Make a border that matches after the flip but never after a half-turn.',
    idea: 'One F whose half-turned form the other row never has rules out a half-turn round every point at once.',
    prereq: `${SEE} No reading: a grown-up can read the goal.`,
    hints: ['Make a border that matches after the flip first, then try turning the copy at a few places.', 'Turned halfway, an as-drawn F becomes a half-turned F in the other row. Can you keep every half-turned F out of that row?', 'One answer: an as-drawn F in the top row, place 1, and a flipped-down F below it. Turn the copy, then press Can’t, tap the as-drawn F, then the half-turned F.'],
    parent: {notice: 'Whether your child tests the turn round one or two points and stops, or looks for a reason that covers every point.', prompt: 'Wherever the turn goes round, which F would this one have to land on?', explanation: 'A half-turn round any point of the middle line carries an F to the other row, half-turned. So if the other row never holds the half-turned form of some F, no half-turn round any point can match: that F has nowhere to land. The guide’s Border H, an as-drawn F above a flipped-down one, has the flip and no half-turn: a turned as-drawn F needs a half-turned F in the bottom row, and there is none. One F and the form it turns into are the certificate. With a 2-place cell, 20 borders work, and every one has such an F.', extension: 'Can a border have the flip and the flip across, but no half-turn? (No: the two flips make a half-turn; see puzzle 10.)', connection: 'Week 35 grades 2–3 Problem 4, and the guide’s note that failure round one chosen centre does not rule out every half-turn.'},
    provenance: 'Week 35 grades 2–3 Problem 4 and K–1 Problem 6 (no half-turn round any point); the guide’s Border H is one answer.'},
  {number: 7, level: 'medium', title: 'Slide and glide',
    q: {cell: parse('AV··/··HR'), edit: 'none', tools: ['flip'], goals: [{type: 'shortest', move: 'slide'}, {type: 'shortest', move: 'glide'}]},
    check: {shortest: {slide: 4, glide: 2}},
    objective: 'Find the shortest slide and the shortest glide that match. For each, press Shortest and tap an F and the nearest F of the form it needs.', visible: 'Find the shortest slide and the shortest glide.',
    idea: 'A glide done twice is a slide, so when the flip alone fails the shortest glide is half the shortest slide.',
    prereq: `${SEE} Compare distances by eye.`,
    hints: ['Find a slide that matches, then a glide. Which F has the nearest F like it in its row?', 'After the flip, the as-drawn F must land on a flipped-down F in the bottom row. How far is the nearest one?', 'Slide 4 and tap the as-drawn F and the next one; then flip, slide 2, and tap the as-drawn F and the flipped-down F 2 places along.'],
    parent: {notice: 'Whether your child compares the glide with the slide, and guesses the glide from the slide before sliding the flipped copy.', prompt: 'What happens if you do the glide twice?', explanation: 'The cell repeats every 4 places and no shorter slide matches: the as-drawn F has no other as-drawn F nearer than 4 places in its row. Flipped, that F needs a flipped-down F in the bottom row, and the nearest is 2 places along; the 2-place glide carries every F onto one like it. The glide done twice is the 4-place slide. In general, when the flip alone fails, the shortest glide is exactly half the shortest slide.', extension: 'Could a border have a shortest glide of 3 and a shortest slide of 4? (No: two 3-place glides make a 6-place slide, and 6 is not a multiple of 4.)', connection: 'The guide’s shortest glide theorem (p. 6): every glide displacement is (k + ½)P when the bare flip fails; Gallian’s pattern II.'},
    provenance: 'Week 35 grades 4–5 Problem 2 (shortest slide and shortest glide) and grades 2–3 Problem 3 (compare them); the border is new.'},
  {number: 8, level: 'medium', title: 'Turn only',
    q: {cell: E(2), edit: 'free', tools: ['flip', 'mirror', 'turn'], goals: [{type: 'match', move: 'turn'}, {type: 'cant', move: 'flip'}, {type: 'cant', move: 'mirror'}], witnesses: [parse('A·/·R')]},
    check: {count: 36},
    objective: 'Make a border that matches after a half-turn, but not after the flip over the middle line or a flip across anywhere, then show why each flip fails.', visible: 'Make a border with a half-turn but no flip over the middle or across.',
    idea: 'A flip across keeps an F in its row, flipped across; one F whose flipped-across form its row lacks rules out every such line at once.',
    prereq: `${SEE} A grown-up can read the goal.`,
    hints: ['Make a border that matches after a half-turn first, then try both flips.', 'Flipped across, an F stays in its row as its flipped-across form. Keep that form out of its row.', 'One answer: an as-drawn F in the top row, place 1, and a half-turned F in the bottom row, place 2.'],
    parent: {notice: 'Whether your child tries Flip across at a few places and then looks for one reason that covers them all.', prompt: 'Wherever the line goes, what would this F become, and is there one in its row?', explanation: 'The flip needs each F’s flipped-down form straight across the middle line; a flip across any line straight across the strip keeps each F in its row, flipped across; a half-turn needs it in the other row, half-turned. The guide’s Border R (an as-drawn F above and a half-turned F below, one place along) has the half-turn and neither flip: the as-drawn F has a gap straight below it, and its row has no flipped-across F at all, which rules out every line across at once. With a 2-place cell, 36 borders work.', extension: 'Change one F so that the half-turn fails but both flips still fail.', connection: 'Week 35 grades 4–5 Problem 5 and the guide: at an upper as-drawn F, either kind of flip needs a missing mirror form, which rules out every perpendicular axis, not only the one through a displayed centre.'},
    provenance: 'Week 35 grades 4–5 Problem 5 (a half-turn, no flip over the middle line, no flip across a perpendicular line); the guide’s Border R is one answer.'},
  {number: 9, level: 'hard', title: 'Break a slide',
    q: {cell: parse('A·A·/·H·H'), edit: 'move', tools: ['flip'], goals: [{type: 'match', move: 'glide'}, {type: 'cant', move: 'flip'}, {type: 'cant', move: 'slide', by: 2}], witnesses: [parse('AA··/··HH')]},
    check: {count: 20},
    objective: 'Move Fs so that a glide matches but neither the flip alone nor the 2-place slide does, then press each Can’t and show why.', visible: 'Move Fs so a glide matches but the flip and the 2-place slide don’t.',
    idea: 'Breaking a slide changes the glide too: a glide done twice is a slide, so with a 4-place repeat the glide must be 2 places.',
    prereq: `${SEE} Count up to 4 places. A grown-up can read the goal.`,
    hints: ['Slide the copy 2 places, then flip it and slide it. Which moves match now?', 'To break the 2-place slide, the two as-drawn Fs must not be 2 places apart. Where must the flipped-down Fs go then?', 'One answer: as-drawn Fs in the top row, places 1 and 2, and flipped-down Fs in the bottom row, places 3 and 4.'],
    parent: {notice: 'Whether your child breaks the slide first, finds the glide broken too, and moves the flipped-down Fs to bring it back.', prompt: 'If the glide goes 2 places, where must the flipped-down F for this as-drawn F be?', explanation: 'The start is the guide’s Border G drawn with a 4-place cell: it repeats every 2 places, so the 2-place slide matches, and so does a 1-place glide. To break the 2-place slide, the four Fs must stop repeating every 2 places while the cell still repeats every 4. A glide done twice is a slide, so the glide must now be 2 places (twice 2 is 4); a 1-place glide would bring back the 2-place slide. For example, as-drawn Fs at places 1 and 2 above and flipped-down Fs at places 3 and 4 below. 20 arrangements work. The certificate for the slide is one F and the place 2 along where it lands.', extension: 'Can you break the 2-place slide but keep a 1-place glide? (No: two 1-place glides make the 2-place slide.)', connection: 'Week 35 grades 2–3 Problem 6, using its “larger repeating part”; the guide’s edit of Border T breaks an old slide the same way.'},
    provenance: 'Week 35 grades 2–3 Problem 6 (move footprints so an old matching move fails but the border still repeats, with a larger repeating part), starting from the guide’s Border G in a doubled cell.'},
  {number: 10, level: 'hard', title: 'Two crossing flips',
    q: {cell: E(4), edit: 'free', crossing: true, tools: ['flip', 'mirror'], goals: [{type: 'match', move: 'flip'}, {type: 'match', move: 'mirror', line: true}, {type: 'centre'}], witnesses: [parse('·VA·/·RH·')]},
    check: {count: 24, centre: 4},
    objective: 'Make a border that matches after the flip over the middle line and after the flip across the crossing line, then tap the point a half-turn goes round.', visible: 'Make both flips match, then show where a half-turn goes round.',
    idea: 'Two flips over crossing lines at right angles make the half-turn round their crossing, so it matches without being tried.',
    prereq: `${SEE} Picture a turn without trying it. A grown-up can read the goal.`,
    hints: ['Make a border that matches after the flip over the middle line first.', 'Flipped across the crossing line, each F lands in its row, flipped across, as far on the other side. Build the Fs in fours.', 'One answer: in the top row a flipped-across F in place 2 and an as-drawn F in place 3, and below them a half-turned F and a flipped-down F. Then tap where the two lines cross.'],
    parent: {notice: 'Whether your child taps the crossing straight away, or first looks for a point where a turned copy might fit.', prompt: 'Flip this F over the middle line, then across the crossing line. Where does it end up, and which way is it facing?', explanation: 'The flip over the middle line takes (x, y) to (x, −y), and the flip across the crossing line takes (x, y) to (−x, y), measuring from the crossing. One after the other they take (x, y) to (−x, −y): the half-turn round the crossing. So any border with both flips matches after that half-turn, untried. Every answer has its Fs in fours like the guide’s Border E: an F, its flipped-across twin opposite the crossing line, and both flipped down below. Other centres work too, one every half of the shortest slide along the middle line, because a half-turn followed by a slide is another half-turn.', extension: 'Which other points does a half-turn go round? (Here, every 2 places along from the crossing; every place for a border that repeats every 2.)', connection: 'Reflections in two perpendicular lines compose to the half-turn about their crossing; Gallian’s pattern VII has both reflections and hence the half-turns.'},
    provenance: 'Week 35 grades 4–5 Problem 4 (flips over two crossing lines, and the motions they force), with its printed crossing line; the guide’s Border E is the model.'},
  {number: 11, level: 'hard', title: 'A longer border',
    q: {cell: parse('A·A·V·/·R·H·H'), edit: 'none', tools: ['flip'], goals: [{type: 'shortest', move: 'slide'}, {type: 'shortest', move: 'glide'}]},
    check: {shortest: {slide: 6, glide: 3}},
    objective: 'Find the shortest slide and the shortest glide that match. For each, press Shortest and tap an F and the nearest F of the form it needs.', visible: 'Find the shortest slide and the shortest glide.',
    idea: 'Two Fs alike and close together don’t make a short slide: the F with no near twin decides it.',
    prereq: `${SEE} Compare distances by eye.`,
    hints: ['Find a slide and a glide that match. How do you know no shorter ones do?', 'Two as-drawn Fs in the top row are 2 places apart, but the 2-place slide misses. Which F has no F like it nearby?', 'The flipped-across F is alone in its row: the next is 6 places along. Flipped, it needs a half-turned F in the bottom row, and the nearest is 3 places along.'],
    parent: {notice: 'Whether your child claims a 2-place slide from the two as-drawn Fs, and then looks for the F that breaks it.', prompt: 'Which F is alone in its row?', explanation: 'The two as-drawn Fs in the top row are 2 places apart, but the 2-place slide carries the second onto the flipped-across F, so it misses; the border repeats only every 6 places. The flipped-across F shows it: it is the only one in its row, and the next is 6 places along. Flipped, that F needs a half-turned F in the bottom row, and the nearest is 3 places along; the 3-place glide matches, half of 6. The as-drawn Fs can’t certify either answer: each has another as-drawn F 2 places away, and a flipped-down F 1 place away.', extension: 'Change two Fs so the border repeats every 2 places. Which glide matches then? (Make the top row all as-drawn and the bottom all flipped-down: a 1-place glide.)', connection: 'Week 35 grades 4–5 Problem 1: explain why a smaller slide cannot match, by tracking one F whose nearest twin is far away.'},
    provenance: 'Week 35 grades 4–5 Problems 1 and 2 (why no smaller slide matches; shortest slide and glide); the border is new.'}
];

const sources = ['friezes-week35', 'friezes-card35', 'friezes-gallian'];
const id = n => `friezes-${String(n).padStart(2, '0')}`;
const goalText = g => (g.type === 'match' ? `${g.move}${g.line ? ' (crossing line)' : ''}` : g.type === 'cant' ? `no ${g.move}${g.by ? ` ${g.by}` : ''}` : g.type === 'shortest' ? `shortest ${g.move}` : 'centre');

// Plays the hints from a fresh board to a solve, as Apply hint would.
export function playHints(p, limit = 60) {
  const m = F.friezeMechanics.friezes;
  let b = m.fresh(p);
  const moves = [];
  for (let k = 0; k < limit && !m.solved(p, b); k++) {
    const h = m.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: a hint at step ${k}`);
    assert.ok(h.text, `${p.id}: hint words at step ${k}`);
    const next = m.move(p, b, h.action);
    assert.ok(next, `${p.id}: hint ${JSON.stringify(h.action)} is legal`);
    moves.push(h.action);
    b = next;
  }
  assert.ok(m.solved(p, b), `${p.id}: the hints solve it`);
  return {moves, board: b};
}

const out = PUZZLES.map(item => {
  const label = id(item.number);
  const q = {mode: 'puzzle', ...item.q};
  const p = {id: label, parameters: q};
  const P = F.periodOf(q.cell);
  assert.ok(F.PERIODS.includes(P), `${label}: the cell length`);
  const solution = {};
  if (q.edit === 'none') {
    assert.ok(F.answers(q, q.cell), `${label}: the border answers its goals`);
    if (item.check.slides) assert.deepEqual(F.copyStates(P).filter(g => F.kindOf(g) === 'slide' && F.fits(q.cell, g)).map(g => g.u).filter(u => u > 0), item.check.slides, `${label}: the matching slides`);
    for (const [move, d] of Object.entries(item.check.shortest || {})) {
      assert.equal(F.shortestOf(q.cell, move), d, `${label}: shortest ${move}`);
      assert.ok(F.certificates(q.cell, {type: 'shortest', move}, d).length > 0, `${label}: shortest ${move} can be shown`);
      solution[move] = d;
    }
  } else {
    const list = F.answerCells(p);
    assert.equal(list.length, item.check.count, `${label}: how many borders work`);
    for (const w of q.witnesses) assert.ok(list.some(c => show(c) === show(w)), `${label}: witness ${show(w)} works`);
    assert.ok(!list.some(c => show(c) === show(q.cell)), `${label}: the start is not an answer`);
    solution.borders = list.length;
    if (item.check.centre !== undefined) assert.ok(list.every(c => F.centres(c).includes(item.check.centre)), `${label}: every answer turns round the crossing`);
  }
  const played = playHints(p);
  solution.witness = show(played.board.cell);
  solution.moves = played.moves;
  return {
    id: label, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Footprint borders', mechanic: 'friezes', band: 'all', revision: 1, sourceDocument: 'docs/friezes/README.md',
    parameters: q,
    objective: item.objective, visibleObjective: item.visible, instruction: item.objective,
    controls: controlsOf(q), rules: RULES,
    idea: item.idea, prerequisites: item.prereq, hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'friezes-playground', number: 0, title: 'Footprint borders playground', difficulty_level: 'playground', familyTitle: 'Footprint borders', mechanic: 'friezes', band: 'playground', revision: 1, sourceDocument: 'docs/friezes/README.md',
  parameters: {mode: 'playground', start: 3},
  objective: 'Make a border, and try every move of the copy on it.', visibleObjective: '',
  instruction: 'Make a border, and try every move of the copy on it.',
  controls: `${MATH} ${SLIDE} ${toolsSentence(['flip', 'mirror', 'turn'])} ${EDIT.free} The numbers set how many places the cell has.`,
  rules: RULES,
  idea: 'Free play: build a border in a cell of 2 to 6 places and test slides, the flip, glides, flips across and half-turns.',
  prerequisites: 'None. A grown-up can suggest what to try.',
  hints: ['Put one as-drawn F in the cell and slide the copy. Which slides match?', 'Add a flipped-down F straight below it, then flip the copy.', 'Move the flipped-down F one place along. Which moves match now?'],
  parent: {notice: 'Whether your child predicts which F the copy will show before pressing a button, and checks one F at a time.', prompt: 'Which moves match this border, and which F tells you that one doesn’t?', explanation: 'A move of the copy that keeps the strip on itself is a slide, the flip over the middle line, a glide (the flip and a slide), a flip across a line straight across the strip, or a half-turn round a point of the middle line. Since the F has no symmetry, one F decides each move: it must land on an F of the form the move makes it. The guide’s witnesses (p. 3) are good borders to build: T (slides only), G (a glide, no flip), H (the flip, no half-turn), R (half-turns, no flips) and E (both flips and the half-turn).', extension: 'Make a border with every kind of move. How few Fs does it need?', connection: 'There are seven kinds of frieze, by which of these moves match (Gallian, Ch. 28); the puzzles do not need the list.', sourceIds: sources},
  provenance: 'Week 35 throughout, and K–1 Problem 7 (trade borders and find the moves that match).'
};

const json = {
  title: 'Footprint borders',
  version: 1,
  families: [{id: 'friezes', title: 'Footprint borders', mathematics: 'A border is one cell of footprints repeated forever along a strip, each footprint a notched F in one of four forms: as drawn, flipped across, flipped down and half-turned. A move of the copy that keeps the strip on itself is a slide, the flip over the middle line, a glide (the flip and a slide), a flip across a line straight across the strip, or a half-turn round a point of the middle line, and it matches when every F lands on an F of the form the move makes it. Since the F has no symmetry, where one F lands decides a move, so one F that lands on a gap or a different F rules a move out, and one F whose turned or flipped-across form a row never has rules out every half-turn or every flip across at once. A glide done twice is a slide, so when the flip alone fails the shortest glide is half the shortest slide; two flips over perpendicular lines make the half-turn round their crossing. These are the moves of frieze groups, which come in seven kinds.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'friezes-week35', title: 'Bellingham Math Circle — Week 35: Footprint borders (K–1, grades 2–3 and grades 4–5 packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-35', kind: 'local curriculum'},
    {id: 'friezes-card35', title: 'Week 35 review card (revise; App fit: one cell tiled endlessly, a translucent copy, certificates for no half-turn, no flip and shortest)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-35.md', kind: 'local curriculum'},
    {id: 'friezes-gallian', title: 'Joseph A. Gallian — Contemporary Abstract Algebra, Chapter 28: Frieze Groups and Crystallographic Groups, pp. 446–449 (pattern II’s glide, pattern VII’s perpendicular reflections)', url: 'https://www.d.umn.edu/~jgallian/Chapter28.pdf', kind: 'textbook chapter'}
  ],
  puzzles: [playground, ...out]
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await writeFile(new URL('../dist/families/friezes/friezes.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
  console.log(out.map(p => `${p.id} ${p.difficulty_level.padEnd(6)} ${p.parameters.goals.map(goalText).join(', ').padEnd(40)} ${JSON.stringify({...p.solution, moves: p.solution.moves.length})}`).join('\n'));
}
