// Authoring list for Mirror Couriers (base mechanic `billiard`), reworked for
// Week 9 of the math circle (bouncing paths). Computes every puzzle's answers
// and witness with the mechanic's own geometry (dist/couriers.js), checks them
// against the table in docs/couriers/README.md, and writes the billiard
// family of docs/puzzle-expansion/motion.json without touching its other
// families. Then run scripts/import-expansion.mjs to rebuild dist/puzzles.json.
// Run: node scripts/build-couriers.mjs
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { billiard, roomsFor, reachable, lineOf, aimAnswers, crossAnswer, everyAnswer, launchOutcome, cornerName } from '../dist/couriers.js';

const file = new URL('../docs/puzzle-expansion/motion.json', import.meta.url);

const W9 = 'lowell-math-circle-year-2/source/week-09';
const SOURCES = [
  { id: 'B-K', path: `${W9}/src/k-1.tex`, section: 'K–1 Problem 5 (draw a table so the ball stops at the circled corner), Problem 6 (back to the dot) and Problem 7 (fold a straight line)', contribution: 'Design a room for a corner; the start corner is never reached; folding the unfolded line.' },
  { id: 'B-M', path: `${W9}/src/grades-2-3.tex`, section: 'Grades 2–3 Problem 4 (four targets, one impossible), Problem 6 (every one-bounce table up to 6 by 6), Problem 7 (sheets of copies) and Problem 8 (back to the start)', contribution: 'Room design with an impossible target, find every, the unfolded sheet.' },
  { id: 'B-U', path: `${W9}/src/grades-4-5.tex`, section: 'Grades 4–5 Problem 3 (the 2 by 3 sheet), Problem 4 (the 4 by 3 sheet), Problem 5 (6 by 10), Problem 6 (four targets, one impossible) and Problem 7 (never home)', contribution: 'First crossing on the sheet, reduced sides, parity bans, the halfway argument.' },
  { id: 'B-F', path: `${W9}/guide-src/facilitator.tex`, section: 'Facilitator guide, “Table by table” (answers for 2–3 P4, P6 and 4–5 P3, P4, P6, P7) and “The mathematics behind the week”', contribution: 'The rule (q across, p up for a p by q table in lowest terms), the parity of a top-right stop, the halfway crossing.' },
  { id: 'B-R', path: 'plans/review/week-09.md', section: 'App fit and the Decision of October 10, 2026', contribution: 'Shape the room with one impossible target per set, every one-bounce room, send it home, aim in the sheet; the path draws on Launch.' }
];

const RULES = [
  'The ball starts in the bottom-left corner and rolls in a straight line: one square right for every square up, unless the arrow shows a steeper start.',
  'At a wall it bounces like light in a mirror. A side wall turns it back left or right; the top or bottom turns it back down or up. Each wall it hits is one bounce.',
  'It stops at the first corner it reaches. Reaching the corner is not a bounce, and crossing its own path does nothing.',
  'The path is drawn when you Launch, not while you change the room or the aim.',
  'Can’t is a claim. After a launch it opens copies of the room, each copy corner marked with the room corner it folds onto; tap the corners that show no room works. A wrong claim gets one short answer.',
  'In a find-every puzzle, Keep the rooms you think work and press That’s all; the whole shelf is judged at once.'
];

