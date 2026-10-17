// Writes dist/families/aims/aims.json: the Bounce words group of Mirror
// Couriers (Week 71, "Can you hear the room?"). Each puzzle's answers are
// counted here with the mechanic's own fold (dist/families/aims/fold.js) and
// checked against the table in docs/aims/README.md; validate-aims.mjs checks
// them again by a different method.
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {answers, certificate, judge, possible} from '../dist/families/aims/aims.js';
import {fold} from '../dist/families/aims/fold.js';

const SRC = ['aims-week71', 'aims-calderon', 'aims-duchin'];
const CORNER = [-48, 50, -18, 18]; // rhombus: x from -24 to 25, y from about -15.6 to 15.6
const RULES = [
  'A shot starts inside the room and goes straight until it meets a wall.',
  'At a wall it bounces like light in a mirror: in the mirror copies of the room it runs straight on.',
  'Its word is the walls it meets, in order. A shot that meets a corner is not allowed.'
];
const BASE = 'A shot goes straight from the start and bounces off each wall like light off a mirror. In the picture it runs straight on into a mirror copy of the room instead. The walls it crosses, in order, spell its word, and the small room beside the word shows the same shot bouncing. A shot that hits a corner doesn’t count. Drag or tap in the copies to choose where the shot ends; arrow keys move the end too.';
const MOVE = ' Drag the start dot to move it (with a keyboard, Shift and an arrow key).';
const CANT = ' After a shot, Can’t says the word can’t be made: then tap the two walls that show why. A wrong pair is refused, and Can’t waits for a new shot.';
const CHECK = ' Check asks whether some rectangle could make the shot’s word too. A refused Check waits for a new shot.';

