// Authoring list for Shrink strips (worksheet Week 76, substitution strips).
// Computes every answer with the mechanic's own functions, checks them against
// the table in docs/shrink/README.md, checks that the choice of tiles matters
// in every impostor but the first, finds a witness by following the hints,
// and writes dist/families/shrink/shrink.json. scripts/validate-shrink.mjs
// checks the answers again against the Thue–Morse word itself.
// Run: node scripts/build-shrink.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fitsOf, fixesOf, stuckRuns, real, shrinkMechanics, flipAt} from '../dist/families/shrink/shrink.js';

const RULES = [
  'A row grows by turning every A into AB and every B into BA, all at once: A, AB, ABBA, ABBABAAB, and on. A piece is a run of tiles cut from a grown row.',
  'Shrinking undoes one step. Seams split the row into pairs in one of two ways: pair the first two tiles, or leave the first tile alone. A tile cut off from its partner at an end gets the partner back as a dashed ghost, the other letter.',
  'Each pair shrinks to its first letter. A pair AA or BB is marked: no tile grows into it.',
  'A row of two different tiles is one pair, so its seams go only at its ends.',
  'A row is stuck when each way of placing its seams marks a pair or shrinks to a stuck row. Only rows of three tiles or more can be stuck.'
];
const MODE_RULES = {
  seams: 'Keep puts the seams on a piece’s top row on the shelf once the rows below show them shrinking to one tile; a tap on the shelf takes one back. That’s all checks the whole shelf at once and can be pressed again once the shelf changes.',
  impostor: 'Choose a run of at most the number of tiles shown. The puzzle is solved when the chosen tiles are stuck.',
  repair: 'One tile is flipped at a time; flipping another puts the first back. Keep puts the flip on the shelf once the rows below show the piece shrinking to one tile; That’s all checks the whole shelf at once.',
  playground: 'Grow adds the next row, up to five rows. The top tile switches between A and B.'
};
const OPENER = 'A row grows by turning every A into AB and every B into BA, so a grown row splits into pairs AB and BA. Shrink undoes that: seams split a row into pairs, a tile cut off at an end gets its partner back (dashed, the other letter), and each pair becomes its first letter. A pair AA or BB is marked.';
const ROWS = 'Tap a row at a join between two tiles, or at an end, to place seams there and every two tiles along it; tap it again to move them over one. Shrink makes the row below. A row is stuck (✕) when each way of placing its seams is marked or stuck below.';
const CONTROLS = {
  seams: `${OPENER} Tap a piece to work on it. ${ROWS} Once the rows show the seams on the top row shrinking to one tile, Keep keeps them; tap a kept one to take it back. Press That’s all when every way that can shrink to one tile is kept. Undo takes back the last move.`,
  impostor: `${OPENER} Tap two tiles of the strip, or slide along it, to choose them and the tiles between. ${ROWS} Undo takes back the last move.`,
  repair: `${OPENER} Tap a tile to flip it, and again to flip it back. ${ROWS} Once the rows show the piece shrinking to one tile, Keep keeps the flip; tap a kept one to take it back. Press That’s all when every flip that lets the piece shrink to one tile is kept. Undo takes back the last move.`,
  playground: 'A row grows by turning every A into AB and every B into BA, all at once. Press Grow for the next row. Tap the top tile to start from the other letter.'
};
const OBJECTIVE = {
  seams: () => 'Keep every way to place seams on each piece from which it can shrink to one tile, then press That’s all.',
  impostor: k => `Choose at most ${k} tiles of the strip and shrink them until every way is stuck.`,
  repair: () => 'Flip one tile at a time. Keep every flip that lets the piece shrink to one tile, then press That’s all.'
};
const VISIBLE = {
  seams: () => 'Keep every way to place seams that lets a piece shrink to one tile.',
  impostor: k => `Choose at most ${k} tiles that get stuck.`,
  repair: () => 'Keep every flip that lets the piece shrink to one tile.'
};
const PREREQUISITES = {
  seams: 'Read the letters A and B and see whether two letters are the same. No arithmetic. Following a row down through several shrinks takes patience; a grown-up can read How to play.',
  impostor: 'Read A and B and keep several rows in view. Choosing which tiles to test is the puzzle; the rows below are built one tap at a time.',
  repair: 'Read A and B, try a flip, shrink, and try another. Spotting AAA or BBB saves work.',
  playground: 'None beyond reading A and B.'
};
const sources = ['shrink-week76', 'shrink-card76', 'shrink-allouche'];
// The first 64 tiles of the grown row: tile n (from 0) is A when n has an
// even number of ones in binary.
const T = Array.from({length: 64}, (_, n) => n.toString(2).split('1').length % 2 ? 'A' : 'B').join('');
// Two neighbouring tiles i and i + 1 swapped.
const swapAt = (w, i) => w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);