const FAMILY = {
  title: 'Mirror Couriers',
  child_prompt: 'The ball rolls straight from the bottom-left corner, bounces off each wall like light in a mirror and stops at the first corner it reaches. Shape the room or aim the ball to send it where it should go.',
  rules: RULES,
  mathematics: 'Unfold the room into mirror copies and the bouncing path becomes a straight line. From the bottom-left corner of a w × h room, going one square right per square up, the line first meets a copy corner q = h/g rooms across and p = w/g rooms up, where g = gcd(w, h). That corner folds onto the right wall exactly when q is odd and onto the top exactly when p is odd, and the ball has bounced p + q − 2 times. So a top-right stop takes an even number of bounces, a top-left or bottom-right stop an odd number, a single bounce means one side is twice the other, and the start corner is never reached: every copy of it is an even number of rooms across and up, and halfway there is a copy corner the ball reaches first. A steeper start (rise up for run across) only rescales: q = run·h/g′ and p = rise·w/g′ with g′ = gcd(run·h, rise·w). This is the unfolding used for billiards in rectangles and on the flat torus; the app makes no claim about irrational directions or ergodicity.',
  prerequisites: 'Entry: drag a corner, press Launch and watch where the ball stops; no reading needed beyond the goal line. Then count bounces, compare rooms that stop at the same corner, and read the copies of a room as a map. The corner-map claims ask a child to find every copy corner a given number of bounces away (across + up − 2), and the hardest rooms combine a steeper start with the room’s shape; these suit children comfortable with doubling and with odd and even, often grades 2–5 or beyond.',
  natural_variation: 'Vary the target corner and bounce count, the grid a room may fill, and the starting direction; aim by tapping a copy corner in the sheet of copies; ask for every room with a given bounce count; include one impossible target per set, answered with Can’t and a tapped certificate on the corner map.',
  guardrail: 'Rooms are whole rectangles with four mirror walls and the ball starts at the bottom-left corner. No obstacles, missing walls or one-off exceptions. The path appears only after Launch, so design is not a scan. Keep the first-corner stop exact and never confuse the room’s slope with the slope in the square grid.',
  depth_assessment: 'Shaping the room asks for the inverse of the rule; an impossible target asks for a reason, given by pointing at the copy corners a bounce count allows; find-every asks for a complete list and a reason it is complete; aiming in the sheet makes the unfolding itself the move. Once the reduced-ratio rule is known, new targets alone become routine; the steeper starts and the larger maps keep the hard set from being repetition.',
  sources: SOURCES
};

