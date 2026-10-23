// Drawing machines: the machine's geometry, the record and its sheets, dots,
// outlines with their red strays, the box and That's all with its refusal
// through Undo, pins and the green shape, two machines, the playground,
// hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {Q, outOf, tipsOf, knobFor, legalPose, stepSet, sameSet, outlineSteps, latticeOn, replay, touched, knobVisits, solutions, insideDots, frameOf, barOf} from '../dist/families/pantograph/pantograph.js';
import entry from '../dist/families/pantograph/pantograph.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/pantograph/pantograph.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const hop = to => ({type: 'hop', to}), draw = to => ({type: 'draw', to});
const q4 = ([x, y]) => [Q * x, Q * y];

test('the machine: ×2 and ×½ about the pin, and two machines make a slide', () => {
  assert.deepEqual(outOf('double', q4([0, 0]), q4([3, 1])), q4([6, 2]));
  assert.deepEqual(outOf('half', q4([1, 1]), q4([9, 3])), q4([5, 2]));
  assert.deepEqual(outOf('half', q4([0, 0]), q4([1, 0])), [2, 0], 'a half point');
  const tips = tipsOf(['double', 'half'], [q4([6, 2]), q4([2, 6])], q4([4, 3]));
  assert.deepEqual(tips, [q4([4, 3]), q4([2, 4]), q4([2, 5])], 'knob, middle pencil, pencil');
  assert.deepEqual(knobFor(['double'], [q4([0, 0])], q4([6, 2])), [3, 1]);
  assert.equal(knobFor(['double'], [q4([0, 0])], q4([5, 5])), null, 'no knob dot for an odd dot');
  assert.deepEqual(knobFor(['double', 'half'], [q4([6, 2]), q4([2, 6])], q4([2, 5])), [4, 3]);
  const sheet = {paper: [10, 8]};
  assert.equal(legalPose(sheet, ['double'], [q4([0, 0])], q4([0, 0])), null, 'folded shut');
  assert.equal(legalPose(sheet, ['double'], [q4([0, 0])], q4([6, 1])), null, 'pencil off the sheet');
  assert.ok(legalPose(sheet, ['double'], [q4([0, 0])], q4([5, 4])));
});

test('the frame: bars of fixed length, the pencil at 2T − O', () => {
  const sheet = {paper: [10, 8]}, a = barOf(sheet);
  for (const [o, t] of [[[0, 0], [1, 1]], [[5, 4], [7, 6]], [[1, 0], [5, 4]], [[3, 7], [3, 4]]]) {
    const f = frameOf(sheet, o, t), d = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
    assert.ok(Math.abs(d(o, f.X) - a) < 1e-9 && Math.abs(d(f.X, t) - a) < 1e-9 && Math.abs(d(t, f.Y) - a) < 1e-9);
    assert.ok(Math.abs(d(o, f.Q) - 2 * a) < 1e-9 && Math.abs(d(f.Q, f.F) - 2 * a) < 1e-9);
    assert.ok(d(f.F, [2 * t[0] - o[0], 2 * t[1] - o[1]]) < 1e-9);
  }
  assert.equal(frameOf(sheet, [2, 2], [2, 2]), null);
});

test('drawings compare as steps: pieces and repeats are the same line', () => {
  const whole = stepSet([[q4([0, 0]), q4([4, 2])]]);
  const pieces = stepSet([[q4([0, 0]), q4([2, 1])], [q4([4, 2]), q4([2, 1])], [q4([2, 1]), q4([4, 2])]]);
  assert.ok(sameSet(whole, pieces));
  assert.ok(sameSet(outlineSteps([[0, 0], [2, 0], [2, 2]]), outlineSteps([[2, 2], [0, 0], [2, 0]])));
  assert.deepEqual(latticeOn(q4([0, 0]), q4([4, 2])), [[0, 0], [2, 1], [4, 2]]);
});

test('dots: a stop or a line through a dot reaches it', () => {
  const p = byId('pantograph-01');
  let a = play(p, freshAttempt(p), hop([3, 1]));
  let st = replay(p.parameters, a.board);
  assert.ok(touched(st).has('6,2'));
  a = play(p, a, draw([5, 2]));
  st = replay(p.parameters, a.board);
  assert.ok(touched(st).has('10,4') && touched(st).has('8,3'), 'the line from (6, 2) to (10, 4) passes (8, 3)');
  assert.match(view(p, a), /pg-target-dot hit/);
  a = play(p, a, hop([4, 4]), hop([1, 3]), hop([2, 4]));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, hop([3, 3])), null, 'nothing moves after a solve');
});