const puzzles = [
  {
    title: 'Two walls', level: 'easy',
    parameters: {mode: 'target', room: 'square', start: [5, 5], frame: [-1, 1, -1, 1], word: 'DC'},
    expect: {count: 10},
    idea: 'Each wall the shot crosses is a letter: D is the copy to the right, C the copy above. Which comes first depends on how steep the shot is, and the diagonal hits the corner.',
    hints: ['D is the right wall and C the top. Which copy is past both of them?', 'Aim into the copy up and to the right, but not through its corner.', 'Cross D first: the shot must be a little flatter than the diagonal.'],
    parent: {
      notice: 'Whether your child aims at the copy up and to the right and then tilts the shot to change DC into CD and back.',
      prompt: 'Why does the shot through the corner not count?',
      explanation: 'A shot through the corner of a copy would hit two walls at once, so its word is not defined. Just below the corner it crosses D first; just above, C first.',
      extension: 'Make CD. How many different two-letter words can you make from the dot?',
      connection: 'Week 71 Problem 1: words read off the copies in the tracing window.'
    },
    provenance: 'Week 71 Problem 1 (shots from the centre dot of the square window), as a two-letter target word; new instance.'
  },
  {
    title: 'Three walls', level: 'easy',
    parameters: {mode: 'target', room: 'square', start: [5, 5], frame: [-2, 2, -2, 2], word: 'CBA'},
    expect: {count: 20},
    idea: 'The letters of a word name the copies the shot passes, one wall at a time: up through C, left through B, up through A.',
    hints: ['C is the top wall. After C, which copy is the shot in?', 'Go up through C, then left through that copy’s B wall, then up through A.', 'End the shot two copies up and one to the left.'],
    parent: {
      notice: 'Whether your child plans the copies from the letters, or drags until the word appears.',
      prompt: 'Where is the A wall of the copy above the room?',
      explanation: 'Mirroring the room in its top wall C puts a copy above whose top wall is the image of A. So going straight up the walls read C, A, C, A, and going sideways B, D, B, D.',
      extension: 'Find six different three-letter words from the dot.',
      connection: 'Week 71 Problem 1 and the adult guide’s table (direction (−2, 3) gives CBA).'
    },
    provenance: 'Week 71 Problem 1; CBA is a row of the adult guide’s Problem 1 table.'
  },
  {
    title: 'A slanted room', level: 'easy',
    parameters: {mode: 'target', room: 'rhombus', start: [7, 7], frame: CORNER, word: 'AB'},
    expect: {count: 34},
    idea: 'The rhombus folds the same way: its copies are mirror images across each wall, though they lie at slants. The copies appear as the shot reaches them.',
    hints: ['A is the bottom wall. Shoot down through it and look at the new copy.', 'In the copy below A, find its B wall.', 'Cross A, then that copy’s B wall, down and to the left.'],
    parent: {
      notice: 'Whether your child expects the copy below A to look like the room, and checks its letters.',
      prompt: 'What does the copy across A look like?',
      explanation: 'The copy across A is the rhombus mirrored in A, so its B wall slopes the other way. A rhombus’s copies do not fill a grid as a rectangle’s do, so only the copies a shot passes are drawn.',
      extension: 'Make BA instead.',
      connection: 'Week 71 Problem 2’s rhombus copies, drawn one wall at a time.'
    },
    provenance: 'Week 71 Problem 2 (the chain of 60° rhombus copies), as a two-letter target word; new instance.'
  },
  {
    title: 'Two in a row', level: 'medium',
    parameters: {mode: 'target', room: 'square', start: [5, 5], frame: [-2, 2, -2, 2], word: 'ACB'},
    expect: {count: 3},
    idea: 'Two up-down walls before a side wall needs a shot between three and five times as steep as it is wide: the order of crossings is set by the slope.',
    hints: ['A, then C, then B: the shot crosses two walls going down before any side wall.', 'It must be very steep, and lean just a little to the left.', 'End the shot two copies down and one to the left, close to the B wall.'],
    parent: {
      notice: 'Whether your child makes AC first and then leans the shot until B comes before the next A.',
      prompt: 'Why must the shot be so steep?',
      explanation: 'From the centre the shot meets A after half a room down and C after one and a half; it must reach B (half a room left) after that but before A again, two and a half rooms down. So it goes between three and five times as far down as left.',
      extension: 'Make CAD, the same word turned upside down.',
      connection: 'ACB is one of the eight square words the Week 71 math check proves the 60° rhombus can’t make.'
    },
    provenance: 'Week 71 Problem 1 window, as a target word with only 3 solving spots; new instance.'
  },
  {
    title: 'Back to A', level: 'medium',
    parameters: {mode: 'target', cant: true, room: 'square', start: [5, 5], movable: true, frame: [-1, 1, -1, 1], word: 'ABA'},
    expect: {count: 0},
    idea: 'In the copies of a square both A walls of the route A, B, A lie on one line, and a straight shot crosses a line only once: ABA can’t happen in a rectangle.',
    hints: ['Try A, then B. Where is the next A wall?', 'The A wall after B is on the same line as the room’s own A wall.', 'A straight shot crosses that line once, so it can’t cross A twice.'],
    parent: {
      notice: 'Whether your child tries several starts and then says why it can’t work, rather than only that they couldn’t find one.',
      prompt: 'Does not finding a shot prove nobody could?',
      explanation: 'After A the shot is going up, and hitting B only turns it sideways, so it can’t come back down to A next. In the copies: the A wall of the room and the A wall of the copy after B lie on one line, which a straight line crosses at most once.',
      extension: 'Which other three-letter words can’t a rectangle make?',
      connection: 'Week 71 Problem 2, square copies; Calderon et al., Proposition 1.6.'
    },
    provenance: 'Week 71 Problem 2 (square chain, "Explain any impossibility"), with the collinear A walls as the certificate.'
  },
  {
    title: 'Back to A again', level: 'medium',
    parameters: {mode: 'target', cant: true, room: 'rhombus', start: [7, 7], movable: true, frame: CORNER, word: 'ABA'},
    expect: {count: 1172, starts: 49},
    idea: 'At the 60° corner the three walls A, B, A of the copies fan out by less than a half turn, so one straight line can cross all three: ABA happens in the rhombus.',
    hints: ['Try A, then B. Where is the next A wall?', 'In the rhombus copies, the A wall, the B wall and the next A wall all meet at the sharp corner. Are both A walls on one line?', 'Shoot down through A near the sharp corner so the shot meets B almost square on: it comes back to A.'],
    parent: {
      notice: 'Whether your child carries the square’s argument over, presses Can’t, and then sees that the two A walls are not on one line.',
      prompt: 'Why did the square’s reason not work here?',
      explanation: 'After A the shot can meet B square on and come straight back to A. In the copies, the A wall, the B wall and the next A wall all start at the sharp corner and spread over 120°, less than a straight line’s half turn, so a straight line can cross all three. The two A walls are not on one line, so the square’s certificate fails.',
      extension: 'Make BAB, and then CDC at the other sharp corner.',
      connection: 'Week 71 Problem 2, rhombus copies (beside the square on the sheet); Calderon et al., the ABA comparison and Figure 2.'
    },
    provenance: 'Week 71 Problem 2 (rhombus chain; start anywhere in the shaded room).'
  },
  {
    title: 'Same word, wide room', level: 'medium',
    parameters: {mode: 'remake', room: 'wide', start: [10, 5], frame: [0, 2, 0, 1], word: 'DCB',
      given: {room: 'square', start: [5, 5], end: [23, 17], frame: [0, 2, 0, 1]}},
    expect: {count: 20},
    idea: 'The wide room’s copies are the square’s copies stretched across: aim at the same spot in the same copy and the word is the same. Aiming the same way does not work.',
    hints: ['The square shot ends in the copy two across and one up.', 'In the wide copies, the same copy is two across and one up too.', 'End the shot at the same spot in that copy.'],
    parent: {
      notice: 'Whether your child first copies the direction of the square shot (which gives another word) and then copies its copy and spot.',
      prompt: 'After the solve, press Stretch. What happens to the square shot?',
      explanation: 'Stretching the square’s picture of copies to twice its width turns it into the wide room’s picture: lines stay straight, every wall keeps its letter and the crossings keep their order. So every square shot becomes a wide-room shot with the same word, and squeezing goes back: the two rooms have exactly the same words.',
      extension: 'Make a word with both kinds of wall in the square, and then in the wide room.',
      connection: 'Week 71 Problem 4 and the adult guide’s stretch proof.'
    },
    provenance: 'Week 71 Problem 4; DCB is the guide’s first Problem 4 example (square third hit (4, 3), wide (8, 3), here scaled by 5).'
  },
  {
    title: 'No rectangle', level: 'medium',
    parameters: {mode: 'design', room: 'rhombus', start: [7, 7], frame: CORNER},
    expect: {count: 64},
    idea: 'A word with A, B, A (or B, A, B) rules out every rectangle, and the rhombus makes it at its sharp corner: some words tell the rhombus from a rectangle.',
    hints: ['Which word did a rectangle never make?', 'ABA can’t happen in any rectangle.', 'Make ABA near the sharp corner, then press Check.'],
    parent: {
      notice: 'Whether your child uses ABA from the earlier puzzles, or finds a new kind of word.',
      prompt: 'How do you know no rectangle, of any shape, can make it?',
      explanation: 'In every rectangle the A and C walls take turns along a shot, and so do B and D: a straight line crosses evenly spaced lines in order. A word breaking that rule (ABA, BAB) can’t come from a rectangle of any shape.',
      extension: 'Is there a word the square can make that the rhombus can’t? (ACB is one: in the rhombus a shot that crosses A and then C leans too far to reach B next.)',
      connection: 'Week 71 Problem 3 as a design goal; the review card’s first fix lists the words that rule rooms out.'
    },
    provenance: 'Week 71 Problem 3 ("rooms not ruled out"), as a design goal checked against every rectangle word.'
  },
  {
    title: 'Same word, square', level: 'hard',
    parameters: {mode: 'remake', room: 'square', start: [5, 5], frame: [-2, 0, 0, 1], word: 'BDC',
      given: {room: 'wide', start: [10, 5], end: [-38, 11], frame: [-2, 0, 0, 1]}},
    expect: {count: 3},
    idea: 'Squeezing goes back: a wide-room shot halved across is a square shot with the same word. Only a few spots work, and the squeezed shot finds one.',
    hints: ['The wide shot ends in the copy two to the left and one up.', 'Find the same copy among the square copies.', 'End the shot at the same spot in that copy, close to its C wall.'],
    parent: {
      notice: 'Whether your child uses the same copy and spot, or searches the few spots that work.',
      prompt: 'After the solve, press Squeeze. Why does the word stay the same?',
      explanation: 'Halving every across-distance keeps straight lines straight and every crossing in order, so the wide shot becomes a square shot with the same word. Together with stretching, this shows the two rooms make exactly the same words.',
      extension: 'Is there a word only the wide room can make?',
      connection: 'Week 71 Problem 4, the other way; the guide: “Halving horizontal coordinates transfers any rectangle shot back to the square.”'
    },
    provenance: 'Week 71 Problem 4, wide room to square (the guide’s halving remark); new instance, a word with only 3 solving spots.'
  },
  {
    title: 'Up and back', level: 'hard',
    parameters: {mode: 'target', cant: true, room: 'wide', start: [10, 5], movable: true, frame: [-1, 1, 0, 2], word: 'CABA'},
    expect: {count: 0},
    idea: 'The same reason works further along a word: after C, the A wall the shot crosses and the A wall it needs after B lie on one line.',
    hints: ['Try C, then A, then B. Where is the next A wall?', 'The A wall after B is on the line of the A wall the shot already crossed.', 'Press Can’t and tap those two A walls.'],
    parent: {
      notice: 'Whether your child finds the two A walls away from the room itself.',
      prompt: 'Which line can the shot cross only once?',
      explanation: 'Going up through C and then A, the shot crosses the line two rooms up. After B, the next A wall is on that same line, which a straight shot can’t cross again. Any word with A, B, A (or a similar pattern) inside it is impossible in every rectangle.',
      extension: 'Can the rhombus make CABA?',
      connection: 'Week 71 Problem 2’s argument, moved along the word; the review card’s first fix.'
    },
    provenance: 'New: Week 71 Problem 2’s obstruction inside a longer word, in Problem 4’s wide room.'
  },
  {
    title: 'All four walls', level: 'hard',
    parameters: {mode: 'design', four: true, room: 'rhombus', start: [7, 7], frame: [-60, 104, -40, 56]},
    expect: {count: 45},
    idea: 'A second kind of word rules out rectangles: two up-down walls in a row and two side walls in a row (ACDB). In a rectangle a shot can’t cross the whole height without a side wall and also the whole width without the top or bottom.',
    hints: ['Which pattern of walls can a rectangle shot never make, even with each wall once?', 'In a rectangle a shot can’t cross A then C (straight through) and also D then B.', 'Try ACDB: steeply down through A and C, then through D and B.'],
    parent: {
      notice: 'Whether your child looks for a pattern rather than a lucky shot.',
      prompt: 'Why can’t a rectangle make ACDB?',
      explanation: 'A then C means the shot crossed a whole room height between two side walls, so it is steeper than the room. D then B means it crossed a whole width between top and bottom, so it is flatter. It can’t be both. In the rhombus the slant lets it happen.',
      extension: 'Find all four such words: ACDB, BDCA, CABD and DBAC.',
      connection: 'The review card’s first fix (words with two horizontal walls in a row and two vertical walls in a row rule out every rectangle); balanced words.'
    },
    provenance: 'New, from the Week 71 review card’s first fix (the ACDB family of rule-out words).'
  }
];

