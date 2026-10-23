// Authoring list for Missing square, a group in Tile gardens (worksheet
// Week 93, squaring a rectangle). Computes every puzzle's answer with the
// mechanic's own searches (straight cuts, fitting with turns, the squares
// that need pieces of their own), checks them against the table in
// docs/reshape/README.md, plays a witness, and writes
// dist/families/reshape/reshape.json. Run: node scripts/build-reshape.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startCells, partitions, cover, rectCells, rectOf, rectKey, cellKey, mostApart, apart} from '../dist/families/reshape/cutmath.js';
import {reshapeMechanics} from '../dist/families/reshape/reshape.js';

const mech = reshapeMechanics.reshape;
const sources = ['reshape-week93', 'reshape-card93'];
const MOVE = 'Pieces are cut at the top, before they go on the grid. Tap a piece there to choose it: dashed lines cross it where it can be cut, and a tap on a line cuts there. Drag a piece onto the grid below, or tap the grid where its top-left corner goes; it turns if it fits only turned. Tap a chosen piece again, or press Turn, to turn it; from the top it comes onto the grid turned. Drag a piece back up, or tap its empty place, to take it back. Tape joins every piece back together.';
const CONTROLS = {
  square: MOVE,
  hole: `${MOVE} Once a piece is cut or moved, Can’t lets you tap squares of the grid that each need a piece of their own; tap one again to drop it.`,
  rebuild: `${MOVE} Every rectangle made goes on the shelf below; press That’s all when you think every one is there.`
};
const CUTS = n => `Cut only along the grid lines, straight across a piece, at most ${n === 1 ? 'once' : `${n} times`}. The scissors show the cuts left.`;
const RULES = {
  square: n => [CUTS(n), 'Every piece goes in the square, on the grid, with no overlaps; pieces may be turned.', 'Solved when the part left uncovered is one square.'],
  hole: n => [CUTS(n), 'Every piece goes in the square, on the grid, with no overlaps; pieces may be turned. The dashed square stays uncovered.', 'Can’t: tap squares no one piece could cover two of, more of them than the cuts make pieces. A piece is a rectangle, so two squares can share one only when the rectangle between them misses the dashed square.'],
  rebuild: n => [CUTS(n), 'A rectangle uses every piece, side to side, with no gaps or overlaps. A rectangle turned round is the same one.', 'That’s all says every rectangle the pieces can make is on the shelf.']
};
const OBJECTIVE = {
  square: n => [`Cut the rectangle (${n === 1 ? 'one cut' : `${n} cuts`} at most) and fit every piece in the square so that what is left uncovered is one square.`, 'Fit every piece in the square, leaving one square uncovered.'],
  hole: n => [`Cut the rectangle (${n} cuts at most) and fit every piece in the square around the dashed square, or press Can’t and tap squares that each need a piece of their own, more than the cuts can make.`, 'Fit every piece in the square, leaving the dashed square uncovered.'],
  rebuild: n => [`Cut the shape (${n === 1 ? 'one cut' : `${n} cuts`} at most) and make every rectangle you can from all of its pieces, then press That’s all.`, 'Make every rectangle you can from all the pieces.']
};
const PREREQ = {
  square: 'None to start: cutting, dragging and turning are taps. Counting squares to about 10; halving and taking away explain the size of the square left over.',
  hole: 'The earlier Missing square puzzles. Reading the Can’t rule with a grown-up the first time.',
  rebuild: 'None to start. Counting squares, and rows times columns for area, help to see which rectangles are possible.'
};