test('an outline: green on it, red off it, solved by any route', () => {
  const p = byId('pantograph-04');
  let a = play(p, freshAttempt(p), draw([3, 2]));
  assert.match(view(p, a), /pg-ink off/);
  assert.deepEqual(nextHint(p, a), {type: 'deadend', quiet: true, text: 'The pencil drew off the outline. Undo.'});
  a = freshAttempt(p);
  a = play(p, a, hop([5, 3]), draw([5, 1]), draw([1, 1]), draw([1, 3]), draw([3, 4]));
  assert.match(view(p, a), /pg-ink on/);
  assert.ok(!isSolved(p, a.board));
  a = play(p, a, draw([5, 3]));
  assert.ok(isSolved(p, a.board), 'the house, drawn backwards from the right wall');
});

test('swapped tips: the knob goes twice as far', () => {
  const p = byId('pantograph-07'), q = p.parameters;
  assert.deepEqual(q.knobOutline, [[3, 3], [9, 3], [9, 7], [3, 7]]);
  let a = freshAttempt(p);
  for (const m of q.witness) a = play(p, a, m);
  assert.ok(isSolved(p, a.board));
  // A knob box the right size in the wrong place gives a copy in the wrong place.
  let b = play(p, freshAttempt(p), hop([1, 2]), draw([7, 2]), draw([7, 6]), draw([1, 6]), draw([1, 2]));
  assert.ok(!isSolved(p, b.board));
  assert.match(view(p, b), /pg-ink off/);
});

