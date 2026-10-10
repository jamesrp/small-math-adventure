// Area traps: exact square colours, splits and joins, Best, a split that
// gains nothing, painting to the marks and Can't with its bound, slides that
// make things worse, hints, Undo after a claim, the playground, saves and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {coversMechanics, squareStatus, exact, shapeArea, boundsOf, plansOf, leafAt, fits, stopper, slideBounds, fmt, words, nodeWords, gainsOf} from '../dist/families/covers/covers.js';
import {loadPack} from '../scripts/packs.mjs';

const covers = JSON.parse(await readFile(new URL('../dist/families/covers/covers.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => covers.puzzles.find(p => p.id === id);
const M = coversMechanics.covers;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const split = (...nodes) => nodes.map(node => ({type: 'split', node}));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
// Undo as the app does it: back one move, then the mechanic's carry.
const undoOnce = (p, a) => { const next = undo(a); return {...next, board: M.carry(p, a.board, next.board)}; };
const paintAll = (p, a, squares) => play(p, a, {type: 'paint', squares, on: true});

test('squares are coloured exactly; an edge or a corner touch is not a cover', () => {
  const tri = [[0, 4], [4, 4], [4, 0]];
  assert.equal(squareStatus(tri, 3, 3, 1), 'whole');
  assert.equal(squareStatus(tri, 3, 0, 1), 'part', 'the slanted edge cuts it in half');
  assert.equal(squareStatus(tri, 0, 0, 1), 'out');
  assert.equal(squareStatus(tri, 2, 0, 1), 'out', 'touches the triangle only at a corner');
  const ell = [[2, 1], [3, 1], [3, 3], [1, 3], [1, 2], [2, 2]];
  assert.equal(squareStatus(ell, 1, 1, 1), 'out', 'shares two edges with the L and nothing more');
  assert.equal(squareStatus(ell, 2, 1, 1), 'whole');
  const diamond = [[0, 2], [2, 0], [4, 2], [2, 4]];
  assert.equal(squareStatus(diamond, 0, 0, 1), 'out', 'the diamond’s edge only touches its corner');
  assert.equal(squareStatus(diamond, 0, 0, 0.5), 'out');
  assert.equal(squareStatus(diamond, 1, 1, 1), 'whole');
  assert.equal(squareStatus(diamond, 1, 0, 1), 'part');
  assert.deepEqual(shapeArea(tri), [8, 1]);
  assert.deepEqual(shapeArea(byId('covers-10').parameters.shape), [11, 4]);
  assert.deepEqual(exact(0.375), [3n, 8n]);
  assert.throws(() => exact(0.1), /not dyadic/);
  assert.equal(fmt(14.5), '14½');
  assert.equal(fmt(0.375), '⅜');
  assert.equal(fmt(2.125), '2⅛');
  assert.equal(fmt(3), '3');
  assert.equal(words(4.375), '4 and 3 eighths');
  assert.equal(nodeWords('2,1,1'), 'the bottom-left quarter of the square in row 1, column 2');
});

test('splits: only yellow squares help, the bounds only tighten, the budget holds, joins undo', () => {
  const p = byId('covers-01'), q = p.parameters;
  let a = play(p, freshAttempt(p), ...split('0,0,0'));
  assert.deepEqual(boundsOf(q, a.board.splits), {inside: 6, cover: 10, gap: 4}, 'a blank square splits into blank quarters');
  a = play(p, a, {type: 'join', node: '0,0,0'});
  assert.deepEqual(a.board.splits, []);
  a = play(p, a, ...split('3,0,0'));
  assert.deepEqual(boundsOf(q, a.board.splits), {inside: 6.25, cover: 9.75, gap: 3.5});
  assert.equal(move(p, a, {type: 'split', node: '6,0,1'}), null, 'one level deep only');
  a = play(p, a, ...split('2,1,0', '1,2,0', '0,0,0'));
  assert.equal(move(p, a, {type: 'split', node: '0,3,0'}), null, 'past the budget');
  a = play(p, a, {type: 'join', node: '0,0,0'}, ...split('0,3,0'));
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(boundsOf(q, a.board.splits), {inside: 7, cover: 9, gap: 2}, 'the worksheet’s small-square bounds');
});

test('the plus: a first split gains nothing, and its quarters gain', () => {
  const p = byId('covers-04'), q = p.parameters;
  let a = play(p, freshAttempt(p), ...split('1,1,0'));
  assert.deepEqual(boundsOf(q, a.board.splits), boundsOf(q, []), 'nothing changes');
  assert.equal(move(p, a, {type: 'join', node: '0,0,0'}), null, 'nothing to join there');
  a = play(p, a, ...split('2,2,1'));
  assert.equal(boundsOf(q, a.board.splits).gap, 4.75);
  assert.equal(move(p, a, {type: 'join', node: '1,1,0'}), null, 'a square with a split quarter does not join');
  a = play(p, a, ...split('3,2,1', '2,3,1', '3,3,1'));
  assert.ok(isSolved(p, a.board));
  assert.equal(plansOf(q).good.length, 5, 'one square of the plus and all its quarters');
  // Taps on the board name squares by their top-left smallest square.
  assert.equal(leafAt(q, [], '4,4'), '1,1,0');
  assert.equal(leafAt(q, ['1,1,0'], '6,4'), '3,2,1');
  assert.equal(leafAt(q, ['1,1,0', '3,2,1'], '6,4'), '6,4,2');
});

test('Best: refused until the plan is best, and the refusal survives Undo', () => {
  const p = byId('covers-06');
  let a = play(p, freshAttempt(p), ...split('1,0,0'));
  a = play(p, a, {type: 'best'});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(a.board.refused, 15.5);
  assert.match(view(p, a), /A smaller cover is possible\./);
  assert.equal(move(p, a, {type: 'best'}), null, 'not again until the cover beats 15½');
  const back = undoOnce(p, a);
  assert.equal(back.board.refused, 15.5, 'Undo takes back moves, not the refusal');
  assert.match(view(p, back), /data-move="\{&quot;type&quot;:&quot;best&quot;\}"[^>]*disabled/);
  a = play(p, a, {type: 'join', node: '1,0,0'}, ...split('0,0,0', '3,3,0'));
  assert.doesNotMatch(view(p, a), /A smaller cover is possible\./, 'said only while the refusal holds');
  a = play(p, a, {type: 'best'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /cv-ring/, 'the splits are ringed');
  assert.deepEqual([...gainsOf(p.parameters)].filter(([, v]) => v === 0.75).length, 4, 'each corner saves ¾ of cover');
  assert.equal((html.match(/class="cv-gain"/g) || []).length, 12, 'each yellow square shows its saving');
  const g = byId('covers-09');
  assert.deepEqual([...gainsOf(g.parameters).values()].sort(), [0.25, 0.25, 0.25, 0.25, 0.75, 0.75, 0.75, 0.75, 1, 1, 1, 1], 'for the gap the middles win');
});

test('paint: Can’t waits for a painting that fits; the bound is the certificate; Undo keeps the claim', () => {
  const p = byId('covers-07'), q = p.parameters;
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', bound: 'cover'}), null, 'nothing painted yet');
  assert.match(view(p, fresh), /data-focus="cv-cant"[^>]*disabled/);
  assert.notEqual(nextHint(p, fresh).action.type, 'cant', 'the first hint paints');
  // One small square in each yellow square, the green ones full.
  const fit = paintAll(p, fresh, [2, 12, 14, 15, 16, 20, 21, 24, 25, 26, 27, 30, 31, 32, 33]);
  assert.ok(fits(q, fit.board.painted));
  assert.equal(stopper(q), 'cover');
  M.ui(p, {pick: fit.board.painted.join()});
  const picking = view(p, fit);
  assert.match(picking, /cv-pick in before/);
  assert.match(picking, /data-focus="cv-pick-cover"/);
  const wrong = play(p, fit, {type: 'cant', bound: 'inside'});
  assert.equal(isSolved(p, wrong.board), false);
  assert.match(view(p, wrong), /Not that one\./);
  assert.equal(move(p, wrong, {type: 'cant', bound: 'cover'}), null, 'paused until the painting changes');
  assert.equal(undoOnce(p, wrong).board.wrong, 'inside', 'Undo does not lift the pause');
  M.ui(p, {pick: fit.board.painted.join()}); view(p, wrong);
  assert.doesNotMatch(view(p, fit), /cv-pick/, 'a closed choice is forgotten');
  assert.match(nextHint(p, wrong).text, /Then Can’t works again\./);
  const changed = play(p, wrong, {type: 'paint', squares: [3], on: true});
  assert.equal(changed.board.wrong, null);
  const right = play(p, changed, {type: 'cant', bound: 'cover'});
  assert.ok(isSolved(p, right.board));
  const html = view(p, right);
  assert.equal((html.match(/class="cv-sign"[^>]*>−</g) || []).length, 8, 'a minus on each clear small square of a yellow square');
  M.reset(p);
});

test('paint: a target that can be met refuses Can’t for good; the right painting solves', () => {
  const p = byId('covers-03');
  let a = paintAll(p, freshAttempt(p), [0, 2, 4, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  assert.ok(isSolved(p, a.board), 'one small square in each yellow square: 3¾');
  a = paintAll(p, freshAttempt(p), [0, 1, 2, 4, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  assert.equal(isSolved(p, a.board), false, '4 is not less than 4');
  const claimed = play(p, a, {type: 'cant', bound: 'inside'});
  assert.equal(claimed.board.refused, true);
  assert.match(view(p, claimed), /It can be done\./);
  assert.equal(undoOnce(p, claimed).board.refused, true, 'Undo keeps the refusal');
  assert.equal(undoOnce(p, undoOnce(p, claimed)).board.refused, true);
  assert.ok(isSolved(p, play(p, claimed, {type: 'paint', squares: [1], on: false}).board), 'the claim does not block the painting');
  // A big square painted full turns green, and its frame says it is off.
  const full = paintAll(p, freshAttempt(p), [0, 1, 6, 7]);
  assert.match(view(p, full), /cv-big part off/);
  const e = byId('covers-12'), fit = paintAll(e, freshAttempt(e), [2, 4, 16, 18, 19, 20, 21, 22, 26, 27, 28, 29, 34, 35, 36, 37, 42, 43, 44, 45]);
  const right = play(e, fit, {type: 'cant', bound: 'inside'});
  assert.ok(isSolved(e, right.board));
  assert.equal((view(e, right).match(/class="cv-sign"[^>]*>\+</g) || []).length, 4, 'a plus on each painted small square of a yellow square');
});

test('slides: arrows wrap round a square, a drag lands anywhere, and a step can make things worse', () => {
  const p = byId('covers-05'), q = p.parameters;
  const start = slideBounds(q, q.start);
  let a = play(p, freshAttempt(p), {type: 'nudge', way: 'up'});
  assert.deepEqual(a.board.at, [1, 2]);
  assert.ok(slideBounds(q, a.board.at).gap > start.gap, 'one step up makes the gap 8');
  a = play(p, a, {type: 'nudge', way: 'up'});
  assert.ok(isSolved(p, a.board));
  const d = byId('covers-08');
  let b = play(d, freshAttempt(d), {type: 'nudge', way: 'right'});
  assert.deepEqual(b.board.at, [0, 3], 'a full square round is the same grid');
  assert.ok(slideBounds(d.parameters, b.board.at).inside < slideBounds(d.parameters, d.parameters.start).inside);
  b = play(d, b, {type: 'slide', at: [1, 1]});
  assert.ok(isSolved(d, b.board));
  assert.equal(move(d, freshAttempt(d), {type: 'slide', at: [4, 0]}), null);
  const l = byId('covers-02');
  assert.deepEqual(slideBounds(l.parameters, [0, 0]), {inside: 3, cover: 3, gap: 0}, 'aligned');
  assert.deepEqual(slideBounds(l.parameters, [2, 0]), {inside: 1, cover: 5, gap: 4}, 'half a square sideways');
  assert.deepEqual(slideBounds(l.parameters, [2, 2]), {inside: 0, cover: 8, gap: 8}, 'half a square both ways');
});

test('hints: a wasted split is joined, paint hints fit the colours first, slides step toward the goal', () => {
  const p = byId('covers-10');
  const waste = play(p, freshAttempt(p), ...split('0,0,0'));
  assert.deepEqual(nextHint(p, waste).action, {type: 'join', node: '0,0,0'});
  assert.match(nextHint(p, waste).text, /^Join the square in row 1, column 1 again\.$/);
  const fresh = freshAttempt(p);
  assert.equal(nextHint(p, fresh).type, 'move');
  const e = byId('covers-12');
  let a = freshAttempt(e), texts = [];
  for (let i = 0; i < 40 && !isSolved(e, a.board); i++) { const h = nextHint(e, a); texts.push(h.text); a = move(e, a, h.action); }
  assert.ok(isSolved(e, a.board));
  assert.match(texts.at(-1), /^The green squares make 4, and each yellow square adds some paint, so the area is over 4\. Press Can’t and tap 4\.$/);
  assert.ok(texts.slice(0, -1).every(t => /^Paint /.test(t)), 'the painting comes first');
  const s = byId('covers-08');
  assert.match(nextHint(s, freshAttempt(s)).text, /^Slide the grid one step (left|up)\.$/);
});

test('hints and searches are quick', () => {
  for (const p of covers.puzzles) {
    const a = freshAttempt(p);
    nextHint(p, a); view(p, a);
    // The quickest of five runs, so a busy machine does not decide it.
    let least = Infinity;
    for (let i = 0; i < 5; i++) { const t = performance.now(); nextHint(p, a); view(p, a); least = Math.min(least, performance.now() - t); }
    assert.ok(least < 100, `${p.id}: a tap’s work takes well under 100 ms`);
  }
});

test('the playground: shapes, splits two levels deep, Clear, never solved, no hints', () => {
  const p = byId('covers-playground');
  assert.equal(M.noHint(p), true);
  let a = play(p, freshAttempt(p), ...split('3,0,0', '6,0,1'));
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, {type: 'clear'});
  assert.deepEqual(a.board.splits, []);
  a = play(p, a, {type: 'shape', shape: 'hexagon'});
  assert.equal(move(p, play(p, a, ...split('0,0,0')), {type: 'split', node: '0,0,1'}), null, 'the hexagon stops at one level');
  const html = view(p, a);
  assert.equal((html.match(/cv-pick-shape/g) || []).length, 5);
  assert.match(html, /aria-pressed="true" aria-label="Hexagon"/);
});

test('forged saves are rejected', () => {
  const s = byId('covers-04'), f = freshAttempt(s).board;
  assert.equal(validBoard(s, {...f, splits: ['2,2,1']}), false, 'a quarter without its square');
  assert.equal(validBoard(s, {...f, splits: ['1,1,0', '2,2,1', '3,2,1', '2,3,1', '3,3,1', '0,1,0']}), false, 'out of order and past the budget');
  assert.equal(validBoard(s, {...f, splits: ['1,1,0', '2,2,1', '4,4,2']}), false, 'below the deepest level');
  const b = byId('covers-09'), bf = freshAttempt(b).board;
  assert.equal(validBoard(b, {...bf, done: true}), false, 'Best on an unsplit board');
  assert.equal(validBoard(b, {...bf, refused: 9}), false, 'a refusal of the best value');
  assert.ok(validBoard(b, {...bf, refused: 12}));
  const c = byId('covers-12'), cf = freshAttempt(c).board;
  assert.equal(validBoard(c, {...cf, done: true}), false, 'Can’t on a painting that does not fit');
  assert.equal(validBoard(c, {...cf, refused: true}), false, 'a refusal when the target cannot be met');
  assert.equal(validBoard(c, {...cf, wrong: 'inside'}), false, 'the right bound marked wrong');
  const t = byId('covers-02');
  assert.equal(validBoard(t, {at: [0, 4]}), false);
  assert.equal(validBoard(t, {at: [0, 0], done: true}), false);
});

test('every puzzle renders its board, bar and one short objective at most', () => {
  for (const p of covers.puzzles) {
    M.reset(p);
    const a = freshAttempt(p), html = view(p, a), mode = p.parameters.mode;
    assert.match(html, /cv-puzzle/, p.id);
    assert.match(html, /cv-ruler/, p.id);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`), p.id);
    assert.ok(p.visibleObjective.length <= 45, `${p.id}: a short objective`);
    if (mode === 'playground') assert.equal(p.visibleObjective, '');
    else assert.match(html, /class="puzzle-goal"/, p.id);
    if (mode === 'split' || mode === 'playground') assert.match(html, /data-sg-piece=/, `${p.id}: squares to split`);
    if (mode === 'split') assert.match(html, /cv-slots/, `${p.id}: the slots`);
    if (mode === 'paint') assert.match(html, /data-sg-cell=/, `${p.id}: squares to paint`);
    if (mode === 'slide') { assert.match(html, /data-cv-slide/); assert.equal((html.match(/cv-button cv-nudge/g) || []).length, 4); }
    assert.doesNotMatch(html, /\b\d+ of \d+ (found|left)/i, `${p.id}: no counts to do the child’s work`);
  }
  const p = byId('covers-04'), a = play(p, freshAttempt(p), ...split('1,1,0'));
  assert.match(view(p, a), /cv-join/, 'a split square has a dot to join it');
  assert.match(view(p, {...a, hintLevel: 2}), /cv-hint/, 'a hint marks the square');
});