// The table in docs/reshape/README.md.
const PUZZLES = [
  {n: 1, level: 'easy', kind: 'square', title: 'Four by two', q: {home: {w: 4, h: 2}, cuts: 1}, check: {side: 1, pieces: ['3x2 2x1']},
    idea: 'The square’s side, 3, is the average of 4 and 2. Cut 3 off the long side: the 3 by 2 lies across the square and the turned 2 by 1 leaves a 1 by 1 square, half of 4 − 2.',
    hints: ['Which piece could lie right across the square?', 'A piece as long as the square is wide fits across it.', 'Cut the 4 by 2 into a 3 by 2 and a 2 by 1, then turn the small piece.'],
    parent: {notice: 'Whether your child cuts in the middle first, and sees why two 2 by 2 pieces can’t both fit in a 3 by 3 square.', prompt: 'Why does the square’s side, 3, suit this rectangle so well?', explanation: '3 is halfway between 2 and 4. Cut 3 off the long side: the 3 by 2 piece lies across the square and leaves a 3 by 1 row, and the 2 by 1 piece, turned, covers two of its squares and leaves one. The areas agree: 9 − 8 = 1. Cutting in the middle fails, because two 2 by 2 pieces in a 3 by 3 square would both need its middle square.', extension: 'What would be left uncovered from a 6 by 2 in a 4 by 4 square? (Puzzle 2.)', connection: 'The square whose side is the average of a rectangle’s sides holds the rectangle with one square left over, of side half the difference.'},
    provenance: 'Week 93 Problem 2, rectangle B (4 by 2 into a 3 by 3 square), with a one-cut limit added.'},
  {n: 2, level: 'easy', kind: 'square', title: 'Six by two', q: {home: {w: 6, h: 2}, cuts: 1}, check: {side: 2, pieces: ['4x2 2x2']},
    idea: 'Cut 4 off the 6: the 4 by 2 lies across the square and the 2 by 2 fills half the band above, leaving a 2 by 2 square in a corner.',
    hints: ['Which piece could lie right across the square?', 'Cut a piece as long as the square is wide.', 'Cut the 6 by 2 into a 4 by 2 and a 2 by 2.'],
    parent: {notice: 'Whether your child cuts at 3 first (two 3 by 2 pieces), and finds that those never leave a single square.', prompt: 'How big is the square left over, and where can it be?', explanation: 'The 4 by 2 lies across the 4 by 4 square and leaves a 4 by 2 band; the 2 by 2 sits at one end and leaves a 2 by 2 square in a corner, and 16 − 12 = 4. With one cut, the cut is always 2 from an end (a 4 by 2 and a 2 by 2) and the uncovered square is always in a corner; two 3 by 2 pieces never leave one square.', extension: 'Leave the uncovered square in the middle of the top edge instead. How many cuts does that take? (Two: puzzle 9.)', connection: 'Week 93’s identity m² − ab = ((b − a)/2)², here 16 − 12 = 2 × 2.'},
    provenance: 'Week 93 Problem 2, rectangle A (6 by 2 into 4 by 4), with a one-cut limit added; the guide’s solution is this cut.'},
  {n: 3, level: 'easy', kind: 'square', title: 'Five by one', q: {home: {w: 5, h: 1}, cuts: 1}, check: {side: 2, pieces: ['3x1 2x1']},
    idea: 'The uncovered square has side 2, half of 5 − 1. Puzzles 1 and 2 also fit “half the long side, minus 1”; this one tells the two rules apart.',
    hints: ['Which piece could lie across the bottom of the square?', 'A 3 by 1 lies across. Where can the rest go?', 'Cut it into a 3 by 1 and a 2 by 1, and stand the 2 by 1 up in a corner.'],
    parent: {notice: 'Whether your child predicts the uncovered square from puzzles 1 and 2 before fitting.', prompt: 'Puzzles 1 and 2 both had short side 2. What rule fits all three?', explanation: 'The 3 by 1 lies across the bottom; the 2 by 1, stood up in a corner, leaves a 2 by 2 square, and 9 − 5 = 4. In puzzles 1 and 2 the uncovered side is also half the long side minus 1, but here that would be 1½. The rule that fits all three is half the difference of the sides: (5 − 1) ÷ 2 = 2.', extension: 'Predict the square left over when 9 by 1 goes into 5 by 5. (Side 4.)', connection: 'The Week 93 review card added this case (its fix 1) to separate the two rules.'},
    provenance: 'Week 93 Problem 2, rectangle C (5 by 1 into 3 by 3), the review card’s fix 1, with a one-cut limit added.'},
  {n: 4, level: 'easy', kind: 'rebuild', title: 'A corner gone', q: {home: {w: 3, h: 3, notch: 1}, cuts: 1}, check: {answers: ['4x2'], mat: [5, 3]},
    idea: 'One cut along a line from the missing corner, and the pieces make the 4 by 2 again. No other rectangle comes from one cut.',
    hints: ['Cut along a line that starts at the missing corner.', 'Put the two pieces end to end.', 'Cut off the 2 by 1 at the top and put it at the end of the 3 by 2.'],
    parent: {notice: 'Whether your child looks for a second rectangle before pressing That’s all, and how they decide there isn’t one.', prompt: 'Could the 8 squares make an 8 by 1 with one cut?', explanation: 'Cutting along either line from the missing corner gives a 3 by 2 and a 2 by 1, which make a 4 by 2: the square with its corner gone is the 4 by 2, rearranged. Eight squares make only 8 by 1 and 4 by 2, and an 8 by 1 needs every piece one square thick, which one cut can’t give.', extension: 'With two cuts, the shape can make an 8 by 1.', connection: 'This is puzzle 1 run backwards: the 4 by 2 becomes the 3 by 3 square with a 1 by 1 corner gone, and back again.'},
    provenance: 'New: the reverse move from the review card’s App fit, on the shape Problem 2’s rectangle B leaves.'},
  {n: 5, level: 'medium', kind: 'square', title: 'Eight by two', q: {home: {w: 8, h: 2}, cuts: 1}, check: {side: 3, pieces: ['5x2 3x2']},
    idea: 'The square’s side is 5, the average of 8 and 2, and the uncovered square has side 3, half of 8 − 2.',
    hints: ['How wide is the square? Could one piece lie across it?', 'Cut a piece 5 long.', 'Cut the 8 by 2 into a 5 by 2 and a 3 by 2, then turn the 3 by 2.'],
    parent: {notice: 'Whether your child now cuts at the square’s side straight away.', prompt: 'Before fitting: how big will the square left over be?', explanation: 'The 5 by 2 lies across the square and leaves a 5 by 3 band; the 3 by 2, turned, covers two columns of it and leaves a 3 by 3 square. 25 − 16 = 9.', extension: 'Cut the 8 by 2 into a square with nothing left over. (16 is 4 by 4: two 4 by 2 pieces.)', connection: 'A rectangle can be cut into a square with nothing over when its area is a square number; the square with the average side always has the square left over.'},
    provenance: 'New instance (8 by 2 into 5 by 5), the port brief’s example, after Week 93 Problem 2.'},
  {n: 6, level: 'medium', kind: 'square', title: 'Seven by three', q: {home: {w: 7, h: 3}, cuts: 1}, check: {side: 2, pieces: ['5x3 3x2']},
    idea: 'The same 5 by 5 square as puzzle 5, but the uncovered square has side 2: it depends on the difference of the sides, 7 − 3, not on the square.',
    hints: ['Cut a piece as long as the square is wide.', 'Cut the 7 by 3 into a 5 by 3 and a 3 by 2.', 'Put the 5 by 3 across the bottom, then turn the small piece to fit the band above.'],
    parent: {notice: 'Whether your child expects the same square left over as in puzzle 5, since the square is the same.', prompt: 'Puzzles 5 and 6 both fill a 5 by 5 square. Why are the squares left over different?', explanation: 'The 5 by 3 lies across the square and leaves a 5 by 2 band; the 3 by 2, turned, covers three of its columns and leaves a 2 by 2 square. 25 − 21 = 4. The square’s side is the average, 5, for both 8 by 2 and 7 by 3; the side left over is half the difference, 3 for 8 by 2 and 2 for 7 by 3. A rectangle nearer to a square leaves a smaller square over.', extension: 'Which rectangle with sides adding to 10 leaves the smallest square over? (6 by 4 leaves a 1 by 1.)', connection: 'Week 93 Problem 6: the extra area is ((b − a)/2)², so the closer the sides, the smaller the square left over.'},
    provenance: 'New instance (7 by 3 into 5 by 5), from the review card’s list of short sides, after Week 93 Problem 2.'},
  {n: 7, level: 'medium', kind: 'rebuild', title: 'Two by two gone', q: {home: {w: 4, h: 4, notch: 2}, cuts: 1}, check: {answers: ['6x2', '4x3'], mat: [7, 4]},
    idea: 'Two rectangles: the 6 by 2 it came from, and a 4 by 3, whose side 4 is the average of 6 and 2 and whose other side is 12 ÷ 4. That is Week 93’s reshaping move.',
    hints: ['Make the rectangle it came from first.', 'Is there another? Try cutting off a thinner strip.', 'Cut off the 2 by 1 at the top and fit it into the notch.'],
    parent: {notice: 'Whether your child keeps looking after the 6 by 2, and sees that the 4 by 3 needs a different cut.', prompt: 'How are 6 by 2 and 4 by 3 related?', explanation: 'Cutting along a line from the missing corner gives a 4 by 2 and a 2 by 2, which make the 6 by 2. Cutting off the top row gives a 2 by 1 that fills the notch of what is left: a 4 by 3. That is Week 93’s reshaping move: from 6 by 2, take the average side, (6 + 2) ÷ 2 = 4, and divide the area by it, 12 ÷ 4 = 3. No other rectangle comes from one cut; 12 by 1 would need every piece one square thick.', extension: 'Reshape 4 by 3 the same way: the average is 3½ and the other side 12 ÷ 3½ = 24/7. The sides are no longer whole squares, and it is still not a square.', connection: 'Repeating the reshaping move is Newton’s method for a square root: the sides close in on the side of the square of area 12 from both ends and never reach it.'},
    provenance: 'New: the review card’s reverse move (“which 12-tile rectangle reshapes to 3 by 4?”), played on the shape Problem 2’s rectangle A leaves.'},
  {n: 8, level: 'medium', kind: 'square', title: 'Ten by four', q: {home: {w: 10, h: 4}, cuts: 1}, check: {side: 3, pieces: ['7x4 4x3']},
    idea: 'Half of 10 − 4 is 3. Cut 7 off the 10, lay the 7 by 4 across, and turn the 4 by 3 into the band above.',
    hints: ['How wide is the square?', 'Cut a piece 7 long.', 'Cut the 10 by 4 into a 7 by 4 and a 4 by 3, then turn the 4 by 3.'],
    parent: {notice: 'Whether your child says how big the square left over will be before fitting.', prompt: 'What will be left uncovered, and why?', explanation: '7 is the average of 10 and 4. The 7 by 4 lies across the square and leaves a 7 by 3 band; the 4 by 3, turned, covers four of its columns and leaves a 3 by 3 square. 49 − 40 = 9.', extension: 'Leave the uncovered square in the middle instead (puzzles 10 and 11).', connection: 'For any a by b, the piece as long as the average side lies across the square and leaves a band (b − a)/2 tall, and the other piece fills it except one square of that side: Week 93 Problem 6’s picture, for every rectangle.'},
    provenance: 'New instance (10 by 4 into 7 by 7), from the review card’s list, after Week 93 Problem 2.'},
  {n: 9, level: 'hard', kind: 'hole', title: 'Top middle', q: {home: {w: 6, h: 2}, cuts: 2, hole: [1, 0, 2]}, check: {fewest: 2, apart: 3},
    idea: 'The dashed square in the middle of the top edge leaves a post on each side and a base below: three pieces, a 4 by 2 base and the 2 by 2 cut into two 2 by 1 posts.',
    hints: ['What shapes are the spaces round the dashed square?', 'The base is a 4 by 2. What fills each side of the dashed square?', 'Cut the 6 by 2 into a 4 by 2 and a 2 by 2, then cut the 2 by 2 in half.'],
    parent: {notice: 'Whether your child plans the pieces from the space to fill, rather than cutting first.', prompt: 'Why can’t two pieces do it?', explanation: 'The top-left square, the top-right square and the square under the dashed one can’t share pieces: every piece is a rectangle, and a rectangle holding two of them covers part of the dashed square. So three pieces are needed, and two cuts make three: a 4 by 2 base and two 2 by 1 posts. With one cut the square left over is always in a corner.', extension: 'Can the dashed square be in the very middle with two cuts? (Puzzle 10.)', connection: 'Squares that pairwise can’t share a piece give a lower bound on the number of pieces; Can’t asks for such squares.'},
    provenance: 'New: the review card’s harder goal, naming the uncovered square’s place within a piece budget.'},
  {n: 10, level: 'hard', kind: 'hole', title: 'Middle, two cuts', q: {home: {w: 10, h: 4}, cuts: 2, hole: [2, 2, 3]}, check: {fewest: 3, apart: 4, claim: [[3, 1], [1, 3], [5, 3], [3, 5]]},
    cantText: 'No piece can reach round the dashed square, so a square beside each of its four sides needs a piece of its own, and two cuts make only three pieces. Press Can’t and tap those four squares.',
    idea: 'A square beside each side of the dashed square needs its own piece, four in all, and two cuts make three: it can’t be done.',
    hints: ['Try it. How many pieces would go round the dashed square?', 'Can one piece touch two sides of the dashed square?', 'Press Can’t and tap a square beside each side of the dashed square.'],
    parent: {notice: 'Whether your child tries several cuttings before suspecting it can’t be done, and how they explain it.', prompt: 'Why can’t one piece touch two sides of the dashed square?', explanation: 'Every piece is a rectangle. A rectangle holding squares beside two different sides of the dashed square would cover part of it. So the four squares beside its sides (the middle one beside each side, say) need four different pieces, and two cuts make only three. With three cuts it works (puzzle 11).', extension: 'With three cuts, which four pieces go round it?', connection: 'Squares no two of which can share a piece are a certificate: anyone can check it, pair by pair, without trying every cutting.'},
    provenance: 'New: the review card’s hole-place goal one cut short, so Can’t has a certificate to tap.'},
  {n: 11, level: 'hard', kind: 'hole', title: 'Middle, three cuts', q: {home: {w: 10, h: 4}, cuts: 3, hole: [2, 2, 3]}, check: {fewest: 3, apart: 4},
    idea: 'Four 5 by 2 pieces wind round the dashed square like a pinwheel: cut the 10 by 4 into two 10 by 2 strips and cut each in half.',
    hints: ['Each side of the dashed square needs its own piece. How big could the four pieces be?', 'Four equal pieces can go round it like a pinwheel.', 'Cut the 10 by 4 into two 10 by 2 pieces, then cut each into two 5 by 2 pieces.'],
    parent: {notice: 'Whether your child uses puzzle 10’s reason to plan four pieces.', prompt: 'Why do four pieces of one size fit?', explanation: 'The space round the dashed square is a frame 2 squares wide. Four 5 by 2 pieces, each along one side and reaching one corner, fill it like a pinwheel: 4 × 10 = 40 = 49 − 9. From the 10 by 4: halve it into two 10 by 2 strips, then cut each strip in half, three cuts. Two 7 by 2 and two 3 by 2 pieces (strips cut at 7) fill it too.', extension: 'Fill the frame with two 7 by 2 and two 3 by 2 pieces.', connection: 'Puzzle 10’s four squares show that four pieces are needed; here four are enough.'},
    provenance: 'New: the review card’s hole-place goal with the fewest cuts it needs, after puzzle 10.'},
  {n: 12, level: 'hard', kind: 'rebuild', title: 'Three by three gone', q: {home: {w: 5, h: 5, notch: 3}, cuts: 2}, check: {answers: ['8x2', '4x4'], mat: [9, 5]},
    idea: 'With two cuts the shape makes the 8 by 2 it came from, and also a 4 by 4 square: 16 squares is 4 by 4.',
    hints: ['Make the rectangle it came from first.', 'Sixteen squares could make a square. How long is its side?', 'Cut off the 2 by 1 at the top, then cut a 3 by 2 off the bottom right. The three pieces make a 4 by 4.'],
    parent: {notice: 'Whether your child looks for a square once the 8 by 2 is found, and connects 16 with 4 by 4.', prompt: 'The reshaping move never makes a square. How did cutting make one?', explanation: 'One cut along a line from the missing corner gives a 3 by 2 and a 5 by 2, which make the 8 by 2. Two cuts can give a 2 by 1, a 4 by 2 and a 3 by 2, which make a 4 by 4, since 16 is a square number. The reshaping move (8 by 2, then 5 by 16/5, …) always keeps one side the average and closes in on 4 without reaching it; cutting freely reaches a square whenever the area is a square number. No other rectangle comes from two cuts.', extension: 'Which rectangles can the 4 by 4 with a 2 by 2 corner gone make with two cuts? (Still only 6 by 2 and 4 by 3.)', connection: 'Any two shapes of the same area made of squares can be cut into each other (into single squares, if nothing else); the question is how few cuts are enough.'},
    provenance: 'New: the review card’s reverse move with two cuts, on the shape the 8 by 2 of puzzle 5 leaves.'}
];