// Each puzzle with the answer the table in docs/shrink/README.md gives.
// seams: check is the kept [piece, way] pairs (way 0 pairs the first two
// tiles, 1 leaves the first tile alone). repair: the tiles (from 0) whose flip
// fixes the piece. impostor: the leftmost shortest stuck run, the shortest
// length and the number of stuck runs of at most k tiles.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three short pieces', mode: 'seams', pieces: ['ABA', 'BAABA', 'AABB'], check: [[0, 0], [0, 1], [1, 0], [2, 1]],
    idea: 'A grown row is made of pairs AB and BA, so a way of placing seams that marks AA or BB is not how the piece was cut; a piece as short as ABA fits both ways.',
    hints: ['Try both ways of placing seams on each piece, and shrink.', 'A way that marks AA or BB is stuck. ABA has no AA or BB either way.', 'Keep ABA both ways, BAABA paired from the first tile, and AABB with the first tile alone.'],
    parent: {notice: 'Whether your child shrinks before keeping a way or keeps it on sight, and whether they expect one way per piece.', prompt: 'Where could ABA have been cut from? Can you find it in ABBABAABBAABABBA?',
      explanation: 'A piece of a grown row has its seams either just before its first tile or one tile in. ABA fits both ways: paired from the first tile it is AB|A(B), which shrinks to AA, and with the first tile alone it is (B)A|BA, which shrinks to BB; each goes on to one tile (AA, BA, B and BB, AB, A). In ABBABAABBAABABBA it sits at tiles 4–6 and 11–13, once each way. BAABA fits only paired from the first tile: BA|AB|A(B) shrinks to BAA, then BA and B, while the other way marks AA. AABB fits only with the first tile alone: (B)A|AB|B(A) shrinks to BAB, then BB, AB and A. Four ways in all.',
      extension: 'Which other pieces of three tiles fit both ways? (Only BAB.) Can a piece of four tiles?', connection: 'The Thue–Morse word is the fixed point of the substitution A → AB, B → BA. Shrinking is desubstitution; pieces of four tiles or more can be cut into pairs in only one way, the word’s recognizability.'},
    provenance: 'Week 76 Problem 4 (student page 3, Grades 3–5): the pieces ABA, BAABA and AABB, “Find every way to pair the tiles as AB or BA”, with ghosts in place of the worksheet’s lone tiles.'},
  {number: 2, level: 'easy', title: 'A repeating strip', mode: 'impostor', block: 'AB', copies: 6, endless: true, k: 6, check: {run: [0, 4], shortest: 5, dead: 15},
    idea: 'ABABA is in no grown row: it shrinks to AAA one way and BBB the other, and both mark a pair. So a strip repeating AB is an impostor.',
    hints: ['Choose a few tiles and shrink them. Does every way get stuck?', 'Runs of four tiles or fewer all shrink to one tile. Try five.', 'Choose tiles 1 to 5, ABABA. Paired from the first tile it shrinks to AAA, with the first tile alone to BBB, and both mark a pair.'],
    parent: {notice: 'Whether your child tries one way of placing seams and stops, or checks both ways before calling a row stuck.', prompt: 'Could a grown row have ABABA in it? Where would its seams go?',
      explanation: 'ABABA paired from the first tile is AB|AB|A(B) and shrinks to AAA; with the first tile alone it is (B)A|BA|BA and shrinks to BBB. AAA and BBB mark a pair both ways, so ABABA is stuck: no grown row has it, and a strip repeating AB is not cut from one. Shorter runs are not enough: AB, BA, ABA, BAB, ABAB and BABA all shrink to one tile, though ABAB only when paired from the first tile (the other way gives BBB).',
      extension: 'Why can’t AAA or BBB sit in a grown row? (Any three neighbours include a whole pair.)', connection: 'ABABA is an overlap: AB twice and then A again. Thue proved in 1912 that the Thue–Morse word has no overlaps at all.'},
    provenance: 'Week 76 Problem 6 (student page 4, Grades 3–5): the strip that repeats AB forever, “find a finite piece that cannot occur in any row grown from A”.'},
  {number: 3, level: 'easy', title: 'A flipped tile', mode: 'repair', piece: 'AABBBABA', check: [4],
    idea: 'Three equal tiles never sit in a grown row, so the flipped tile is in BBB; only one of its three tiles fixes the piece.',
    hints: ['Shrink the piece as it is. Then try a flip and shrink again.', 'BBB can’t be in a grown row. Which of its tiles would you flip?', 'Flip tile 5 and keep it: AABBAABA shrinks to BABAA, BBA, AB and A. Flipping tile 3 or 4 leaves the piece stuck.'],
    parent: {notice: 'Whether your child flips a tile of BBB at once, and whether they see that the middle B makes a new problem.', prompt: 'There are three B’s together. Which one would you change, and why does it matter which?',
      explanation: 'A grown row is made of pairs AB and BA, so it never has three equal tiles in a row. AABBBABA has BBB at tiles 3–5, so the flipped tile is one of those. Flipping tile 3 gives AAABBABA, with AAA. Flipping tile 4 gives AABABABA, which hides ABABA, stuck both ways. Flipping tile 5 gives AABBAABA: with the first tile alone it is (B)A|AB|BA|AB|A(B), which shrinks to BABAA, then BBA, AB and A. A flip anywhere else leaves BBB, so tile 5 is the one fix.',
      extension: 'Flip one tile of the grown row ABBABAAB and give it to a partner. Do they always find your tile, and only your tile?', connection: 'A single wrong letter in a piece of the Thue–Morse word usually makes a short stuck run next to it, which narrows down where it is.'},
    provenance: 'New instance on Week 76 Problems 3–4: a piece of a grown row (AABBAABA) with one tile flipped, as the review card’s Decision asks.'},
  {number: 4, level: 'medium', title: 'Three more pieces', mode: 'seams', pieces: ['ABAB', 'BAB', 'ABBAABBA'], check: [[0, 0], [1, 0], [1, 1], [2, 0]],
    idea: 'A way with no marked pair can still be stuck lower down: ABAB with the first tile alone shrinks to BBB.',
    hints: ['Before you keep a way, shrink it to one tile.', 'ABAB with the first tile alone shrinks to BBB. What happens to BBB?', 'Keep ABAB paired from the first tile, BAB both ways, and ABBAABBA paired from the first tile.'],
    parent: {notice: 'Whether your child keeps ABAB with the first tile alone because its top row has no AA or BB.', prompt: 'This way has no marked pair. Is that enough?',
      explanation: 'ABAB paired from the first tile is AB|AB, which shrinks to AA and on to one tile (AA, BA, B). With the first tile alone it is (B)A|BA|B(A), which shrinks to BBB, and BBB marks a pair both ways: stuck. BAB fits both ways (BA|B(A) shrinks to BB, (A)B|AB to AA). ABBAABBA paired from the first tile shrinks to ABAB, then AA, BA and B; with the first tile alone it marks BB. Four ways.',
      extension: 'Worksheet Problem 5: can a piece of five tiles fit both ways?', connection: 'Recognizability: a long enough piece of the Thue–Morse word has only one way to be cut into pairs (from four tiles on), while ABA and BAB have two.'},
    provenance: 'Week 76 Problem 4 (student page 3, Grades 3–5): the piece ABBAABBA, with ABAB and BAB added (new) for a way that is stuck one row down.'},
  {number: 5, level: 'medium', title: 'Nearly a grown row', mode: 'impostor', strip: swapAt(T.slice(17, 33), 11), endless: false, k: 10, check: {run: [4, 11], shortest: 8, dead: 6},
    idea: 'A strip with no AAA, BBB or ABABA on top can still hide a stuck run: BBAABBAA shrinks to ABABA one row down.',
    hints: ['Choose a long run and shrink it. Look at the shrunk rows too.', 'Nothing on top is AAA, BBB or ABABA. Find BB, AA, BB, AA in a row and shrink it.', 'Choose tiles 5 to 12, BBAABBAA. With the first tile alone it shrinks to ABABA; paired from the first tile it marks BB.'],
    parent: {notice: 'Whether your child looks for AAA or ABABA in the shrunk rows as well as on the strip, and whether they move along the strip when a run fits.', prompt: 'Nothing looks wrong on top. What does this stretch shrink to?',
      explanation: 'The strip is tiles 18 to 33 of the grown row ABBABAABBAABABBABAABABBAABBABAAB… with its 12th and 13th tiles swapped (BA to AB). On top it has no AAA, BBB, ABABA or BABAB, and every run of seven tiles or fewer sits in a grown row. Tiles 5–12, BBAABBAA, are stuck: paired from the first tile they mark BB; with the first tile alone they are (A)B|BA|AB|BA|A(B), which shrinks to ABABA, and ABABA shrinks to AAA or BBB. The six stuck runs of ten tiles or fewer all contain tiles 5–12; three of the seven runs of ten are stuck, the middle three.',
      extension: 'BBAABBAA is a stretch of the strip that repeats ABBA (worksheet Problem 6). What does that whole strip shrink to?', connection: 'Shrinking the strip that repeats ABBA gives the strip that repeats AB, which has the overlap ABABA. Two swapped tiles in a grown row make a stretch of it, so the error shows only one row down.'},
    provenance: 'New instance on Week 76 Problem 6, as the review card’s Decision asks for a long grown strip with an error: here two neighbouring tiles are swapped, which hides the ABBA strip’s stuck run BBAABBAA.'},
  {number: 6, level: 'medium', title: 'One tile wrong', mode: 'repair', piece: 'ABBABBAB', check: [1, 4, 5],
    idea: 'One flipped tile can have more than one repair: three different flips each give a piece of a grown row.',
    hints: ['Shrink the piece both ways. Which tiles are in a marked pair?', 'Paired from the first tile, BB at tiles 5 and 6 is marked; with the first tile alone, BB at tiles 2 and 3. A fix flips one of these.', 'Keep the flips of tiles 2, 5 and 6.'],
    parent: {notice: 'Whether your child stops at the first fix, perhaps ABBABAAB, which is a whole grown row.', prompt: 'You found one fix. Could a different tile have been the flipped one?',
      explanation: 'ABBABBAB is stuck: paired from the first tile it marks BB at tiles 5–6, and with the first tile alone BB at tiles 2–3. A flip elsewhere leaves both marks, so a fix flips one of tiles 2, 3, 5 and 6. Tile 6 gives ABBABAAB, the grown row itself. Tile 5 gives ABBAABAB, which shrinks to ABAA, then BBA, AB and A. Tile 2 gives AABABBAB, which with the first tile alone shrinks to BAABB, then BAB, BB, AB and A. Tile 3 gives ABAABBAB, whose unmarked way shrinks to BBABB, stuck. Three fixes.',
      extension: 'Make a piece of eight tiles with one flipped tile and exactly two fixes.', connection: 'An error in a piece of the Thue–Morse word can be detected without being located: several one-letter changes return to the word’s pieces.'},
    provenance: 'Week 76 Problem 3 (student page 2, Grades 3–5): the third claim, ABBABBAB, here as a cut piece to repair.'},
  {number: 7, level: 'medium', title: 'One long strip', mode: 'impostor', strip: flipAt(T.slice(2, 18), 12), endless: false, k: 6, check: {run: [8, 12], shortest: 5, dead: 3},
    idea: 'One wrong tile in a long piece of a grown row shows up as a short stuck run right next to it.',
    hints: ['Choose a few tiles and shrink them. Move along the strip.', 'Look for A and B taking turns five times.', 'Choose tiles 9 to 13, ABABA: it shrinks to AAA or BBB.'],
    parent: {notice: 'Whether your child sweeps along the strip run by run, or looks for a pattern they know is stuck.', prompt: 'Where along the strip does it stop looking like a grown row?',
      explanation: 'The strip is tiles 3 to 18 of the grown row ABBABAABBAABABBABAAB… with its 13th tile flipped from B to A. Tiles 9–13, ABABA, shrink to AAA one way and BBB the other, both stuck. Only three runs of six tiles or fewer are stuck: ABABA and the two six-tile runs that contain it. Every other run shrinks to one tile.',
      extension: 'Flip a different tile of a long grown row. Is there always a short stuck run next to the flip?', connection: 'Pieces of the Thue–Morse word are recognized by desubstitution, a little at a time, so an error is found by the short window around it.'},
    provenance: 'New instance for Week 76 Problem 6, as the review card’s Decision asks: a long grown strip with one tile flipped.'},
  {number: 8, level: 'hard', title: 'Another repeating strip', mode: 'impostor', block: 'AABABB', copies: 3, endless: true, k: 9, check: {run: [2, 9], shortest: 8, dead: 6},
    idea: 'Every short run of this strip fits a grown row; the impostor needs eight tiles, and it fails one row down, where AABAA marks a pair both ways.',
    hints: ['Choose a long run and shrink it. If it fits, slide the run along.', 'Runs of seven tiles or fewer all shrink to one tile.', 'Choose tiles 3 to 10, BABBAABA: paired from the first tile it marks BB, and with the first tile alone it shrinks to AABAA, which marks AA both ways.'],
    parent: {notice: 'Whether your child keeps choosing runs from the start of the strip, and whether shifting a run by a tile or two changes the result.', prompt: 'This run shrinks fine. What if it starts one tile later?',
      explanation: 'Every run of up to seven tiles of AABABB repeated sits in some grown row. BABBAABA (tiles 3–10, and again from tile 9) is stuck: paired from the first tile it marks BB; with the first tile alone it is (A)B|AB|BA|AB|A(B) and shrinks to AABAA, which marks AA paired from the first tile and, as (B)A|AB|AA, with the first tile alone too. The two nine-tile runs that contain it are stuck; every other run of nine tiles or fewer shrinks to one tile.',
      extension: 'Why must a long enough run of any repeating strip be stuck? (Two blocks and one tile more make an overlap.)', connection: 'Thue’s overlap-freeness: a strip that repeats a block u has the overlap uua, which no grown row contains; here a shorter run already fails.'},
    provenance: 'New instance on Week 76 Problem 6: a repeating strip whose short runs all fit.'},
  {number: 9, level: 'hard', title: 'Doubled letters', mode: 'repair', piece: 'AABBAABB', check: [0, 7],
    idea: 'When every inner flip makes three equal tiles, a fix must be at an end, and here either end works.',
    hints: ['Shrink the piece. Then try a flip and shrink again.', 'Flipping a tile in the middle makes AAA or BBB.', 'Keep the flips of tile 1 and tile 8.'],
    parent: {notice: 'Whether your child rules out the middle tiles by spotting AAA or BBB, and then tries both ends.', prompt: 'Which tiles can you rule out without shrinking?',
      explanation: 'AABBAABB is stuck: paired from the first tile it marks AA, and with the first tile alone it shrinks to BABAB, which is stuck. Flipping any of tiles 2 to 7 makes AAA or BBB. Flipping tile 1 gives BABBAABB, which with the first tile alone shrinks to AABAB, then BAA, BA and B. Flipping tile 8 gives AABBAABA, which shrinks to BABAA, then BBA, AB and A. Two fixes, one at each end: the piece alone can’t tell which end was wrong.',
      extension: 'Find a piece with one flipped tile whose only fix is in the middle. (Puzzle 3 is one.)', connection: 'Locating an error needs room on both sides of it: near the ends of a piece the evidence can point two ways.'},
    provenance: 'New instance on Week 76 Problems 3–4: a piece with one tile flipped and two fixes, as the review card’s Decision asks.'},
  {number: 10, level: 'hard', title: 'A grown row over and over', mode: 'impostor', block: 'ABBABAAB', copies: 3, endless: true, k: 15, check: {run: [3, 16], shortest: 14, dead: 6},
    idea: 'A grown row repeated forever is not a grown row: shrinking three times reaches ABABA.',
    hints: ['Shrink a long run. What strip do the shrunk rows come from?', 'ABBABAAB repeated shrinks to ABBA repeated, and then to AB repeated. Which tiles shrink to ABABA?', 'Choose tiles 4 to 17, ABAABABBABAABA: with the first tile alone it shrinks to BBAABBAA, then ABABA, which is stuck both ways.'],
    parent: {notice: 'Whether your child shrinks the whole strip: it shrinks to ABBA repeated and then to AB repeated, puzzle 2’s strip.', prompt: 'What does this strip shrink to? And that one?',
      explanation: 'ABBABAAB repeated, paired from the first tile, shrinks to ABBA repeated and then to AB repeated, which has ABABA. Tracing ABABA back up gives ABAABABBABAABA (tiles 4–17, and its swap BABBABAABABBAB from tile 8): paired from the first tile it marks AA; with the first tile alone it shrinks to BBAABBAA, which marks BB one way and shrinks to ABABA the other, and ABABA shrinks to AAA or BBB. No run of thirteen tiles or fewer is stuck.',
      extension: 'Two copies, ABBABAABABBABAAB, do sit in a grown row (worksheet Problem 3 asks whether it is a whole one). Where?', connection: 'Squares such as ABBABAABABBABAAB occur in the Thue–Morse word, but overlaps do not (Thue, 1912), so three copies of a block never do.'},
    provenance: 'Week 76 Problem 3 (student page 2): the fourth claim, ABBABAAB twice, repeated forever as in Problem 6; new instance.'}
];