const LEVELS = {easy: 'Easy', medium: 'Medium', hard: 'Hard'};
function copyFor(q) {
  const room = {square: 'square', wide: 'wide room', rhombus: 'rhombus'}[q.room];
  if (q.mode === 'target') return {
    objective: `Make a shot in the ${room} whose word is ${q.word}${q.cant ? ', or say it can’t be done' : ''}.`,
    visibleObjective: 'Make a shot with this word.',
    controls: BASE + (q.movable ? MOVE : '') + (q.cant ? CANT : '')
  };
  if (q.mode === 'remake') {
    const there = {square: 'square', wide: 'wide room'}[q.given.room];
    return {
      objective: `Make a shot in the ${room} with the same word as the shot in the ${there}, ${q.word}.`,
      visibleObjective: `Make the same word in the ${room}.`,
      controls: `${BASE} The shot above is in the ${there}. After the solve, ${q.given.room === 'square' ? 'Stretch stretches its picture across' : 'Squeeze squeezes its picture across'}.`
    };
  }
  return {
    objective: q.four ? 'Make a shot in the rhombus that meets each wall once, with a word no rectangle can make, and press Check.' : 'Make a shot in the rhombus whose word no rectangle can make, and press Check.',
    visibleObjective: q.four ? 'Make a word with each wall once that no rectangle can make.' : 'Make a word no rectangle can make.',
    controls: BASE + (q.movable ? MOVE : '') + CHECK
  };
}

