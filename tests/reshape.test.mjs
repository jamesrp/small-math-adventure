// Missing square in Tile gardens: shapes, cuts and fits; a square puzzle
// cut at the top and fitted; a rebuild with its shelf, refused That's all
// and Undo; Can't with its picker and certificate; taps, slides and turns;
// hints; saves; drawing; and the Tile gardens group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {startCells, turnCells, canonTurn, splitBy, lineSpan, linesOf, cutReachable, cover, partitions, rectCells, apart, mostApart} from '../dist/families/reshape/cutmath.js';
import {reshapeMechanics, geometry, spotFor, turnSpot, slideMove, lineNear, tapSquare, pickSquare, ONE_PIECE} from '../dist/families/reshape/reshape.js';
import {loadPack} from '../scripts/packs.mjs';

const reshape = JSON.parse(await readFile(new URL('../dist/families/reshape/reshape.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => reshape.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const mech = reshapeMechanics.reshape;
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoCarry = (p, a) => { const next = undo(a); return {...next, board: mech.carry(p, a.board, next.board)}; };
const cut = (piece, dir, k) => ({type: 'cut', piece, dir, k});
const put = (piece, x, y, r = 0) => ({type: 'put', piece, x, y, r});

test('shapes, straight cuts and fits', () => {
  const L = startCells({w: 4, h: 4, notch: 2});
  assert.equal(L.length, 12, 'the 4 by 4 with a 2 by 2 corner gone');
  assert.ok(!L.some(([x, y]) => x >= 2 && y < 2), 'the corner gone is the top right');
  assert.deepEqual(turnCells([[0, 0], [1, 0], [2, 0]], 1), [[0, 0], [0, 1], [0, 2]], 'a quarter turn stands a strip up');
  assert.equal(canonTurn(rectCells(0, 0, 3, 2), 2), 0, 'a half turn leaves a rectangle as it was');
  assert.equal(canonTurn(rectCells(0, 0, 2, 2), 1), 0, 'a square has one way round');
  assert.equal(canonTurn(L, 2), 2, 'a corner piece has four');
  const [top, rest] = splitBy(L, 'h', 1);
  assert.deepEqual(top.map(i => L[i]), [[0, 0], [1, 0]], 'the top row of the arm');
  assert.equal(rest.length, 10);
  assert.deepEqual(lineSpan(L, 'h', 2), [0, 2, 2, 2], 'a line runs only across the paper');
  assert.equal(linesOf(rectCells(0, 0, 6, 2)).length, 6, 'a 6 by 2 has five lines down and one across');
  assert.equal(splitBy(rectCells(0, 0, 6, 2), 'v', 6), null, 'no cut along the edge');
  const R = rectCells(0, 0, 10, 4);
  assert.ok(cutReachable(R, [rectCells(0, 0, 10, 2), rectCells(0, 2, 5, 2), rectCells(5, 2, 5, 2)]), 'two straight cuts');
  assert.ok(!cutReachable(R, [rectCells(0, 0, 5, 2), rectCells(5, 0, 5, 4)]), 'pieces that miss squares');
  assert.ok(!cutReachable(R, [[...rectCells(0, 0, 5, 2), ...rectCells(5, 0, 5, 4)], rectCells(0, 2, 5, 2)]), 'a cut that turns a corner');
  assert.ok(cutReachable(R, [rectCells(0, 0, 5, 2), rectCells(5, 0, 5, 2), rectCells(0, 2, 5, 2), rectCells(5, 2, 5, 2)]), 'halves, then quarters');
  const frame = rectCells(0, 0, 7, 7).filter(([x, y]) => !(x >= 2 && x < 5 && y >= 2 && y < 5));
  assert.ok(cover(frame, Array.from({length: 4}, () => rectCells(0, 0, 5, 2))), 'four 5 by 2 pieces go round the 3 by 3 like a pinwheel');
  assert.equal(cover(frame, [rectCells(0, 0, 10, 2), rectCells(0, 0, 5, 2), rectCells(0, 0, 5, 2)]), null, 'a 10 by 2 is too long');
  assert.equal(partitions([rectCells(0, 0, 4, 2)], 1).length, 4, 'one cut of a 4 by 2: none, 1+3, 2+2, 4+4 across');
  assert.equal(mostApart(frame).length, 4, 'four squares round the middle need pieces of their own');
  assert.ok(apart(frame, [[3, 1], [1, 3], [5, 3], [3, 5]]));
  assert.ok(!apart(frame, [[3, 1], [4, 1]]), 'neighbours can share');
});

test('a square puzzle: cut at the top, fit, and the square left over', () => {
  const p = byId('reshape-02'), fresh = freshAttempt(p);
  assert.deepEqual(fresh.board, {pieces: [{cells: [...Array(12).keys()], at: null}], claim: null});
  let a = play(p, fresh, cut(0, 'v', 2));
  assert.deepEqual(a.board.pieces.map(piece => piece.cells.length), [4, 8], 'a 2 by 2 and a 4 by 2');
  assert.equal(move(p, a, cut(2, 'v', 4)), null, 'one cut only');
  a = play(p, a, put(2, 0, 2));
  assert.equal(move(p, a, cut(2, 'v', 4)), null, 'no cut on the grid');
  assert.equal(move(p, a, put(0, 1, 2)), null, 'no overlap');
  const tryCorner = play(p, a, put(0, 1, 0));
  assert.ok(!isSolved(p, tryCorner.board), 'two squares left apart are not one square');
  a = play(p, a, put(0, 2, 0));
  assert.ok(isSolved(p, a.board), 'the 2 by 2 left in the top right');
  assert.match(view(p, a), /rs-hole-ring[\s\S]*class="rs-hole-num"[^>]*>2</, 'the square left is ringed with its side');
  // Tape and Undo.
  const taped = play(p, play(p, fresh, cut(0, 'h', 1)), {type: 'tape'});
  assert.deepEqual(taped.board, fresh.board, 'Tape joins the pieces');
  assert.equal(move(p, fresh, {type: 'tape'}), null, 'nothing to tape');
  assert.deepEqual(undo(undo(taped)).board, fresh.board);
});

test('a dashed square: two cuts, and Can’t where three pieces can’t go round it', () => {
  const top = byId('reshape-09');
  let a = play(top, freshAttempt(top), cut(0, 'v', 4), cut(4, 'v', 5));
  a = play(top, a, put(0, 0, 2), put(4, 0, 0), put(5, 3, 0));
  assert.ok(isSolved(top, a.board), '4 by 2 below, a 2 by 1 each side of the dashed square');
  const p = byId('reshape-10'), G = geometry(p.parameters), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', cells: p.parameters.apart}), null, 'Can’t after a try');
  const tried = play(p, fresh, cut(0, 'h', 2));
  assert.deepEqual(pickSquare(p.parameters, G, [[3, 1]], [4, 1]), {said: ONE_PIECE, marked: [[3, 1], [4, 1]]}, 'neighbours share a piece');
  assert.equal(pickSquare(p.parameters, G, [], [3, 3]), null, 'not the dashed square');
  assert.deepEqual(pickSquare(p.parameters, G, [[3, 1]], [3, 1]), {picks: [], said: null, marked: []}, 'a second tap drops it');
  assert.deepEqual(pickSquare(p.parameters, G, [[3, 1], [1, 3], [5, 3]], [3, 5]), {claim: [[3, 1], [1, 3], [5, 3], [3, 5]]});
  assert.equal(move(p, tried, {type: 'cant', cells: [[3, 1], [1, 3], [5, 3]]}), null, 'three squares: three pieces could do');
  const done = play(p, tried, {type: 'cant', cells: [[3, 5], [5, 3], [1, 3], [3, 1]]});
  assert.ok(isSolved(p, done.board));
  assert.match(view(p, done), /class="rs-pick kept"/);
  const eleven = byId('reshape-11');
  assert.equal(move(eleven, play(eleven, freshAttempt(eleven), cut(0, 'h', 2)), {type: 'cant', cells: [[3, 1], [1, 3], [5, 3], [3, 5], [0, 0]]}), null, 'with three cuts no claim holds');
});

test('a rebuild: the shelf, a refused That’s all kept through Undo, and both rectangles', () => {
  const p = byId('reshape-07'), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'all'}), null, 'nothing made yet');
  let a = play(p, fresh, cut(0, 'v', 2), put(0, 0, 0), put(6, 2, 0));
  assert.deepEqual(a.board.found, [], 'pieces in an L are no rectangle');
  a = play(p, fresh, cut(0, 'h', 2), put(0, 0, 0), put(4, 2, 0));
  assert.deepEqual(a.board.found, ['6x2']);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.no, true, 'there’s another');
  assert.match(view(p, a), /There’s another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'not twice for the same shelf');
  const back = undoCarry(p, undoCarry(p, a));
  assert.deepEqual([back.board.found, back.board.no], [['6x2'], true], 'Undo keeps the rectangle and the refusal');
  a = play(p, back, {type: 'tape'}, cut(0, 'h', 1), put(0, 2, 0), put(2, 0, 0));
  assert.deepEqual(a.board.found, ['6x2', '4x3'], 'the 2 by 1 fills the notch');
  assert.equal(a.board.no, false, 'a new rectangle lifts the refusal');
  assert.equal((view(p, a).match(/class="rs-slot/g) || []).length, 2);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('taps: choose, cut near a line, put, turn, take back; slides', () => {
  const p = byId('reshape-02'), q = p.parameters, G = geometry(q), fresh = freshAttempt(p);
  mech.reset(p);
  const home = (x, y) => G.ofHome(G.home.findIndex(c => c[0] === x && c[1] === y)), mat = (x, y) => G.ofMat([x, y]);
  // The lone piece is chosen: a tap near the line x = 2 cuts there; a tap in
  // the middle of a square, or from a key, lets it go.
  assert.deepEqual(lineNear(G, fresh.board.pieces[0], [G.hx + 1.92, .5]), {dir: 'v', k: 2});
  assert.equal(lineNear(G, fresh.board.pieces[0], [G.hx + 1.5, .5]), null);
  assert.deepEqual(tapSquare(p, fresh.board, home(1, 0), [G.hx + 1.92, .5]), {move: cut(0, 'v', 2)});
  assert.deepEqual(tapSquare(p, fresh.board, home(1, 0), [G.hx + 1.5, .7]), {ui: {chosen: null}});
  assert.deepEqual(tapSquare(p, fresh.board, home(1, 0)), {ui: {chosen: null}});
  let a = play(p, fresh, cut(0, 'v', 2));
  assert.deepEqual(tapSquare(p, a.board, home(3, 1)), {ui: {chosen: 2, shake: 0}}, 'a tap chooses');
  mech.ui(p, {chosen: 2});
  assert.deepEqual(tapSquare(p, a.board, mat(3, 3)), {move: put(2, 0, 2, 0)}, 'a tap on the grid puts it, kept on the grid');
  a = play(p, a, put(2, 0, 2));
  mech.ui(p, {chosen: 2});
  assert.deepEqual(tapSquare(p, a.board, mat(1, 3)), {move: put(2, 0, 0, 1)}, 'a second tap turns it, kept on the grid');
  assert.deepEqual(turnSpot(q, G, a.board, a.board.pieces[1]), [0, 0, 1]);
  assert.deepEqual(tapSquare(p, a.board, home(2, 0)), {move: {type: 'home', piece: 2}}, 'a tap on its empty place takes it back');
  assert.deepEqual(spotFor(q, G, a.board, a.board.pieces[0], [3, 0]), [2, 0, 0], 'kept on the grid by its corner');
  assert.equal(spotFor(q, G, a.board, a.board.pieces[0], [3, 3]), null, 'no room there: a tap only shakes it');
  // Slides: the square held lands under the finger; up to the top goes home.
  assert.deepEqual(slideMove(q, G, a.board, home(1, 1), mat(3, 1)), put(0, 2, 0, 0));
  assert.deepEqual(slideMove(q, G, a.board, mat(2, 3), home(5, 0)), {type: 'home', piece: 2});
  assert.equal(slideMove(q, G, a.board, home(1, 1), home(0, 0)), null, 'a piece at the top stays');
});

test('hints: from fresh they solve each puzzle in well under 100 ms, and say what to do', () => {
  for (const p of reshape.puzzles) {
    let a = freshAttempt(p);
    for (let i = 0; i < 20 && !isSolved(p, a.board); i++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a hint in well under 100 ms (CPU time)`);
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
  const one = byId('reshape-01');
  let a = freshAttempt(one);
  assert.equal(nextHint(one, a).text, 'Cut the 4 by 2 into a 2 by 1 and a 3 by 2.');
  a = play(one, a, nextHint(one, a).action);
  assert.equal(nextHint(one, a).text, 'Turn the 2 by 1 and put it in the top right corner.');
  const two = byId('reshape-02');
  assert.equal(nextHint(two, play(two, freshAttempt(two), cut(0, 'v', 3))).text, 'Tape the pieces back together.', 'two 3 by 2 pieces can’t');
  const ten = byId('reshape-10');
  assert.equal(nextHint(ten, freshAttempt(ten)).action.type, 'cut', 'a try first');
  assert.equal(nextHint(ten, play(ten, freshAttempt(ten), cut(0, 'v', 5))).text, ten.parameters.cantText);
});

test('saves: forged boards are refused', () => {
  const p = byId('reshape-02'), r = byId('reshape-07'), c = byId('reshape-10');
  const whole = {cells: [...Array(12).keys()], at: null};
  assert.equal(validBoard(p, {pieces: [{cells: [0, 1, 6, 7], at: null}, {cells: [2, 3, 4, 5, 8, 9, 10, 11], at: null}], claim: null}), true, 'one cut');
  assert.equal(validBoard(p, {pieces: [{cells: [0, 1], at: null}, {cells: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], at: null}], claim: null}), false, 'no straight cut makes these');
  assert.equal(validBoard(p, {pieces: [whole], claim: [[0, 0]]}), false, 'no Can’t here');
  assert.equal(validBoard(p, {pieces: [{...whole, at: [0, 0, 0]}], claim: null}), false, 'the whole rectangle off the square');
  assert.equal(validBoard(r, {pieces: [whole], found: ['12x1'], no: false, done: false}), false, 'one cut can’t make 12 by 1');
  assert.equal(validBoard(r, {pieces: [whole], found: ['6x2'], no: false, done: true}), false, 'That’s all with one of two');
  assert.equal(validBoard(c, {pieces: [{cells: [...Array(40).keys()], at: null}], claim: c.parameters.apart}), false, 'a claim before a try');
});

test('drawing: cut lines on the chosen piece at the top only; buttons as they apply', () => {
  const p = byId('reshape-02'), fresh = freshAttempt(p);
  let html = view(p, fresh);
  assert.equal((html.match(/data-rs-cut="/g) || []).length, 6, 'the lone piece shows every line');
  assert.equal((html.match(/class="rs-snip on"/g) || []).length, 1, 'one pair of scissors');
  assert.match(html, /class="secondary rs-button rs-turn"[^>]*disabled/, 'Turn waits for a piece on the grid');
  assert.match(html, /class="secondary rs-button rs-tape"[^>]*disabled/, 'Tape waits for a cut');
  assert.doesNotMatch(html, /rs-cant|rs-all/, 'no Can’t or That’s all here');
  let a = play(p, fresh, cut(0, 'v', 2), put(2, 0, 2));
  mech.reset(p);
  mech.ui(p, {chosen: 2});
  html = view(p, a, true);
  assert.doesNotMatch(html, /data-rs-cut/, 'no lines on a piece on the grid, and no cuts left');
  assert.doesNotMatch(html, /class="secondary rs-button rs-turn"[^>]*disabled/, 'Turn for a chosen piece on the grid');
  const c = byId('reshape-10');
  assert.match(view(c, freshAttempt(c)), /rs-cant"[^>]*disabled/, 'Can’t waits for a try');
  assert.doesNotMatch(view(c, play(c, freshAttempt(c), cut(0, 'h', 2))), /rs-cant"[^>]*disabled/);
  const r = byId('reshape-07');
  html = view(r, freshAttempt(r));
  assert.match(html, /rs-all"[^>]*disabled/, 'That’s all waits for a rectangle');
  assert.doesNotMatch(html, /rs-shelf/);
});

test('the group sits in Tile gardens, with no playground of its own', () => {
  for (const p of reshape.puzzles) {
    assert.equal(p.libraryFamily, 'tile');
    assert.equal(p.group, 'Missing square');
    assert.equal(p.band, 'all');
  }
  const profile = {id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}};
  const html = libraryView(profile, pack.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-tile"'));
  const tile = family.slice(0, family.indexOf('</details>'));
  assert.match(tile, /<h2>Missing square<\/h2>/);
  assert.ok(tile.indexOf('data-id="reshape-01"') < tile.indexOf('data-id="reshape-12"'));
  assert.ok(tile.indexOf('<h2>Squares</h2>') < tile.indexOf('<h2>Missing square</h2>'), 'after Squares');
  assert.ok(!reshape.puzzles.some(p => p.band === 'playground'));
});