const id = n => `shrink-${String(n).padStart(2, '0')}`;
const hintMoves = new Map();
// The runs the grown-up explanations name, by first tile (counting from 1).
const NAMED = {
  5: [[5, 'BBAABBAA']],
  7: [[9, 'ABABA']],
  8: [[3, 'BABBAABA'], [9, 'BABBAABA']],
  10: [[4, 'ABAABABBABAABA'], [8, 'BABBABAABABBAB']]
};
const mech = shrinkMechanics.shrink;
// The hints followed from a fresh board, which must solve it.
function hintChain(p) {
  let b = mech.fresh(p);
  const moves = [];
  for (let i = 0; i < 80 && !mech.solved(p, b); i++) {
    const h = mech.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
    moves.push(h.action);
    b = mech.move(p, b, h.action);
    assert.ok(b, `${p.id}: the hint ${JSON.stringify(h.action)} is legal`);
  }
  assert.ok(mech.solved(p, b), `${p.id}: the hints solve it`);
  return moves;
}
const out = PUZZLES.map(item => {
  let q, solution;
  if (item.mode === 'seams') {
    q = {mode: 'seams', pieces: item.pieces};
    assert.deepEqual(fitsOf(q.pieces), item.check, `${id(item.number)}: the ways`);
    solution = {ways: item.check};
  } else if (item.mode === 'repair') {
    q = {mode: 'repair', piece: item.piece};
    assert.ok(!real(q.piece), `${id(item.number)}: the piece is stuck`);
    assert.deepEqual(fixesOf(q.piece), item.check, `${id(item.number)}: the fixes`);
    solution = {fixes: item.check};
  } else {
    const strip = item.strip ?? item.block.repeat(item.copies);
    q = {mode: 'impostor', strip, endless: item.endless, k: item.k};
    const runs = stuckRuns(q), lengths = runs.map(([a, z]) => z - a + 1), shortest = Math.min(...lengths);
    assert.equal(shortest, item.check.shortest, `${id(item.number)}: the shortest stuck run`);
    assert.deepEqual(runs[0], item.check.run, `${id(item.number)}: the leftmost shortest stuck run`);
    assert.equal(runs.length, item.check.dead, `${id(item.number)}: stuck runs of at most k tiles`);
    assert.ok(item.k > shortest, `${id(item.number)}: the budget is not the shortest`);
    if (item.endless) assert.ok(strip.length >= item.k + item.block.length - 1, `${id(item.number)}: the strip shows every run of at most k tiles of the endless strip`);
    // Past the first (puzzle 2, where every run of k tiles is stuck), the
    // choice of tiles matters: some runs of k tiles fit a grown row.
    const full = Array.from({length: strip.length - item.k + 1}, (_, a) => strip.slice(a, a + item.k));
    if (item.number !== 2) assert.ok(full.some(w => real(w)), `${id(item.number)}: some run of ${item.k} tiles fits`);
    solution = {run: item.check.run, word: strip.slice(item.check.run[0], item.check.run[1] + 1), stuckRuns: runs};
    for (const [from, w] of NAMED[item.number] || []) {
      assert.equal(strip.slice(from - 1, from - 1 + w.length), w, `${id(item.number)}: ${w} from tile ${from}`);
      assert.ok(item.parent.explanation.includes(w) || item.hints.some(h => h.includes(w)), `${id(item.number)}: ${w} is named`);
      assert.ok(!real(w), `${id(item.number)}: ${w} is stuck`);
    }
  }
  const p = {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Shrink strips', mechanic: 'shrink', band: 'all', revision: 1, sourceDocument: 'docs/shrink/README.md',
    parameters: q,
    objective: OBJECTIVE[item.mode](item.k), visibleObjective: VISIBLE[item.mode](item.k), instruction: OBJECTIVE[item.mode](item.k),
    controls: CONTROLS[item.mode], rules: [...RULES, MODE_RULES[item.mode]],
    idea: item.idea, prerequisites: PREREQUISITES[item.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution: null, provenance: item.provenance
  };
  // The witness is the hint chain: an impostor's run and its certificate;
  // each answer shrunk to one tile and kept, then That's all.
  const moves = hintChain(p);
  let b = mech.fresh(p);
  for (const m of moves) { b = mech.move(p, b, m); assert.ok(b, `${p.id}: the witness move ${JSON.stringify(m)} is legal`); }
  assert.ok(mech.solved(p, b), `${p.id}: the witness solves`);
  p.solution = {...solution, moves};
  hintMoves.set(p.id, moves.length);
  return p;
});

const playground = {
  id: 'shrink-playground', number: 0, title: 'Shrink strips playground', difficulty_level: 'playground', familyTitle: 'Shrink strips', mechanic: 'shrink', band: 'playground', revision: 1, sourceDocument: 'docs/shrink/README.md',
  parameters: {mode: 'playground', rows: 5},
  objective: 'Grow rows from one tile.', visibleObjective: '', instruction: 'Grow rows from one tile.',
  controls: CONTROLS.playground, rules: [RULES[0], MODE_RULES.playground],
  idea: 'Free play with the growth rule: each row is the row before followed by the row before with A and B swapped.',
  prerequisites: PREREQUISITES.playground,
  hints: ['Before you grow the next row, say how it will start.', 'Each row starts with the whole row before it.', 'The second half of each row is the first half with A and B swapped.'],
  parent: {notice: 'Whether your child predicts the next row before pressing Grow, and whether they spot the row before inside the new one.', prompt: 'What will the next row start with? How will it end?',
    explanation: 'Each row is the row before with every A turned into AB and every B into BA, so it begins with the row before (A begins AB), and its second half is its first half with A and B swapped: A, AB, ABBA, ABBABAAB, ABBABAABBAABABBA. A grown row never has AAA or BBB, since it is made of pairs AB and BA.',
    extension: 'Without growing, which letter is tile 11 of the row of 16? (Count from 0: tile 11 is number 10, 1010 in binary, with an even number of ones, so A.)', connection: 'The Thue–Morse word: the tile numbered n (from 0) is A exactly when n has an even number of ones in binary. It turns up in Prouhet’s equal sums of powers, fair turn-taking and Thue’s overlap-free words.', sourceIds: sources},
  provenance: 'Week 76 Problem 1 (student page 1, Grades 3–5): grow a row of 16 tiles from A.'
};
{
  // The playground's rows are the prefixes of the Thue–Morse word.
  const grow = w => [...w].map(c => c === 'A' ? 'AB' : 'BA').join('');
  let w = 'A';
  for (let r = 1; r < playground.parameters.rows; r++) w = grow(w);
  assert.equal(w, T.slice(0, 16), 'playground: the fifth row is ABBABAABBAABABBA');
  assert.equal(T[10], 'A', 'playground extension: tile number 10');
}

const json = {
  title: 'Shrink strips',
  version: 1,
  families: [{id: 'shrink', title: 'Shrink strips', mathematics: 'Rows of A and B tiles grow by the substitution A → AB, B → BA, applied to every tile at once; from A they are the prefixes of the Thue–Morse word T, whose tile n (from 0) is A exactly when n has an even number of ones in binary. A piece is a factor of T. Shrinking is desubstitution: seams split a piece into pairs starting at its first or second tile, a tile cut off at an end gets the other letter as its ghost partner, and each pair becomes its first letter; a pair AA or BB is marked. A placement is unmarked with a factor as its shrunk row exactly when the piece occurs in T at a place of that parity, so a piece is a factor exactly when it can shrink, one unmarked placement at a time, to one tile (every word of one or two tiles is a factor, and from three tiles on each shrink is shorter). A non-factor is stuck: every placement, at some level, marks a pair, and the tree of placements is a finite certificate. Factors of four tiles or more have one placement (recognizability); ABA and BAB have two. T has no overlap (Thue 1912), so any repeating strip has a stuck run.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'shrink-week76', title: 'Bellingham Math Circle — Week 76: Substitution strips (student packet and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-76', kind: 'local curriculum'},
    {id: 'shrink-card76', title: 'Week 76 review card and math check (exact factor language, App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-76.md', kind: 'local curriculum'},
    {id: 'shrink-allouche', title: 'Jean-Paul Allouche and Jeffrey Shallit — The ubiquitous Prouhet–Thue–Morse sequence (1999): the substitution, the binary-digit formula and overlap-freeness', url: 'https://cs.uwaterloo.ca/~shallit/Papers/ubiq15.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/shrink/shrink.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${JSON.stringify(p.solution.ways ?? p.solution.fixes ?? [p.solution.run, p.solution.word])} (hints solve it in ${hintMoves.get(p.id)} moves)`).join('\n'));
