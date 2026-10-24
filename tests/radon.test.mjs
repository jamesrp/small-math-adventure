// Stretch bands: bands and when they meet, splits and the ones that meet,
// shelving splits with Meet and judging the shelf with That's all, placing D against a goal,
// every place for C, two boards with no common split, the playground, hints,
// Undo keeping claims, arrow keys, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {radonMechanics, hullOf, inHull, segmentsMeet, hullsMeet, sharedPart, splitList, splitOfColours, coloursOf, meetingSplits, commonSplits, answersOf, pairPlan, arrowPoint, soloHit} from '../dist/families/radon/radon.js';
import {loadPack} from '../scripts/packs.mjs';

const radon = JSON.parse(await readFile(new URL('../dist/families/radon/radon.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => radon.puzzles.find(p => p.id === id);
const mech = radonMechanics.radon;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const taps = s => [...s].map(label => ({type: 'tap', label}));
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoMove = (p, a) => { const next = undo(a); return {...next, board: mech.carry(p, a.board, next.board)}; };

test('bands: a dot, a segment or a filled shape, and when two meet', () => {
  assert.deepEqual(hullOf([[1, 1], [1, 1]]), [[1, 1]], 'one point twice is a dot');
  assert.deepEqual(hullOf([[0, 0], [2, 1], [4, 2]]), [[0, 0], [4, 2]], 'three on a line make a segment');
  assert.equal(hullOf([[0, 0], [4, 0], [0, 4], [1, 1]]).length, 3, 'a point inside drops out');
  const tri = hullOf([[0, 0], [4, 0], [0, 4]]);
  assert.ok(inHull([2, 2], tri), 'on an edge counts');
  assert.ok(!inHull([3, 2], tri));
  assert.ok(segmentsMeet([0, 0], [2, 2], [0, 2], [2, 0]), 'crossing');
  assert.ok(segmentsMeet([0, 0], [2, 0], [2, 0], [3, 1]), 'touching at an end');
  assert.ok(segmentsMeet([0, 0], [3, 0], [2, 0], [5, 0]), 'overlapping on a line');
  assert.ok(!segmentsMeet([0, 0], [1, 0], [2, 0], [3, 0]), 'apart on a line');
  assert.ok(!segmentsMeet([0, 0], [2, 0], [0, 1], [2, 1]), 'parallel');
  assert.ok(hullsMeet([[1, 1]], tri) && !hullsMeet([[5, 5]], tri));
  assert.ok(hullsMeet([[1, -1], [1, 5]], tri), 'a segment through a triangle');
  assert.deepEqual(sharedPart([[0, 0], [2, 2]], [[0, 2], [2, 0]]), {point: [1, 1]});
  assert.deepEqual(sharedPart([[0, 0], [1, 1]], [[0, 1], [1, 0]]), {point: [.5, .5]}, 'a crossing between points');
  assert.deepEqual(sharedPart([[0, 0], [3, 0]], [[2, 0], [5, 0]]), {segment: [[2, 0], [3, 0]]});
  assert.deepEqual(sharedPart([[1, -1], [1, 5]], tri), {segment: [[1, 0], [1, 3]]}, 'the part of a segment inside a triangle');
});

test('splits: seven of four letters, three of three, named by colours', () => {
  assert.deepEqual(splitList(['A', 'B', 'C', 'D']), ['A|BCD', 'AB|CD', 'AC|BD', 'AD|BC', 'ABC|D', 'ABD|C', 'ACD|B']);
  assert.deepEqual(splitList(['A', 'B', 'C']), ['A|BC', 'AB|C', 'AC|B']);
  assert.equal(splitOfColours(['A', 'B', 'C', 'D'], [0, 0, 0, 0]), null, 'one colour is not a split');
  assert.equal(splitOfColours(['A', 'B', 'C', 'D'], [1, 0, 1, 0]), 'AC|BD');
  assert.equal(splitOfColours(['A', 'B', 'C', 'D'], [0, 1, 1, 1]), 'A|BCD', 'swapping colours names the same split');
  assert.deepEqual(coloursOf(['A', 'B', 'C', 'D'], 'ABC|D', [1, 1, 1, 0]), [1, 1, 1, 0], 'the nearest colouring of a split');
  assert.deepEqual(coloursOf(['A', 'B', 'C', 'D'], 'ABC|D'), [0, 0, 0, 1]);
});

test('answers: the pack, the theorem cases', () => {
  for (const p of radon.puzzles.filter(x => x.band !== 'playground' && x.parameters.mode !== 'pair')) assert.deepEqual(answersOf(p.parameters), p.solution.answers, p.id);
  assert.deepEqual(meetingSplits({A: [0, 0], B: [4, 0], C: [0, 4], D: [1, 1]}), ['ABC|D'], 'a dot inside');
  assert.deepEqual(meetingSplits({A: [0, 0], B: [2, 0], C: [2, 2], D: [0, 2]}), ['AC|BD'], 'crossing diagonals');
  assert.deepEqual(meetingSplits({A: [0, 0], B: [1, 0], C: [2, 0], D: [0, 3]}), ['AC|BD', 'ACD|B'], 'three on a line: two');
  assert.deepEqual(meetingSplits({A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0]}), ['AC|BD', 'AD|BC', 'ABD|C', 'ACD|B'], 'four on a line: four');
  assert.equal(meetingSplits({A: [1, 1], B: [1, 1], C: [1, 1], D: [1, 1]}).length, 7, 'all on one point: all seven');
  assert.deepEqual(meetingSplits({A: [0, 0], B: [4, 1], C: [1, 4]}), [], 'three not on a line: none');
  const q10 = byId('radon-10').parameters;
  assert.deepEqual(commonSplits(q10.boards), meetingSplits(q10.boards[0]), 'the same line twice shares all four');
});

test('find every split: Meet shelves with no verdict, That’s all judges the shelf', () => {
  const p = byId('radon-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'meet'}), null, 'one colour is no split');
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all needs a shelf');
  a = play(p, a, ...taps('A'), {type: 'meet'});
  assert.deepEqual(a.board.shelf, ['A|BCD'], 'a split that misses goes on the shelf too');
  assert.equal(a.board.refused, null);
  let html = view(p, a);
  assert.doesNotMatch(html, /sb-band/, 'Meet draws no bands');
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;drop&quot;,&quot;key&quot;:&quot;A\|BCD&quot;\}"/, 'a shelved split is a button that takes it off');
  a = play(p, a, {type: 'meet'});
  assert.equal(a.board.told, 'again', 'already on the shelf');
  a = play(p, a, ...taps('B'), {type: 'meet'}, ...taps('C'), {type: 'meet'});
  assert.deepEqual(a.board.shelf, ['A|BCD', 'AB|CD', 'ABC|D']);
  a = play(p, a, {type: 'all'});
  assert.deepEqual(a.board.refused, {kind: 'apart', key: 'A|BCD'}, 'the save records the split that misses');
  html = view(p, a);
  // The board says only "Not yet.": no split ringed or drawn apart, so shelving
  // every split and taking off the ringed one no longer solves (claims audit).
  assert.match(html, /Not yet\./);
  assert.doesNotMatch(html, /doesn’t meet|There is another|ringed|sb-big/);
  const missLine = html.match(/<p class="sb-told">[^<]*<\/p>/)[0];
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for the shelf to change');
  a = play(p, a, {type: 'drop', key: 'A|BCD'});
  assert.equal(a.board.refused, null);
  a = play(p, a, {type: 'drop', key: 'ABC|D'}, {type: 'all'});
  assert.deepEqual(a.board.refused, {kind: 'more'});
  html = view(p, a);
  assert.equal(html.match(/<p class="sb-told">[^<]*<\/p>/)[0], missLine, 'a split missing gets the same line as a split that misses');
  // A shelf of one split can't judge that split: right or wrong, "Not yet.".
  for (const k of ['A|BCD', 'AB|CD']) {
    const one = play(p, freshAttempt(p), ...taps(k === 'A|BCD' ? 'A' : 'AB'), {type: 'meet'}, {type: 'all'});
    assert.ok(!isSolved(p, one.board));
    assert.equal(view(p, one).match(/<p class="sb-told">[^<]*<\/p>/)[0], missLine, `${k} alone: the same line`);
  }
  a = play(p, a, {type: 'meet'}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/class="sb-mini"/g) || []).length, 2, 'the shelf drawn with its bands');
  assert.equal(move(p, a, ...taps('A')), null, 'nothing moves once solved');
  // Every split on the shelf is not a solve.
  let full = freshAttempt(p);
  for (const k of splitList(['A', 'B', 'C', 'D'])) { const [g] = k.split('|'); const want = ['A', 'B', 'C', 'D'].map(l => g.includes(l) ? 0 : 1); full = play(p, full, ...['A', 'B', 'C', 'D'].filter((l, i) => full.board.groups[i] !== want[i]).map(label => ({type: 'tap', label})), {type: 'meet'}); }
  full = play(p, full, {type: 'all'});
  assert.ok(!isSolved(p, full.board));
  assert.deepEqual(full.board.refused, {kind: 'apart', key: 'A|BCD'});
});