// The puzzles. `old` says what the revision-1 puzzle of the same id was; the
// reworked one keeps its room, target or aim, so an old answer still answers.
const shape = (cols, rows, target, map, extra = {}) => ({ mode: 'shape', cols, rows, start: [1, 1], target, map, ...extra });
const PUZZLES = [
  { id: 'billiard-01', revision: 2, level: 'easy', title: 'To the top left',
    parameters: shape(4, 4, { corner: 'top-left' }, [4, 4]),
    hint: 'Launch a room and watch where the ball stops. Change one side, then Launch again.',
    insight: 'A room twice as tall as it is wide sends the ball to the top left after one bounce; other rooms reach the top left too.',
    step: 'The first room-design puzzle: drag, Launch, compare. Any room that stops at the top left solves it.',
    prerequisites: 'Drag a corner; tell the four corners apart.',
    refs: ['B-K', 'B-R'], provenance: 'Week 9 K–1 Problem 5, top-left picture, on a 4 by 4 grid. Revision 1 asked for a prediction in the 2 by 4 room; that room is one answer here.' },
  { id: 'billiard-02', revision: 2, level: 'easy', title: 'To the bottom right',
    parameters: shape(4, 4, { corner: 'bottom-right' }, [4, 4]),
    hint: 'Try a room that is wider than it is tall.',
    insight: 'The ball can come back down: it stops at the bottom right when the room, in lowest terms, is an odd number of squares high and an even number wide.',
    step: 'Same move as the first puzzle, a corner that needs a less obvious room.',
    prerequisites: 'Drag a corner; tell the four corners apart.',
    refs: ['B-K', 'B-R'], provenance: 'Week 9 K–1 Problem 5, bottom-right picture, on a 4 by 4 grid. Revision 1 asked for a prediction in the 2 by 3 room; that room is one answer here. The road’s K–1 Mirror room.' },
  { id: 'billiard-03', revision: 2, level: 'medium', title: 'Six bounces',
    parameters: shape(10, 10, { corner: 'top-right', bounces: 6 }, [7, 7]),
    hint: 'Find a smaller room first. What happens when you double both sides?',
    insight: 'A room behaves like its sides divided by their common factor: 6 by 10 does what 3 by 5 does. Rooms in lowest terms p wide and q high with p + q = 8, both odd, are the answers.',
    step: 'A larger grid and an exact bounce count; doubling a room keeps its corner and bounces.',
    prerequisites: 'Count bounces; notice a room and its double behave alike.',
    refs: ['B-U', 'B-F'], provenance: 'Week 9 4–5 Problem 5 (the 6 by 10 table stops at the top right after 6 bounces), turned into design on a 10 by 10 grid. Revision 1 asked for that prediction; 6 by 10 is one answer here.' },
  { id: 'billiard-04', revision: 2, level: 'medium', title: 'Two bounces',
    parameters: shape(6, 6, { corner: 'top-right', bounces: 2 }, [4, 4]),
    hint: 'Launch a long, thin room and count its bounces. Then make it longer or shorter.',
    insight: 'Top right after two bounces needs one side three times the other.',
    step: 'An exact bounce count on the 6 by 6 grid of the worksheet.',
    prerequisites: 'Count bounces up to a few.',
    refs: ['B-M', 'B-F', 'B-R'], provenance: 'Week 9 2–3 Problem 4 (design a table for a written target), target new. Revision 1 fixed the height at 6 and asked for the width; its answer, 2 by 6, answers here. The road’s 2–3 Mirror room.' },
  { id: 'billiard-05', revision: 2, level: 'medium', title: 'Aim in a square room',
    parameters: { mode: 'aim', width: 1, height: 1, sheet: [4, 4], target: { corner: 'bottom-right', bounces: 3 } },
    hint: 'Aim at a crossing and Launch. Which copy corners fold onto the bottom right?',
    insight: 'Aiming at the copy corner a rooms across and b up (a and b with no common factor) stops the ball there after a + b − 2 bounces; it folds onto the right when a is odd and the bottom when b is even.',
    step: 'The aim replaces the rise and run menus: tap a crossing of the sheet, Launch, and the line folds into the path.',
    prerequisites: 'Count rooms across and up on the sheet.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Revision 1 asked for rise and run from menus in a 1 by 1 room (bottom right after 3); the card’s App fit replaces those menus by tapping a copy corner (4–5 Problems 3–4 sheet). Both old answers, 2 up for 3 across and 4 up for 1 across, are crossings here. The road’s 4–5 Mirror room.' },
  { id: 'billiard-06', revision: 2, level: 'hard', title: 'Aim in a wide room',
    parameters: { mode: 'aim', width: 3, height: 2, sheet: [6, 6], target: { corner: 'top-right', bounces: 4 } },
    hint: 'The room is not a square, so the line to a crossing is not at 45°. Count rooms, not squares.',
    insight: 'On the sheet only the rooms count: top right after four bounces is a copy corner 1 across and 5 up, or 5 across and 1 up, whatever the room’s shape.',
    step: 'A rectangular room: the aim in squares differs from the aim in rooms.',
    prerequisites: 'Count rooms across and up; odd and even.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Revision 1 asked for rise and run in a 3 by 2 room (top right after 4) from menus; now aimed by tapping a crossing (card App fit). Its answer, 10 up for 3 across, is the crossing 1 across and 5 up.' },
  { id: 'billiard-07', revision: 2, level: 'hard', title: 'A steeper ball',
    parameters: shape(6, 6, { corner: 'bottom-right', bounces: 9 }, [10, 10], { rise: 2, run: 1 }),
    hint: 'The ball now goes two squares up for every square across. Try a room wider than it is tall.',
    insight: 'A steeper start rescales one side: with 2 up for 1 across, a w by h room acts like a 2w by h room at 45°.',
    step: 'A steeper launch: the 45° rule no longer applies directly.',
    prerequisites: 'Count bounces up to ten; compare a room with its double.',
    refs: ['B-F'], provenance: 'New in the app: no worksheet problem uses a steeper start. Revision 1 asked for a prediction in the 4 by 3 room with this start; that room is one answer here.' },
  { id: 'billiard-08', revision: 2, level: 'medium', title: 'Three bounces',
    parameters: shape(6, 6, { corner: 'bottom-right', bounces: 3 }, [5, 5]),
    hint: 'Count the bounces of a few rooms that stop at the bottom right.',
    insight: 'Bottom right after three bounces: rooms that in lowest terms are 4 by 1 or 2 by 3, and their doubles.',
    step: 'Two different room shapes give the same target; a doubled room does too.',
    prerequisites: 'Count bounces; tell corners apart.',
    refs: ['B-M', 'B-F'], provenance: 'Week 9 2–3 Problem 4 (design for a written target); target new. Revision 1 fixed the height at 6 and asked for the width; its answer, 4 by 6, answers here.' },
  { id: 'billiard-09', revision: 2, level: 'hard', title: 'Aim in a tall room',
    parameters: { mode: 'aim', width: 2, height: 3, sheet: [6, 6], target: { corner: 'top-right', bounces: 6 } },
    hint: 'A top-right copy corner is an odd number of rooms across and an odd number up.',
    insight: 'Top right after six bounces: copy corners 3 across and 5 up, or 5 across and 3 up.',
    step: 'More bounces, two answers on the sheet.',
    prerequisites: 'Odd and even; count rooms on the sheet.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Revision 1 asked for rise and run in a 2 by 3 room (top right after 6) from menus; now aimed by tapping a crossing (card App fit). Its answers are the crossings 3 across and 5 up, and 5 across and 3 up.' },
  { id: 'billiard-10', revision: 2, level: 'hard', title: 'Three up, two across',
    parameters: shape(8, 8, { corner: 'top-left', bounces: 5 }, [6, 6], { rise: 3, run: 2 }),
    hint: 'Try rooms twice as tall as they are wide, and count the bounces.',
    insight: 'With 3 up for 2 across, a w by h room acts like a 3w by 2h room at 45°; top left after five bounces comes from 5 by 3 and from every room twice as tall as wide.',
    step: 'A steeper start and a bounce count: both the room’s shape and the direction matter.',
    prerequisites: 'Count bounces; compare rooms with a common shape.',
    refs: ['B-F'], provenance: 'New in the app. Revision 1 fixed the height at 8 and asked for the width with this start; its answer, 4 by 8, answers here.' },
  { id: 'billiard-11', revision: 2, level: 'hard', title: 'Eight bounces',
    parameters: { mode: 'aim', width: 4, height: 3, sheet: [7, 7], target: { corner: 'top-right', bounces: 8 } },
    hint: 'Aim at a crossing and Launch. Does the ball always reach the crossing you aimed at?',
    insight: 'The ball stops at the first copy corner on its line: aiming 5 across and 5 up stops it 1 across and 1 up. The answers are 3 across and 7 up, and 7 across and 3 up.',
    step: 'A copy corner that is not the first on its line is a trap.',
    prerequisites: 'Odd and even; notice a line can pass an earlier crossing.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Revision 1 asked for rise and run in a 4 by 3 room (top right after 8) from menus; now aimed by tapping a crossing (card App fit). Its answer 7 up for 4 across is the crossing 3 across and 7 up.' },
  { id: 'billiard-12', revision: 2, level: 'hard', title: 'Nine bounces',
    parameters: { mode: 'aim', width: 3, height: 4, sheet: [7, 7], target: { corner: 'bottom-right', bounces: 9 } },
    hint: 'A bottom-right copy corner is an odd number of rooms across and an even number up.',
    insight: 'Bottom right after nine bounces: copy corners across + up = 11 with across odd, such as 5 across and 6 up.',
    step: 'The largest sheet; several crossings fold onto the right corner with the wrong count.',
    prerequisites: 'Odd and even; add across and up.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Revision 1 asked for rise and run in a 3 by 4 room (bottom right after 9) from menus; now aimed by tapping a crossing (card App fit). Its answer, 8 up for 5 across, is the crossing 5 across and 6 up.' },
  { id: 'billiard-13', level: 'easy', title: 'The first crossing',
    parameters: { mode: 'cross', width: 2, height: 3, sheet: [4, 3] },
    hint: 'Follow the line. It crosses many walls; find where it meets two at once.',
    insight: 'The ball’s straight line through the copies stops where it first meets a corner of the copies: 3 rooms across and 2 up for the 2 by 3 room. The rooms it passed fold into the path.',
    step: 'The unfolding as a move: a crossing of one wall is not a corner.',
    prerequisites: 'Follow a straight line on a grid.',
    refs: ['B-U', 'B-M', 'B-R'], provenance: 'Week 9 4–5 Problem 3: the 2 by 3 table on a sheet of 4 by 3 copies; the line first meets a crossing 3 across and 2 up (facilitator answer). The fold replaces cutting and folding paper.' },
  { id: 'billiard-14', level: 'medium', title: 'A 4 by 3 sheet',
    parameters: { mode: 'cross', width: 4, height: 3, sheet: [4, 5] },
    hint: 'Count the squares along the line until it reaches a corner of a copy.',
    insight: 'For a 4 by 3 room the line first meets a corner 3 rooms across and 4 up: the ball stops at the bottom right after 5 bounces.',
    step: 'A wider room makes the first crossing farther away.',
    prerequisites: 'Follow a straight line; count rooms.',
    refs: ['B-U', 'B-F'], provenance: 'Week 9 4–5 Problem 4 (the 4 by 3 table: 3 across, 4 up, bottom right after 5), with the copy walls drawn; placing them is in the spec’s “Not yet done”.' },
  { id: 'billiard-15', level: 'medium', title: 'One bounce',
    parameters: { mode: 'every', cols: 6, rows: 6, start: [1, 1], bounces: 1 },
    hint: 'Start with rooms one square high. Which one bounces once?',
    insight: 'The ball bounces once exactly when one side is twice the other: six rooms up to 6 by 6.',
    step: 'Find every: the list is judged as a whole, so its completeness is the puzzle.',
    prerequisites: 'Count one bounce; doubling.',
    refs: ['B-M', 'B-F', 'B-R'], provenance: 'Week 9 2–3 Problem 6 (every table up to 6 by 6 with one bounce; the facilitator lists six).' },
  { id: 'billiard-16', level: 'easy', title: 'Back to the start',
    parameters: shape(6, 6, { corner: 'bottom-left' }, [6, 6]),
    hint: 'Launch a few rooms. Where does each one stop?',
    insight: 'The ball never comes back to its start: every copy of the start corner is an even number of rooms across and up, and halfway there the line meets a copy corner where the ball stops first.',
    step: 'The first impossible goal; the claim points at one copy of the start and the corner the ball reaches before it.',
    prerequisites: 'Tell corners apart; find a point halfway along a line.',
    refs: ['B-K', 'B-M', 'B-U', 'B-F', 'B-R'], provenance: 'Week 9 K–1 Problem 6, 2–3 Problem 8 and 4–5 Problem 7 (the ball never stops where it started), answered with Can’t (card Decision: send it home).' },
  { id: 'billiard-17', level: 'medium', title: 'Three bounces to the top right',
    parameters: shape(6, 6, { corner: 'top-right', bounces: 3 }, [6, 6]),
    hint: 'Launch rooms that stop at the top right and count their bounces.',
    insight: 'A top-right stop takes an even number of bounces: its copy corner is odd across and odd up, so across + up − 2 is even. Three bounces is impossible.',
    step: 'The impossible target of the medium set; the claim points at every copy corner three bounces away.',
    prerequisites: 'Count bounces; odd and even.',
    refs: ['B-M', 'B-F', 'B-R'], provenance: 'Week 9 2–3 Problem 4, fourth target (top right after 3 bounces, impossible; facilitator answer).' },
  { id: 'billiard-18', level: 'hard', title: 'Eight bounces to the bottom right',
    parameters: shape(8, 8, { corner: 'bottom-right', bounces: 8 }, [9, 9]),
    hint: 'Count the bounces of rooms that stop at the bottom right. Are they ever even?',
    insight: 'A bottom-right copy corner is odd across and even up, so across + up − 2 is odd: no room stops there after 8 bounces.',
    step: 'The impossible target of the hard set, on the largest map; corners on the line that are not first on their own line may be tapped or left.',
    prerequisites: 'Odd and even; add across and up.',
    refs: ['B-U', 'B-F', 'B-R'], provenance: 'Week 9 4–5 Problem 6, fourth target, adapted: bottom right after 10 bounces became 8 so its map (9 by 9 copies) fits the board; both are impossible for the same reason.' }
];