test('the box: marks, That’s all refused, kept through Undo, then claimed', () => {
  const p = byId('pantograph-05'), q = p.parameters;
  assert.equal(insideDots(q).length, 12);
  assert.match(view(p, freshAttempt(p)), /pg-all"[^>]*disabled/, 'That’s all is off before any leaf dot');
  assert.equal(move(p, play(p, freshAttempt(p), hop([2, 0])), {type: 'all'}), null, 'crosses alone leave it off');
  let a = play(p, freshAttempt(p), hop([2, 1]));
  let html = view(p, a);
  assert.doesNotMatch(html, /pg-all"[^>]*disabled/, 'a leaf dot turns it on');
  assert.match(html, /pg-mark in/); assert.match(html, /pg-mark out/, 'the start knob dot is outside');
  a = play(p, a, {type: 'all'});
  assert.match(view(p, a), /There are more\./);
  assert.match(view(p, a), /pg-all"[^>]*disabled/);
  const back = undoPress(p, a, att => view(p, att), view(p, a));
  assert.match(view(p, back), /There are more\./);
  a = play(p, back, hop([2, 2]));
  assert.doesNotMatch(view(p, a), /There are more\./);
  a = play(p, a, hop([2, 1]), draw([5, 1]), hop([2, 2]), draw([5, 2]), hop([2, 3]), draw([5, 3]));
  assert.equal([...knobVisits(replay(q, a.board))].filter(k => insideDots(q).includes(k)).length, 12);
  assert.equal(nextHint(p, a).action.type, 'all');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('pins and the green shape: a fresh sheet each time, the old one faded', () => {
  const p = byId('pantograph-08'), q = p.parameters;
  assert.equal(solutions(q).length, 1);
  let a = play(p, freshAttempt(p), draw([4, 3]));
  a = play(p, a, {type: 'pin', k: 0, to: [0, 3]});
  const st = replay(q, a.board);
  assert.equal(st.sheets.length, 2); assert.equal(st.sheet.tr.length, 0);
  assert.match(view(p, a), /pg-sheet faded/);
  assert.equal(nextHint(p, a).action.type, 'pin');
  assert.match(nextHint(p, a).text, /halfway between the pin and its outline corner/);
  const s = byId('pantograph-10');
  const h = nextHint(s, freshAttempt(s));
  assert.deepEqual(h.action, {type: 'stencil', to: [1, 1]});
  assert.match(view(s, {...freshAttempt(s), hintLevel: 2}), /pg-ghost"/, 'the hint shows where the shape goes');
  assert.doesNotMatch(view(s, freshAttempt(s)), /pg-ghost/, 'no old pin and no ghost before a hint');
  assert.match(h.text, /half as far as the copy has to move/);
});

test('two machines: the copy slides by half the gap between the pins', () => {
  const p = byId('pantograph-12'), q = p.parameters;
  assert.equal(solutions(q).length, 14);
  assert.ok(solutions(q).every(s => s.pins[1][0] - s.pins[0][0] === 6 && s.pins[1][1] - s.pins[0][1] === 2));
  let a = play(p, freshAttempt(p), {type: 'pin', k: 0, to: [3, 6]}, {type: 'pin', k: 1, to: [9, 8]}, draw([5, 6]), draw([3, 3]), draw([5, 3]));
  assert.ok(isSolved(p, a.board), 'a pair the authors did not pick');
  const html = view(p, freshAttempt(p));
  assert.match(html, /pg-frame m1/); assert.match(html, /pg-mid/);
  assert.equal((html.match(/data-focus="pg-pin-/g) || []).length, 2, 'both pins can be moved');
  assert.equal((view(byId('pantograph-11'), freshAttempt(byId('pantograph-11'))).match(/data-focus="pg-pin-/g) || []).length, 1, 'one pin moves in Two machines');
});

test('the playground: draw, swap the tips, move the pin, clear', () => {
  const g = pack.puzzles.find(p => p.band === 'playground');
  assert.equal(mechanicFor(g).noHint(g), true);
  let a = play(g, freshAttempt(g), draw([5, 3]), {type: 'tips'});
  assert.match(view(g, a), /aria-pressed="true"[^>]*>×½/);
  a = play(g, a, draw([6, 4]), {type: 'pin', k: 0, to: [6, 6]}, draw([6, 3]));
  assert.equal((view(g, a).match(/pg-sheet faded/g) || []).length, 2, 'every earlier drawing fades');
  a = play(g, a, {type: 'clear'});
  assert.deepEqual(a.board, {kind: 'half', pins: [[6, 6]], tracer: [6, 3], log: []});
  assert.ok(!isSolved(g, a.board));
});

test('saves: forged records are rejected', () => {
  const p = byId('pantograph-03');
  assert.ok(validBoard(p, {log: [draw([4, 1])]}));
  assert.ok(!validBoard(p, {log: [draw([6, 1])]}), 'the pencil off the sheet');
  assert.ok(!validBoard(p, {log: [{type: 'pin', k: 0, to: [1, 0]}]}), 'a fixed pin');
  assert.ok(!validBoard(p, {log: [hop([0, 0])]}), 'onto the pin');
  assert.ok(!validBoard(p, {log: []  , shut: null}), 'fields of another kind of puzzle');
  assert.ok(!validBoard(p, null));
  const r = byId('pantograph-05');
  assert.ok(!validBoard(r, {log: [], shut: null, claimed: true}), 'a claim before the dots are found');
  assert.ok(!validBoard(r, {log: [], shut: insideDots(r.parameters), claimed: false}), 'a refusal with every dot');
});

test('every puzzle renders its board and controls, and the hints solve it', () => {
  for (const p of pack.puzzles) {
    let a = freshAttempt(p);
    const html = view(p, a);
    assert.match(html, /data-mechanic-wire="pantograph"/, p.id);
    assert.match(html, /<svg class="pg-board/, p.id);
    assert.match(html, /data-focus="pg-knob"/, `${p.id}: the knob is a control`);
    assert.doesNotMatch(html, /NaN|undefined/, p.id);
    assert.equal(p.familyTitle, 'Drawing machines');
    if (p.band === 'playground') continue;
    for (let k = 0; k < 60 && !isSolved(p, a.board); k++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve it`);
    assert.doesNotMatch(view(p, a), /data-focus="pg-knob"/, `${p.id}: a solved board has no controls`);
  }
  assert.equal(entry.family.symbol, '⟋');
  assert.ok(pack.puzzles.filter(p => p.band !== 'playground').every(p => ['easy', 'medium', 'hard'].includes(p.difficulty_level)));
});

test('hints answer quickly', () => {
  for (const p of pack.puzzles.filter(p => p.band !== 'playground')) {
    const t0 = performance.now();
    for (let k = 0; k < 10; k++) nextHint(p, freshAttempt(p));
    assert.ok((performance.now() - t0) / 10 < 150, `${p.id}: a hint in under 150 ms`);
  }
});