const out = puzzles.map((d, i) => {
  const q = d.parameters, list = answers(q);
  assert.equal(list.length, d.expect.count, `${d.title}: ${list.length} solving shots`);
  if (d.expect.starts) assert.equal(new Set(list.map(w => String(w.start))).size, d.expect.starts, `${d.title}: starts`);
  if (q.cant) {
    const pair = certificate(q).map(s => s.id).sort();
    assert.equal(possible(q), judge(q, pair) !== 'right', `${d.title}: Can’t is right exactly when the certificate holds`);
  }
  const witness = list[0] ?? null;
  const solution = q.mode === 'design'
    ? {start: witness.start, end: witness.end, word: fold(q.room, witness.start, witness.end).word, shots: list.length}
    : q.cant && !list.length ? {possible: false, walls: certificate(q).map(s => s.id).sort()}
      : {possible: true, start: witness.start, end: witness.end, shots: list.length};
  const copy = copyFor(q);
  return {
    id: `aims-${String(i + 1).padStart(2, '0')}`, number: i + 1, title: d.title,
    band: 'all', difficulty_level: d.level, mechanic: 'aims', libraryFamily: 'billiard', group: 'Bounce words', familyTitle: 'Mirror Couriers',
    revision: 1, parameters: q,
    objective: copy.objective, visibleObjective: copy.visibleObjective, instruction: copy.objective, controls: copy.controls,
    rules: RULES, idea: d.idea,
    prerequisites: i === 0 ? 'None. Reading single letters.' : `Bounce words puzzle ${i}.`,
    hints: d.hints,
    parent: {...d.parent, sourceIds: SRC},
    solution, provenance: d.provenance, sourceDocument: 'docs/aims/README.md'
  };
});