// The table in docs/couriers/README.md: [id, answers] (rooms as w×h, aims and
// crossings as across,up; '—' for an impossible target).
export const TABLE = {
  'billiard-01': '1×2 3×2 1×4 2×4 3×4', 'billiard-02': '2×1 4×1 2×3 4×2 4×3', 'billiard-03': '7×1 5×3 3×5 10×6 6×10 1×7',
  'billiard-04': '3×1 6×2 1×3 2×6', 'billiard-05': '3,2 1,4', 'billiard-06': '5,1 1,5', 'billiard-07': '5×1 4×3 3×5',
  'billiard-08': '4×1 2×3 4×6', 'billiard-09': '5,3 3,5', 'billiard-10': '1×2 2×4 5×3 3×6 4×8', 'billiard-11': '7,3 3,7',
  'billiard-12': '7,4 5,6', 'billiard-13': '3,2', 'billiard-14': '3,4', 'billiard-15': '2×1 4×2 6×3 1×2 2×4 3×6',
  'billiard-16': '—', 'billiard-17': '—', 'billiard-18': '—'
};

const roomText = rooms => rooms.map(([w, h]) => `${w}×${h}`).join(' ');
const pointText = list => list.map(c => c.join(',')).join(' ');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function objective(q) {
  if (q.mode === 'cross') return 'Tap the first point on the ball’s line where two walls cross.';
  if (q.mode === 'every') return `Find every room up to ${q.cols} by ${q.rows} where the ball bounces exactly ${q.bounces === 1 ? 'once' : `${q.bounces} times`}.`;
  const t = q.target, verb = q.mode === 'aim' ? 'Aim' : 'Shape the room';
  if (t.corner === 'bottom-left') return `${verb} so the ball stops back at the corner it started from.`;
  return `${verb} so the ball stops at the ${cornerName(t.corner)} corner${t.bounces === undefined ? '' : ` after exactly ${plural(t.bounces, 'bounce')}`}.`;
}

