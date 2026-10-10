// Geoboard: bands that may not cross or touch, outline and inside dots, area,
// holes, cuts and their seam dots, Pick's counts, Can't after an attempt,
// That's all, the pair of shapes, Undo keeping what was learned, hints,
// rendering, focus, saves and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import geoboard, {geoboardMechanics, clashOf, problemOf, recordOf, dotsOf, cornerCount, forcedOf, countable, rightClaim, cutProblem, pieceRecords, seamDots, tapAction, bandMove, stepWords, dotOf, triedSides} from '../dist/families/geoboard/geoboard.js';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/geoboard/geoboard.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = geoboardMechanics.geoboard;
const byId = id => json.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const D = (q, pts) => pts.map(pt => dotOf(q, pt));
const draw = (q, ...loops) => loops.flatMap(l => [...D(q, l).map(at => ({type: 'dot', at})), {type: 'dot', at: dotOf(q, l[0])}]);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const s7 = {w: 7, h: 7}, L = (...pts) => D(s7, pts);

test('bands: sides may not cross or touch, except two in a row at their corner', () => {
  const clash = (...pts) => clashOf([{pts, closed: true}]);
  assert.equal(clash([0, 0], [3, 0], [3, 2], [0, 2]), null, 'a rectangle');
  assert.equal(clash([0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]), null, 'an L with an inward corner');
  assert.equal(clash([0, 0], [1, 0], [2, 0], [1, 2]), null, 'a peg passed straight is allowed');
  assert.deepEqual(clash([0, 0], [2, 2], [2, 0], [0, 2]).at, [1, 1], 'a bow tie crosses');
  assert.ok(clash([0, 0], [4, 0], [2, 2], [4, 4], [0, 4], [2, 0]), 'a corner touching a side');
  assert.ok(clash([0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [2, 4], [2, 2], [0, 2]), 'two corners on one dot');
  assert.ok(clash([0, 0], [2, 0], [1, 0]), 'a band that turns straight back');
  assert.ok(clashOf([{pts: [[0, 0], [2, 0], [2, 2]], closed: false}, {pts: [[1, 1], [3, 1], [3, 3]], closed: true}]), 'two bands that meet');
  assert.equal(problemOf(s7, [L([0, 0], [4, 0], [4, 4], [0, 4]), L([1, 1], [3, 1], [3, 3], [1, 3])], [], false).why, 'holes', 'no hole where none are allowed');
  assert.equal(problemOf(s7, [L([0, 0], [4, 0], [4, 4], [0, 4]), L([1, 1], [3, 1], [3, 3], [1, 3])], [], true), null, 'a hole inside');
  assert.equal(problemOf(s7, [L([0, 0], [2, 0], [2, 2], [0, 2]), L([3, 3], [4, 3], [4, 4])], [], true).why, 'outside');
  assert.equal(problemOf(s7, [L([0, 0], [6, 0], [6, 6], [0, 6]), L([1, 1], [5, 1], [5, 5], [1, 5]), L([2, 2], [3, 2], [3, 3])], [], true).why, 'nested');
  assert.equal(problemOf(s7, [L([0, 0], [4, 0], [4, 4], [0, 4])], L([2, 0]), true).why, 'clash', 'a hole may not start on the outline');
  assert.equal(cornerCount([[0, 0], [1, 0], [2, 0], [1, 2]]), 3);
});

test('counts: area, outline dots (corners and side dots) and inside dots, with holes', () => {
  const rec = (...loops) => { const r = recordOf(s7, loops.map(l => L(...l))); return [r.area, r.inside, r.outline, r.holes]; };
  assert.deepEqual(rec([[0, 0], [3, 0], [3, 2], [0, 2]]), [6, 2, 10, 0], 'a 3-by-2 rectangle');
  assert.deepEqual(rec([[0, 0], [2, 0], [3, 3], [1, 3]]), [6, 4, 6, 0], 'Problem 1’s slanted shape');
  assert.deepEqual(rec([[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]]), [5, 0, 12, 0], 'an L');
  assert.deepEqual(rec([[0, 0], [1, 2], [3, 1]]), [2.5, 2, 3, 0], 'a triangle with a half');
  assert.deepEqual(rec([[0, 0], [0, 1], [1, 3], [4, 1]]), [6, 5, 4, 0], 'the card’s area 6 with 4 outline dots');
  assert.deepEqual(rec([[0, 0], [4, 0], [4, 4], [0, 4]], [[1, 1], [3, 1], [3, 3], [1, 3]]), [12, 0, 24, 1], 'Problem 9’s square with a hole');
  assert.deepEqual(rec([[0, 0], [5, 0], [5, 3], [0, 3]], [[1, 1], [2, 1], [2, 2], [1, 2]], [[3, 1], [4, 1], [4, 2], [3, 2]]), [13, 0, 24, 2], 'two holes');
  const {outline, inside} = dotsOf(s7, [L([0, 0], [2, 0], [2, 2], [0, 2])]);
  assert.deepEqual([outline.length, inside], [8, [dotOf(s7, [1, 1])]], 'the dot in the middle is inside; the side dots are outline dots');
});

test('Pick’s counts: the value a goal forces, and which goals no band can have', () => {
  assert.equal(forcedOf({area: 6, inside: 6}), 2);
  assert.equal(forcedOf({area: 5, outline: 3}), 4.5);
  assert.equal(forcedOf({inside: 6, outline: 3}), 6.5);
  assert.equal(forcedOf({area: 6, outline: 4}), 5);
  assert.ok(!countable('outline', 2) && countable('outline', 3) && !countable('inside', 4.5) && countable('area', 6.5));
  assert.ok(rightClaim({area: 6, inside: 6}, 2) && !rightClaim({area: 6, inside: 6}, 3) && !rightClaim({area: 6, outline: 4}, 5));
  assert.equal(stepWords(2, -1), '2 right and 1 down');
});

test('a band: start, stretch, take back, close, move a corner, clear; refusals change nothing', () => {
  const p = byId('geoboard-03'), q = p.parameters, d = pt => dotOf(q, pt);
  let a = freshAttempt(p);
  a = play(p, a, {type: 'dot', at: d([0, 0])}, {type: 'dot', at: d([3, 0])}, {type: 'dot', at: d([3, 2])});
  assert.deepEqual(play(p, a, {type: 'dot', at: d([3, 2])}).board.open, [d([0, 0]), d([3, 0])], 'tapping the last corner takes it back');
  assert.equal(move(p, a, {type: 'dot', at: d([1, 0])}), null, 'a side back along the band');
  assert.equal(move(p, a, {type: 'dot', at: d([0, 0]) + 0}).board.loops.length, 1, 'tapping the first corner closes the band');
  a = play(p, a, {type: 'dot', at: d([0, 2])}, {type: 'dot', at: d([0, 0])});
  assert.deepEqual(recordOf(q, a.board.loops), {area: 6, inside: 2, outline: 10, holes: 0});
  assert.ok(!isSolved(p, a.board));
  const leaned = play(p, a, {type: 'corner', loop: 0, index: 2, to: d([4, 3])});
  assert.equal(recordOf(q, leaned.board.loops).area, 8.5, 'a corner moved');
  assert.equal(move(p, a, {type: 'corner', loop: 0, index: 2, to: d([0, 0])}), null, 'a corner onto another corner');
  assert.equal(bandMove(q, a.board, {type: 'corner', loop: 0, index: 1, to: d([0, 4])}).problem.why, 'clash', 'a corner move that makes sides cross is refused with its clash');
  assert.deepEqual(play(p, a, {type: 'clear'}).board, mech.fresh(p), 'Clear takes the band off');
  const slanted = play(p, freshAttempt(p), ...draw(q, [[0, 0], [2, 0], [3, 3], [1, 3]]));
  assert.ok(isSolved(p, slanted.board), 'area 6 with 4 inside dots');
  assert.equal(move(p, slanted, {type: 'clear'}), null, 'no move after the solve');
});

test('taps: a corner is picked up and put down, a stale hold is ignored, a refused tap names its clash, hole puzzles start holes on inside dots', () => {
  const p = byId('geoboard-11'), q = p.parameters, d = pt => dotOf(q, pt);
  const a = play(p, freshAttempt(p), ...draw(q, [[0, 0], [4, 0], [4, 4], [0, 4]]));
  const view0 = {held: null, pick: null, cant: false, value: null};
  assert.deepEqual(tapAction(q, a.board, view0, d([4, 4])), {ui: {held: [0, 2]}}, 'a corner is picked up');
  assert.deepEqual(tapAction(q, a.board, {...view0, held: [0, 2]}, d([4, 4])), {ui: {held: null}}, 'and put down');
  assert.deepEqual(tapAction(q, a.board, {...view0, held: [0, 2]}, d([5, 5])), {move: {type: 'corner', loop: 0, index: 2, to: d([5, 5])}});
  assert.deepEqual(tapAction(q, a.board, view0, d([1, 1])), {move: {type: 'dot', at: d([1, 1])}}, 'an inside dot starts a hole');
  assert.equal(tapAction(q, a.board, view0, d([2, 0])), null, 'a side dot does nothing');
  // A hold whose corner is gone (Undo took the band back, or a band is open) is ignored.
  const stale = {...view0, held: [0, 2]}, back = undo(a);
  assert.deepEqual(tapAction(q, back.board, stale, d([2, 2])), {move: {type: 'dot', at: d([2, 2])}}, 'a stale hold is ignored while a band is open');
  assert.deepEqual(tapAction(q, freshAttempt(p).board, stale, d([2, 2])), {move: {type: 'dot', at: d([2, 2])}}, 'and on an empty board');
  mech.reset(p);
  mech.ui(p, {held: [0, 2]});
  assert.match(view(p, a, true), /A corner is picked up\./);
  mech.carry(p, a.board, back.board);
  assert.doesNotMatch(view(p, back, true), /A corner is picked up\.|class="geo-held"/, 'Undo lets go of a held corner');
  const started = play(p, a, {type: 'dot', at: d([1, 1])});
  assert.match(view(p, started), /Area 16, 9 inside dots, 16 outline dots\. Hole with 1 corner\./, 'the outline keeps its counts while a hole is stretched');
  const t = tapAction(q, started.board, view0, d([0, 1]));
  assert.equal(t.refuse.why, 'clash', 'a hole side to the outline is refused');
  assert.deepEqual(t.refuse.at, [0, 1]);
  assert.deepEqual(triedSides(q, started.board, t.action), [[[1, 1], [0, 1]]], 'the refused side is drawn');
  assert.deepEqual(triedSides(q, a.board, {type: 'corner', loop: 0, index: 2, to: d([5, 5])}), [[[4, 0], [5, 5]], [[5, 5], [0, 4]]], 'and the two sides at a moved corner');
  assert.equal(problemOf(q, started.board.loops, [...started.board.open, d([5, 5])], true).why, 'clash');
  const solved = play(p, started, ...draw(q, [[1, 1], [3, 1], [3, 3], [1, 3]]).slice(1));
  assert.ok(isSolved(p, solved.board), 'a 4-by-4 square with a 2-by-2 hole');
  const html = view(p, solved);
  assert.match(html, /geo-hidden">1</, 'the hole count shows once solved');
  assert.match(view(p, a), /geo-hidden">\?</, 'and is a question mark before');
});

test('Can’t: only after a band is tried; set Pick’s number; a wrong number gets one short refusal that Undo keeps', () => {
  const p = byId('geoboard-08'), q = p.parameters;
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', value: 2}), null, 'a fresh-board claim solves nothing');
  assert.match(view(p, fresh), /geo-cant"[^>]*disabled/, 'Can’t waits for a band');
  const tried = play(p, fresh, ...draw(q, [[0, 0], [0, 1], [1, 3], [4, 1]]));
  assert.doesNotMatch(view(p, tried), /geo-cant"[^>]*disabled/);
  mech.ui(p, {cant: true});
  mech.ui(p, {step: 1}); mech.ui(p, {step: 1}); mech.ui(p, {step: 1});
  let html = view(p, tried, true);
  assert.match(html, /<b aria-live="polite">1</, 'the stepper goes up by halves from 0');
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;value&quot;:1\}"/, 'Can’t now claims the number set');
  const wrong = play(p, tried, {type: 'cant', value: 3});
  assert.equal(wrong.board.refused, 3);
  assert.ok(!isSolved(p, wrong.board));
  html = view(p, wrong);
  assert.match(html, /<p class="geo-note">3 outline dots don’t fit Pick’s rule\.<\/p>/, 'one short refusal');
  assert.doesNotMatch(html, /class="geo-eq|class="geo-proof/, 'with no rule worked out and no reason');
  assert.equal(move(p, wrong, {type: 'cant', value: 3}), null, 'the same number again');
  const back = undo(wrong);
  assert.equal(mech.carry(p, wrong.board, back.board).refused, 3, 'Undo keeps the refusal');
  const right = play(p, wrong, {type: 'cant', value: 2});
  assert.ok(isSolved(p, right.board));
  html = view(p, right);
  assert.match(html, /class="geo-proof">.*aria-label="6 \+ 2 ÷ 2 − 1 = 6".*Every band has at least 3 outline dots\./, 'the argument after a right claim');
  assert.match(html, /<polygon class="geo-band"/, 'beside the band the child tried');
  const possible = byId('geoboard-05'), pq = possible.parameters;
  const t5 = play(possible, freshAttempt(possible), ...draw(pq, [[0, 0], [3, 0], [3, 2], [0, 2]]), {type: 'cant', value: 5});
  assert.ok(!isSolved(possible, t5.board));
  assert.match(view(possible, t5), /<p class="geo-note">It can be done\.<\/p>/, 'a possible goal’s Can’t is refused');
  // Puzzle 9 (area hidden, 6½ possible): a wrong area is refused in the child's own number, never Pick's.
  const p9 = byId('geoboard-09'), t9 = play(p9, freshAttempt(p9), ...draw(p9.parameters, [[0, 0], [3, 0], [0, 3]]));
  const w9 = play(p9, t9, {type: 'cant', value: 7});
  html = view(p9, w9);
  assert.match(html, /<p class="geo-note">Area 7 doesn’t fit Pick’s rule\.<\/p>/);
  assert.doesNotMatch(html, /6½|class="geo-eq/, 'Pick’s area is not given away');
  assert.match(view(p9, play(p9, t9, {type: 'cant', value: 6.5})), /<p class="geo-note">It can be done\.<\/p>/);
  assert.equal(move(byId('geoboard-03'), play(byId('geoboard-03'), freshAttempt(byId('geoboard-03')), ...draw(byId('geoboard-03').parameters, [[0, 0], [3, 0], [0, 3]])), {type: 'cant', value: 0}), null, 'no Can’t where it is not offered');
});

test('the pair: a triangle and a four-sided shape, each kept when made; Undo keeps them', () => {
  const p = byId('geoboard-02'), q = p.parameters;
  let a = play(p, freshAttempt(p), ...draw(q, [[0, 0], [4, 0], [1, 2]]));
  assert.ok(a.board.found[0] && !a.board.found[1]);
  assert.match(view(p, a), /aria-label="Triangle, made"/);
  assert.match(view(p, a), /aria-label="Four-sided shape, not made yet"/);
  const cleared = play(p, a, {type: 'clear'});
  assert.deepEqual(mech.carry(p, cleared.board, undo(cleared).board).found, cleared.board.found);
  a = play(p, cleared, ...draw(q, [[0, 0], [2, 0], [3, 2], [1, 2]]));
  assert.ok(isSolved(p, a.board));
  const other = play(p, freshAttempt(p), ...draw(q, [[0, 0], [1, 0], [2, 0], [1, 2]]));
  assert.deepEqual(other.board.found, [null, null], 'a triangle with other counts is not kept');
});

test('every area-6 count: kept below the board with no count of how many; That’s all is checked', () => {
  const p = byId('geoboard-06'), q = p.parameters;
  let a = play(p, freshAttempt(p), ...draw(q, [[0, 0], [3, 0], [3, 2], [0, 2]]));
  assert.equal(a.board.found.length, 1);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  let html = view(p, a);
  assert.match(html, /<p class="geo-note">There is another\.<\/p>/);
  assert.match(html, /class="secondary geo-button geo-all[^"]*"[^>]*disabled/, 'That’s all waits for another count');
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /\b\d+\s*(of|\/)\s*6\b/, 'no found-count');
  assert.equal(mech.carry(p, a.board, undo(a).board).told, 'more', 'Undo keeps the refusal');
  for (const wt of q.witnesses) a = play(p, a, {type: 'clear'}, ...draw(q, ...wt.shapes[0]));
  assert.equal(a.board.found.length, 6);
  assert.ok(a.board.found.every((l, i) => i === 0 || recordOf(q, [a.board.found[i - 1]]).inside < recordOf(q, [l]).inside), 'kept in order of inside dots');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  html = view(p, a);
  assert.match(html, /class="struck"/, 'the impossible next count is drawn struck through');
  assert.match(html, /not 6 inside and 2 outline/);
});

test('cuts: ends on the outline, clear of it between; seam dots move from inside to the outline of both pieces', () => {
  const p = byId('geoboard-04'), q = p.parameters, d = pt => dotOf(q, pt);
  assert.equal(cutProblem(q, d([0, 0]), d([4, 0])).why, 'touch', 'along a side');
  assert.equal(cutProblem(q, d([0, 1]), d([2, 1])).why, 'ends', 'an end inside');
  assert.equal(cutProblem(q, d([0, 0]), d([4, 2])), null);
  assert.deepEqual(pieceRecords(q, [d([0, 1]), d([4, 1])]).map(r => [r.area, r.inside, r.outline]), [[4, 0, 10], [4, 0, 10]]);
  assert.deepEqual(pieceRecords(q, [d([2, 0]), d([2, 2])]).map(r => [r.area, r.inside, r.outline]), [[4, 1, 8], [4, 1, 8]]);
  assert.deepEqual(seamDots(q, d([0, 1]), d([4, 1])), [d([1, 1]), d([2, 1]), d([3, 1])]);
  const view0 = {held: null, pick: null, cant: false, value: null};
  assert.deepEqual(tapAction(q, mech.fresh(p), view0, d([0, 1])), {ui: {pick: d([0, 1])}});
  assert.equal(tapAction(q, mech.fresh(p), view0, d([2, 1])), null, 'an inside dot is not a control');
  assert.equal(tapAction(q, mech.fresh(p), {...view0, pick: d([0, 0])}, d([4, 0])).refuse.why, 'touch');
  let a = play(p, freshAttempt(p), {type: 'cut', a: d([2, 0]), b: d([2, 2])});
  assert.ok(!isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /class="geo-ring changed"/, 'the seam dot changed colour');
  a = play(p, a, {type: 'cut', a: d([0, 1]), b: d([4, 1])});
  assert.ok(isSolved(p, a.board), 'a new cut replaces the old one');
  assert.equal((view(p, a).match(/geo-ring changed/g) || []).length, 3);
});

test('hints: alone they solve every puzzle; impossible goals build an attempt, then give Pick’s count, then Can’t; memoised', () => {
  for (const p of json.puzzles.filter(p => p.band !== 'playground')) {
    mech.reset(p);
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.ok(!['cant', 'count'].includes(first.action?.type), `${p.id}: “Press Can’t” is never the first hint`);
    while (!isSolved(p, a.board)) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move');
      a = move(p, a, h.action);
      assert.ok(a && ++steps < 200, `${p.id}: hint ${steps} is legal`);
    }
  }
  const p = byId('geoboard-10'), q = p.parameters;
  // Right after a closed band that is not yet relevant (here 4 outline dots), the hints keep building.
  mech.reset(p);
  const square = play(p, freshAttempt(p), ...draw(q, [[0, 0], [1, 0], [1, 1], [0, 1]]));
  assert.ok(['dot', 'corner', 'clear'].includes(nextHint(p, square).action.type), 'a band move, not the certificate');
  assert.match(nextHint(p, square).text, /^Try a triangle with 3 outline dots and an area near 5\. /);
  // With 3 outline dots: Pick's count alone; applying it fills the goal's empty box.
  const tried = play(p, freshAttempt(p), ...draw(q, [[0, 0], [4, 1], [1, 3]]));
  const h = nextHint(p, tried);
  assert.deepEqual(h.action, {type: 'count'});
  assert.equal(h.text, 'With area 5 and 3 outline dots, Pick’s rule needs 4½ inside dots: 4½ + 3 ÷ 2 − 1 = 5.');
  assert.equal(nextHint(p, tried), h, 'memoised');
  assert.doesNotMatch(view(p, {...tried, hintLevel: 2}), /geo-cant hinted/, 'the count marks no button');
  assert.equal(move(p, tried, h.action), tried, 'applying it leaves the board');
  assert.match(view(p, tried, true), /<b aria-live="polite">4½</, 'and fills the goal’s empty box');
  // Only then the reason with Can't.
  const last = nextHint(p, tried);
  assert.deepEqual(last.action, {type: 'cant', value: 4.5});
  assert.equal(last.text, 'Inside dots come in whole numbers. Press Can’t.');
  assert.match(view(p, {...tried, hintLevel: 2}, true), /geo-cant hinted/, 'level 2 marks Can’t');
  mech.reset(p);
  mech.ui(p, {cant: true});
  assert.equal(nextHint(p, tried).text, 'Inside dots come in whole numbers. Set 4½, then press Can’t.', 'Can’t opened by the child');
  mech.reset(p);
  assert.equal(move(byId('geoboard-05'), play(byId('geoboard-05'), freshAttempt(byId('geoboard-05')), ...draw(byId('geoboard-05').parameters, [[0, 0], [3, 0], [3, 2], [0, 2]])), {type: 'count'}), null, 'no count move on a possible goal');
  const p1 = byId('geoboard-01');
  assert.match(view(p1, {...freshAttempt(p1), hintLevel: 2}), /sg-point hinted/, 'level 2 marks the dot');
  for (const p of json.puzzles) for (const text of [p.title, p.hints[0]]) assert.doesNotMatch(text, /hole|Can’t/i, `${p.id}: the title and first hint give nothing away`);
});

test('hints are fast: a hint not yet memoised, fastest of three, after the first hint has warmed the witness placements', () => {
  for (const p of json.puzzles.filter(p => p.band !== 'playground')) {
    mech.reset(p);
    let a = freshAttempt(p), steps = 0;
    nextHint(p, a);
    while (!isSolved(p, a.board)) {
      let best = Infinity;
      // A copy with another id misses the memo, so each run computes the hint again.
      for (let run = 0; run < 3; run++) {
        const copy = {...p, id: `${p.id}~${steps}~${run}`}, t = performance.now();
        nextHint(copy, a);
        best = Math.min(best, performance.now() - t);
      }
      assert.ok(best < 100, `${p.id}: hint ${steps} took ${best.toFixed(1)} ms`);
      a = move(p, a, nextHint(p, a).action);
      assert.ok(a && ++steps < 200);
    }
    mech.reset(p);
  }
});

test('rendering: the board shows the task, goal and record; focus never lands on Can’t or That’s all', () => {
  const p = byId('geoboard-01');
  const html = view(p, freshAttempt(p));
  assert.match(html, /<table class="geo-record">/);
  assert.match(html, /aria-label="Goal"/);
  assert.match(html, /aria-label="Dot 0 across, 0 up\. Start the band here"/);
  assert.doesNotMatch(html, /geo-cant|geo-all/, 'no Can’t or That’s all where not offered');
  assert.equal(p.visibleObjective, '', 'the goal row shows the task');
  assert.ok(json.puzzles.every(x => x.visibleObjective.length <= 60), 'at most one short objective');
  assert.equal(geoboard.focus, '.geo-board [data-sg-point][role="button"]', 'focus falls back to the board, never to Can’t or That’s all');
  for (const x of json.puzzles) assert.match(view(x, freshAttempt(x)), new RegExp(`data-puzzle-id="${x.id}"`));
});

test('saves: forged boards are rejected', () => {
  const p = byId('geoboard-08'), q = p.parameters;
  const tried = play(p, freshAttempt(p), ...draw(q, [[0, 0], [0, 1], [1, 3], [4, 1]]));
  for (const [board, why] of [
    [{...tried.board, claimed: 2, loops: []}, 'a claim with no band'],
    [{...tried.board, claimed: 3}, 'a wrong claim kept'],
    [{...tried.board, refused: 2}, 'the right number refused'],
    [{...tried.board, loops: [L([0, 0], [2, 2], [2, 0], [0, 2])]}, 'crossing sides'],
    [{...tried.board, loops: [[0, 1]]}, 'two corners'],
    [{...tried.board, open: [999]}, 'a dot off the board'],
    [{...tried.board, mood: 1}, 'an extra field'],
    [[], 'not an object']
  ]) assert.equal(validBoard(p, board), false, why);
  assert.ok(validBoard(p, tried.board));
  const c = byId('geoboard-07');
  assert.equal(validBoard(c, {cut: [dotOf(c.parameters, [0, 0]), dotOf(c.parameters, [2, 0])]}), false, 'a cut along a side');
});

test('the playground: any of three sizes, holes, never solved, no Hint', () => {
  const p = byId('geoboard-playground');
  assert.ok(mech.noHint(p));
  let a = freshAttempt(p);
  a = play(p, a, ...draw({w: 7, h: 7}, [[0, 0], [4, 0], [4, 4], [0, 4]], [[1, 1], [3, 1], [3, 3], [1, 3]]));
  assert.equal(a.board.loops.length, 2);
  assert.ok(!isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /aria-label="Holes"/);
  assert.match(html, /aria-pressed="true"[^>]*>7</);
  const nine = play(p, a, {type: 'size', size: 9});
  assert.deepEqual([nine.board.size, nine.board.loops], [9, []]);
  assert.equal(move(p, nine, {type: 'size', size: 8}), null);
});