const pack = {
  title: 'Mirror Couriers bounce words', version: 1,
  families: [{
    id: 'aims', title: 'Mirror Couriers bounce words',
    mathematics: 'A shot in a room with lettered walls has a word: the walls it meets, in order; a shot into a corner is not allowed. Mirror the room in the wall a shot meets and the shot runs straight on, so a shot is a straight line through mirror copies of the room and its word is the walls of the copies it crosses. In a rectangle the walls go two ways (A and C, B and D), and a straight line crosses the lines of each way in order, so the letters of each way take turns: ABA never happens, because in the copies both A walls lie on one line, which a straight shot crosses once. A 60° rhombus makes ABA at its sharp corner. Stretching the picture of copies across keeps lines straight and crossings in order, so every rectangle makes exactly the same words: words tell the rhombus from a rectangle but never one rectangle from another. The rectangle words are exactly those whose letters of each way take turns and whose order of the two ways is balanced (equal stretches of the word differ by at most one in their count of A and C), the cutting sequences of straight lines; so ACDB rules out every rectangle too, and the rhombus makes it.',
    rules: RULES, sourceIds: SRC
  }],
  sources: [
    {id: 'aims-week71', title: 'Bellingham Math Circle — Week 71: Can you hear the room?, student packet and adult guide', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-71', kind: 'local curriculum'},
    {id: 'aims-calderon', title: 'Aaron Calderon, Solly Coles, Diana Davis, Justin Lanier and Andre Oliveira — How to hear the shape of a billiard table (2018): the ABA comparison and Figure 2, p. 4; Proposition 1.6 and Corollary 1.7, p. 6', url: 'https://justinlanier.org/wp-content/uploads/2020/10/bounce.pdf', kind: 'research'},
    {id: 'aims-duchin', title: 'Moon Duchin, Viveka Erlandsson, Christopher J. Leininger and Chandrika Sadanand — You can hear the shape of a billiard table: symbolic dynamics and rigidity for flat surfaces, the Bounce Theorem, §1, pp. 2–3', url: 'https://arxiv.org/pdf/1804.05690', kind: 'research'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/aims/aims.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
console.log(JSON.stringify(out.map(p => ({id: p.id, level: p.difficulty_level, mode: p.parameters.mode, room: p.parameters.room, word: p.parameters.word ?? (p.parameters.four ? 'four walls' : 'no rectangle'), solution: p.solution}))));