const id = n => `reshape-${String(n).padStart(2, '0')}`;
const dims = cells => { const r = rectOf(cells); return r ? `${Math.max(r[2], r[3])}x${Math.min(r[2], r[3])}` : 'corner'; };
const region = (s, hole) => { const hs = new Set(hole ? rectCells(hole[0], hole[1], hole[2], hole[2]).map(cellKey) : []); return rectCells(0, 0, s, s).filter(c => !hs.has(cellKey(c))); };
// Ways to fill a square of side s with the pieces from at most `cuts` cuts
// of the start, leaving the marked square (or any square of side `side`).
function squareWays(start, s, cuts, hole, side) {
  const holes = hole ? [hole] : [];
  if (!hole) for (let y = 0; y + side <= s; y++) for (let x = 0; x + side <= s; x++) holes.push([x, y, side]);
  const out = [];
  for (const way of partitions([start], cuts)) for (const h of holes) if (cover(region(s, h), way.pieces)) out.push({pieces: way.pieces.map(dims).sort().reverse().join(' '), hole: h});
  return out;
}
function rebuildAnswers(start, cuts) {
  const area = start.length, out = new Set(), ways = partitions([start], cuts);
  for (let S = 1; S * S <= area; S++) if (area % S === 0 && ways.some(way => cover(rectCells(0, 0, area / S, S), way.pieces))) out.add(rectKey(area / S, S));
  return [...out];
}
// A witness: hints from a fresh board to a solve.
function witness(p) {
  let b = mech.fresh(p);
  const moves = [];
  for (let i = 0; i < 60 && !mech.solved(p, b); i++) {
    const h = mech.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: hint ${i} is a move`);
    moves.push(h.action);
    b = mech.move(p, b, h.action);
    assert.ok(b, `${p.id}: hint ${i} is legal`);
  }
  assert.ok(mech.solved(p, b), `${p.id}: hints solve it`);
  return moves;
}

const out = PUZZLES.map(item => {
  const c = item.check, q = {mode: item.kind === 'rebuild' ? 'rebuild' : 'square', ...item.q}, start = startCells(q.home);
  if (item.kind === 'rebuild') {
    const answers = rebuildAnswers(start, q.cuts);
    assert.deepEqual([...answers].sort(), [...c.answers].sort(), `${id(item.n)}: rectangles`);
    q.answers = c.answers;
    q.mat = {cols: c.mat[0], rows: c.mat[1]};
    for (const k of answers) { const [L, S] = k.split('x').map(Number); assert.ok(L <= q.mat.cols && S <= q.mat.rows, `${id(item.n)}: ${k} fits the grid`); }
    assert.ok(q.mat.cols * q.mat.rows > start.length + 4, `${id(item.n)}: the grid is roomier than the area`);
  } else {
    const a = q.home.h, b = q.home.w, m = (a + b) / 2;
    assert.ok(a < b && Number.isInteger(m), `${id(item.n)}: an a by b rectangle with a whole average side`);
    q.mat = {cols: m, rows: m};
    q.side = (b - a) / 2;
    if (item.kind === 'square') {
      assert.equal(q.side, c.side, `${id(item.n)}: the side left over`);
      assert.equal(m * m - a * b, q.side * q.side, `${id(item.n)}: m² − ab = d²`);
      const ways = squareWays(start, m, q.cuts, null, q.side);
      assert.deepEqual([...new Set(ways.map(w => w.pieces))], c.pieces, `${id(item.n)}: the pieces of every one-cut solve`);
      const corners = new Set(ways.map(w => `${w.hole[0]},${w.hole[1]}`));
      assert.deepEqual([...corners].sort(), ['0,0', `0,${m - q.side}`, `${m - q.side},0`, `${m - q.side},${m - q.side}`].sort(), `${id(item.n)}: the square left over is in a corner`);
      assert.equal(squareWays(start, m, 0, null, q.side).length, 0, `${id(item.n)}: no solve without a cut`);
    } else {
      q.cant = true;
      const fewest = [0, 1, 2, 3, 4].find(k => squareWays(start, m, k, q.hole).length);
      assert.equal(fewest, c.fewest, `${id(item.n)}: fewest cuts`);
      const most = mostApart(region(m, q.hole)).length;
      assert.equal(most, c.apart, `${id(item.n)}: the most squares that need their own pieces`);
      assert.equal(most, fewest + 1, `${id(item.n)}: the certificate meets the fewest`);
      if (c.claim) {
        assert.ok(q.cuts < fewest && apart(region(m, q.hole), c.claim) && c.claim.length === q.cuts + 2, `${id(item.n)}: the certificate`);
        q.apart = c.claim;
        q.cantText = item.cantText;
      } else assert.ok(q.cuts >= fewest && most <= q.cuts + 1, `${id(item.n)}: solvable, and no certificate`);
    }
  }
  const objective = OBJECTIVE[item.kind](q.cuts);
  const p = {
    id: id(item.n), number: item.n, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'reshape', libraryFamily: 'tile', group: 'Missing square', familyTitle: 'Tile gardens', revision: 1, sourceDocument: 'docs/reshape/README.md',
    parameters: q, objective: objective[0], visibleObjective: objective[1], instruction: objective[0],
    controls: CONTROLS[item.kind], rules: RULES[item.kind](q.cuts), idea: item.idea, prerequisites: PREREQ[item.kind], hints: item.hints,
    parent: {...item.parent, sourceIds: item.n === 7 || item.n === 12 ? [...sources, 'reshape-newton'] : sources},
    provenance: item.provenance
  };
  p.solution = q.apart ? {claim: q.apart} : {moves: witness(p)};
  if (q.apart) {
    const more = squareWays(start, q.mat.cols, q.cuts + 1, q.hole);
    assert.ok(more.length, `${p.id}: one more cut does it`);
    p.solution.withOneMoreCut = more[0].pieces;
  }
  if (q.mode === 'rebuild') p.solution.answers = q.answers;
  return p;
});

// Numbers the copy names, checked once more.
const L = (m, d) => startCells({w: m, h: m, notch: d});
assert.deepEqual(rebuildAnswers(L(3, 1), 2).sort(), ['4x2', '8x1'], 'two cuts make 8 by 1 from the 3 by 3 with a corner gone');
assert.deepEqual(rebuildAnswers(L(4, 2), 2).sort(), ['4x3', '6x2'], 'two cuts still make only 6 by 2 and 4 by 3');
assert.ok(squareWays(startCells({w: 8, h: 2}), 4, 1, null, 0).length, '8 by 2 into 4 by 4 with nothing over');
assert.ok(squareWays(startCells({w: 9, h: 1}), 5, 1, null, 4).length, '9 by 1 into 5 by 5 leaves 4');
assert.ok(squareWays(startCells({w: 10, h: 4}), 7, 3, [2, 2, 3]).some(w => w.pieces === '7x2 7x2 3x2 3x2'), 'two 7 by 2 and two 3 by 2 fill the frame');
assert.ok(squareWays(startCells({w: 10, h: 4}), 7, 3, [2, 2, 3]).some(w => w.pieces === '5x2 5x2 5x2 5x2'), 'the pinwheel');

const json = {
  title: 'Missing square',
  version: 1,
  families: [{id: 'reshape', title: 'Tile gardens: missing square', mathematics: 'An a by b rectangle (a < b) and the square whose side is the average of its sides, m = (a + b)/2. Cut the rectangle into an m by a piece and an a by (b − a)/2 piece: the first lies across the square and leaves a band (b − a)/2 tall, which the second fills except one square of side (b − a)/2. So m² = ab + ((b − a)/2)²: the average-side square always has more area than the rectangle, by exactly that square. Shortening the square’s other side to ab/m keeps the area: that is Week 93’s reshaping move, which narrows the side of the equal-area square between ab/m and m every time and never reaches it (Newton’s method for a square root). With one straight cut the only solve cuts m off the long side, and the square left over sits in a corner; other places need more pieces, and squares that pairwise can’t share a rectangular piece prove how many.', rules: RULES.square(1), sourceIds: [...sources, 'reshape-newton']}],
  sources: [
    {id: 'reshape-week93', title: 'Bellingham Math Circle — Week 93: Squaring a rectangle (students W93-S-v3, Grades 3–5, and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-93', kind: 'local curriculum'},
    {id: 'reshape-card93', title: 'Week 93 review card (keep, fit B, size S), with its App fit for this group', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-93.md', kind: 'local curriculum'},
    {id: 'reshape-newton', title: 'Tobin A. Driscoll and Richard J. Braun — Fundamentals of Numerical Computation, section 4.3 (Newton’s method), the Week 93 guide’s mathematical source', url: 'https://fncbook.com/newton/', kind: 'reference'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/reshape/reshape.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${p.parameters.home.w}x${p.parameters.home.h}${p.parameters.home.notch ? `-${p.parameters.home.notch}` : ''} cuts ${p.parameters.cuts} ${JSON.stringify(p.solution).slice(0, 110)}`).join('\n'));