// Solve each puzzle from a fresh board with the mechanic's own hints.
function witness(p) {
  let board = billiard.fresh(p);
  const moves = [];
  for (let i = 0; i < 40 && !billiard.solved(p, board); i++) {
    const h = billiard.hint(p, board);
    assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
    board = billiard.move(p, board, h.action);
    assert.ok(board, `${p.id}: hint move is legal`);
    moves.push(h.action);
  }
  assert.ok(billiard.solved(p, board), `${p.id}: hints solve it`);
  return moves;
}

function answers(p) {
  const q = p.parameters;
  if (q.mode === 'shape') return reachable(q.target) ? roomText(roomsFor(q)) : '—';
  if (q.mode === 'every') return roomText(everyAnswer(q));
  if (q.mode === 'aim') return pointText(aimAnswers(q));
  return pointText([crossAnswer(q)]);
}

export function buildFamily() {
  const instances = PUZZLES.map(spec => {
    const p = { id: spec.id, parameters: spec.parameters };
    const q = spec.parameters, moves = witness(p), list = answers(p);
    assert.deepEqual(list.split(' ').sort(), TABLE[spec.id].split(' ').sort(), `${spec.id}: answers match the spec table`);
    const solution = { moves, answers: list === '—' ? [] : list.split(' ') };
    if (q.mode === 'shape' && !reachable(q.target)) solution.certificate = q.target.bounces === undefined ? 'a copy of the start corner and a copy corner on the way to it' : lineOf(q).filter(c => c.first).map(c => c.at.join(',')).join(' ');
    if (q.mode === 'cross' || q.mode === 'aim') {
      const [a, u] = q.mode === 'cross' ? crossAnswer(q) : aimAnswers(q)[0];
      const out = q.mode === 'cross' ? launchOutcome(q.width, q.height) : null;
      if (out) solution.stop = { corner: out.corner, bounces: out.bounces, across: a, up: u };
    }
    return {
      id: spec.id, title: spec.title, prompt: objective(q), parameters: q, solution, hint: spec.hint, insight: spec.insight,
      difficulty_step: spec.step, prerequisites: spec.prerequisites, source_refs: spec.refs, provenance: spec.provenance,
      difficulty_level: spec.level, ...(spec.revision ? { revision: spec.revision } : {})
    };
  });
  return { id: 'billiard', ...FAMILY, instances };
}

// The billiard family's span in the file text, so the other families keep
// their exact text (Python wrote them, with numbers such as 180.0).
function familySpan(text) {
  const start = text.indexOf('{\n      "id": "billiard"');
  assert.ok(start > 0, 'the billiard family is in motion.json');
  let depth = 0, quoted = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '\\') i++; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if ((c === '}' || c === ']') && --depth === 0) return [start, i + 1];
  }
  throw new Error('Unbalanced motion.json');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const text = await readFile(file, 'utf8'), [start, end] = familySpan(text);
  const family = buildFamily();
  const next = text.slice(0, start) + JSON.stringify(family, null, 2).replaceAll('\n', '\n    ') + text.slice(end);
  const doc = JSON.parse(next);
  assert.deepEqual(doc.families.map(f => f.id), JSON.parse(text).families.map(f => f.id));
  assert.deepEqual(doc.families.find(f => f.id === 'billiard'), family);
  await writeFile(file, next);
  const levels = Object.groupBy(family.instances, p => p.difficulty_level);
  console.log(`Wrote ${family.instances.length} Mirror Couriers puzzles (${Object.entries(levels).map(([k, v]) => `${v.length} ${k}`).join(', ')}).`);
}