test('four corners: one split meets, the hints give reasons first', () => {
  const p = byId('radon-03'), q = p.parameters;
  assert.deepEqual(meetingSplits(q.labels), ['AB|CD']);
  assert.doesNotMatch(p.hints.join(' '), /Try one split/);
  let a = play(p, freshAttempt(p), ...taps('CD'), {type: 'meet'}, {type: 'all'});
  assert.ok(isSolved(p, a.board), 'the one split that meets');
  a = play(p, freshAttempt(p), ...taps('C'), {type: 'meet'}, {type: 'all'});
  assert.deepEqual(a.board.refused, {kind: 'apart', key: 'ABD|C'});
  assert.equal(nextHint(p, a).action.type, 'drop', 'the hint takes the wrong split off');
});

test('place D: Check refuses with one split that breaks the goal; D may sit on another dot', () => {
  const p = byId('radon-09');
  let a = freshAttempt(p);
  a = play(p, a, {type: 'check'});
  assert.equal(a.board.refused, true);
  assert.equal(move(p, a, {type: 'check'}), null, 'Check waits for a move');
  let html = view(p, a);
  assert.match(html, /This one doesn’t meet\./);
  assert.match(html, /sb-chip ringed/, 'the goal split that misses is ringed');
  assert.match(html, /sb-band/, 'its bands are drawn');
  a = play(p, a, {type: 'put', at: [5, 1]});
  assert.equal(a.board.refused, false);
  a = play(p, a, {type: 'check'});
  assert.ok(isSolved(p, a.board), 'D on B: four meet');
  const extra = byId('radon-02');
  let b = play(extra, freshAttempt(extra), {type: 'put', at: [1, 1]}, {type: 'check'});
  html = view(extra, b);
  assert.match(html, /This one meets too\./, 'D on A: a split outside the goal meets');
  assert.equal(move(extra, freshAttempt(extra), {type: 'put', at: [7, 0]}), null, 'off the board');
  assert.equal(move(extra, freshAttempt(extra), {type: 'put', at: [5, 5]}), null, 'where D already is');
  b = play(extra, freshAttempt(extra), {type: 'put', at: [2, 2]}, {type: 'check'});
  assert.ok(isSolved(extra, b.board));
});

test('every place for C: rings, crosses, the three splits apart, That’s all', () => {
  const p = byId('radon-06');
  let a = play(p, freshAttempt(p), {type: 'put', at: [4, 3]});
  assert.deepEqual(a.board.missed, [[4, 3]]);
  let html = view(p, a);
  assert.match(html, /No split meets\./);
  assert.equal((html.match(/class="sb-mini sb-big"/g) || []).length, 3, 'three splits drawn apart, large');
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all needs a find');
  assert.equal(move(p, a, {type: 'put', at: [2, 1]}), null, 'not on A');
  a = play(p, a, {type: 'put', at: [4, 2]});
  assert.deepEqual(a.board.found, [[4, 2]]);
  html = view(p, a);
  assert.match(html, /sb-spot missed/, 'the cross stays where C was');
  assert.match(html, /sb-band/, 'the split that meets is drawn');
  a = play(p, a, {type: 'put', at: [4, 3]});
  assert.deepEqual(a.board.missed, [[4, 3]], 'a place tried before is not added again');
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true);
  a = play(p, a, {type: 'put', at: [8, 4]}, {type: 'put', at: [0, 0]}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('two boards: moves, a shared split drawn on both, no single move, hints', () => {
  const p = byId('radon-10'), q = p.parameters;
  let a = play(p, freshAttempt(p), {type: 'check'});
  assert.equal(a.board.refused, true);
  let html = view(p, a);
  assert.match(html, /This split meets on both\./);
  assert.equal((html.match(/data-sb-board=/g) || []).length, 2);
  assert.equal(move(p, a, {type: 'put', board: 0, label: 'A', at: q.boards[0].B}), null, 'one letter to a place');
  assert.equal(pairPlan(q, q.boards).length, 2, 'two moves at least');
  const h = nextHint(p, a);
  assert.equal(h.type, 'move');
  assert.match(h.text, /^Move [ABCD] on the (first|second) board/);
  a = play(p, a, h.action);
  html = view(p, a, true);
  assert.match(html, new RegExp(`sb-disc sb-cn chosen[^"]*" transform="[^"]*" role="button"[^>]*data-sg-piece="${h.action.board}:D"`), 'a move leaves the chosen letter to the child');
  for (const m of p.solution.moves) a = move(p, a, m) || a;
  let n = 0;
  while (!isSolved(p, a.board) && n++ < 10) a = play(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(commonSplits(a.board.boards), []);
});

test('the playground: colours, moves, no stacking, never solved, no hints', () => {
  const p = radon.puzzles.find(x => x.band === 'playground');
  let a = play(p, freshAttempt(p), {type: 'tap', label: 'C'});
  assert.deepEqual(a.board.groups, [0, 0, 0, 1]);
  a = play(p, a, {type: 'put', label: 'D', at: [3, 3]});
  assert.deepEqual(a.board.at.D, [3, 3]);
  assert.equal(move(p, a, {type: 'put', label: 'D', at: a.board.at.A}), null);
  assert.equal(isSolved(p, a.board), false);
  assert.equal(nextHint(p, a).type, 'done');
  assert.equal(mech.noHint(p), true);
  mech.reset(p);
  let html = view(p, a, true);
  assert.match(html, /aria-pressed="false">Move</);
  assert.match(html, /sb-band/, 'bands are live in the playground');
  mech.ui(p, {tool: 'move'});
  html = view(p, a, true);
  assert.match(html, /aria-pressed="true">Move</);
  assert.match(html, /data-sg-point=/, 'free places are controls while moving');
  mech.reset(p);
});

test('hints alone solve every puzzle, from fresh and after a wrong move; the first hint never names the answer', () => {
  for (const p of radon.puzzles.filter(x => x.band !== 'playground')) {
    for (const start of ['fresh', 'wrong']) {
      let a = freshAttempt(p), n = 0;
      if (start === 'wrong') {
        const mode = p.parameters.mode;
        const wrong = mode === 'every' ? {type: 'tap', label: 'B'} : mode === 'place' ? {type: 'check'} : mode === 'locus' ? {type: 'put', at: [1, 0]} : {type: 'check'};
        a = play(p, a, wrong);
      }
      while (!isSolved(p, a.board) && n++ < 40) { const h = nextHint(p, a); assert.equal(h.type, 'move', `${p.id}: ${h.text}`); a = play(p, a, h.action); }
      assert.ok(isSolved(p, a.board), `${p.id} ${start}: hints alone solve it`);
    }
    assert.ok(!/across/.test(`${p.title} ${p.visibleObjective} ${p.hints[0]}`), `${p.id}: no place in the title, goal or first hint`);
  }
});

test('Undo takes back moves, not claims', () => {
  const e = byId('radon-04');
  let a = play(e, freshAttempt(e), ...taps('A'), {type: 'meet'}, {type: 'all'});
  assert.deepEqual(a.board.refused, {kind: 'apart', key: 'A|BCD'});
  let back = undoMove(e, play(e, a, ...taps('C')));
  assert.deepEqual(back.board.refused, a.board.refused, 'a refused That’s all stays while the shelf stays');
  assert.equal(move(e, back, {type: 'all'}), null);
  back = undoMove(e, back);
  assert.deepEqual(back.board.refused, a.board.refused, 'Undo of That’s all itself keeps it');
  assert.ok(validBoard(e, back.board));
  const dropped = play(e, a, {type: 'drop', key: 'A|BCD'});
  assert.equal(dropped.board.refused, null, 'a changed shelf clears it');
  assert.deepEqual(undoMove(e, dropped).board.refused, a.board.refused, 'Undo back to the same shelf brings it back');
  const p = byId('radon-05');
  a = play(p, freshAttempt(p), {type: 'check'});
  back = undoMove(p, a);
  assert.equal(back.board.refused, true, 'a refused Check stays on the same place');
  const moved = play(p, back, {type: 'put', at: [5, 5]});
  assert.equal(moved.board.refused, false, 'a move clears it');
  assert.equal(undoMove(p, moved).board.refused, true, 'Undo of that move brings the refusal back');
});

test('arrow keys step a place across the board', () => {
  const q = byId('radon-02').parameters;
  assert.deepEqual(arrowPoint(q, [3, 3], 'ArrowRight'), [4, 3]);
  assert.deepEqual(arrowPoint(q, [3, 3], 'ArrowUp'), [3, 4], 'up is up on the board');
  assert.equal(arrowPoint(q, [0, 3], 'ArrowLeft'), null, 'not off the board');
  assert.equal(arrowPoint(q, [3, 3], 'Enter'), null);
});

test('forged saves are rejected', () => {
  const e = byId('radon-01'), fresh = freshAttempt(e).board;
  assert.equal(validBoard(e, {...fresh, shelf: ['AB|CD', 'ABC|D', 'AC|BD'], done: true}), false, 'done with a split that misses');
  assert.equal(validBoard(e, {...fresh, shelf: splitList(['A', 'B', 'C', 'D']), done: true}), false, 'done with every split shelved');
  assert.equal(validBoard(e, {...fresh, done: true}), false, 'done with an empty shelf');
  assert.equal(validBoard(e, {...fresh, shelf: ['AB|CD'], refused: {kind: 'apart', key: 'AB|CD'}}), false, 'a meeting split refused');
  assert.ok(validBoard(e, {...fresh, shelf: ['AB|CD', 'ABC|D'], done: true}));
  const p = byId('radon-02');
  assert.equal(validBoard(p, {at: [5, 5], refused: false, done: true}), false, 'done in a wrong place');
  assert.equal(validBoard(p, {at: [2, 2], refused: true, done: false}), false, 'refused in a right place');
  const l = byId('radon-06');
  assert.equal(validBoard(l, {found: [[4, 3]], missed: [], at: null, more: false, done: false}), false, 'a wrong place found');
  const t = byId('radon-10'), b = freshAttempt(t).board;
  assert.equal(validBoard(t, {...b, boards: [{...b.boards[0], A: b.boards[0].B}, b.boards[1]]}), false, 'two letters on one place');
});

test('rendering: boards and dots, bands only after a claim, goals as chips, taps on shared points go to the nearest letter', () => {
  for (const p of radon.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /sb-puzzle/, p.id);
    assert.match(html, /sg-board sb-board/, p.id);
    assert.match(html, /sb-letter/, p.id);
    const mode = p.parameters.mode;
    if (mode !== 'playground') assert.doesNotMatch(html, /sb-band/, `${p.id}: no bands before a claim`);
    if (mode === 'every') assert.match(html, /data-sg-piece="A"/, `${p.id}: letters are controls`);
    if (mode === 'place') assert.equal((html.match(/class="sb-chip/g) || []).length, p.parameters.goal.length, `${p.id}: one chip per goal split`);
    if (mode === 'locus') assert.match(html, /data-sg-point=/, `${p.id}: places are controls`);
    assert.ok(p.visibleObjective.length < 60, `${p.id}: one short objective`);
  }
  const shared = view(byId('radon-08'), freshAttempt(byId('radon-08')));
  assert.equal((shared.match(/class="sb-hit" r="2.75"/g) || []).length, 2, 'two letters on one point: tap circles end halfway between them');
  // A disc alone on its point reaches halfway to the nearest other disc, up to
  // 0.6 of a square: B and D are neighbours (5 each), A and C have room (6).
  const solo = view(byId('radon-01'), freshAttempt(byId('radon-01')));
  assert.deepEqual([...solo.matchAll(/class="sb-hit" r="([\d.]+)"/g)].map(m => Number(m[1])), [6, 5, 6, 5]);
  assert.ok(Math.abs(soloHit({A: [0, 0], B: [0, 0.5]}, 'A') - 4.1) < 1e-9, 'never smaller than past the disc');
  const place = view(byId('radon-02'), freshAttempt(byId('radon-02')));
  assert.ok((place.match(/class="sb-reach" r="5"/g) || []).length > 20, 'a point that takes taps reaches halfway to its neighbours');
  const help = mech.help(byId('radon-01'));
  assert.match(help, /sb-ring/); assert.match(help, /sb-rod/); assert.match(help, /sb-shape/);
});

test('taps stay fast: the two-board plan from scattered states', () => {
  const p = byId('radon-10'), q = p.parameters;
  pairPlan(q, q.boards);
  let s = 7;
  const times = [];
  const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 25; t++) {
    const boards = q.boards.map(b => ({...b}));
    for (let k = 0; k < 3; k++) { const j = Math.floor(r() * 2), l = 'ABCD'[Math.floor(r() * 4)], at = [Math.floor(r() * (q.cols + 1)), Math.floor(r() * (q.rows + 1))]; if (!Object.values(boards[j]).some(v => v[0] === at[0] && v[1] === at[1])) boards[j][l] = at; }
    const t0 = performance.now();
    const plan = pairPlan(q, boards);
    times.push(performance.now() - t0);
    assert.ok(Array.isArray(plan), 'a plan exists');
  }
  times.sort((x, y) => x - y);
  assert.ok(times[12] < 30, `median plan ${times[12].toFixed(1)} ms`);
  assert.ok(times.at(-1) < 500, `slowest plan ${times.at(-1).toFixed(1)} ms`);
});
