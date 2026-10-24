// Ruler strips: join and gap ranges, a locked total, breaking a claim, Can't
// and Widest judged by two pinned joins (not on the press), widening a band
// against the app's attack, a strip drawn twice, gaps pinned, Undo, presses
// on contested controls, clamped drags, hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {rangeMechanics, extremes, breakable, widest, attack, reach, nearestTarget, actionFor, settings, certificates} from '../dist/families/ranges/ranges.js';
import {loadPack} from '../scripts/packs.mjs';

const ranges = JSON.parse(await readFile(new URL('../dist/families/ranges/ranges.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => ranges.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const set = (strip, length) => ({type: 'set', strip, length});
// Set the strips that differ, then pin.
const pinAt = (p, a, len) => play(p, Object.keys(len).reduce((b, s) => b.board.len[s] === len[s] ? b : play(p, b, set(s, len[s])), a), {type: 'pin'});
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const M = rangeMechanics.ranges;

test('join and gap ranges, and a locked total cutting a band', () => {
  const span = id => { const q = byId(id).parameters; return extremes(q, q.cards).map(e => [e.lo, e.hi]); };
  assert.deepEqual(span('ranges-01'), [[7, 10]]);
  assert.deepEqual(span('ranges-02'), [[8, 12]]);
  assert.deepEqual(span('ranges-03'), [[3, 4]], 'the same A taken away leaves B');
  assert.deepEqual(span('ranges-06'), [[1, 5]], 'longest less shortest, shortest less longest');
  assert.deepEqual(span('ranges-07'), [[3, 3], [1, 5]], 'the same A cancels; a separate B does not');
  assert.deepEqual(span('ranges-09'), [[2, 6]]);
  const q8 = byId('ranges-09').parameters;
  assert.deepEqual(reach(q8, q8.cards, q8.start, 'A'), [7, 9], 'A = 10 would need B = 2');
  assert.deepEqual(reach(q8, q8.cards, q8.start, 'B'), [3, 5]);
  assert.equal(settings(q8, q8.cards).length, 3);
  assert.equal(breakable(byId('ranges-01').parameters), true);
  assert.equal(breakable(byId('ranges-04').parameters), false);
  assert.deepEqual(widest(byId('ranges-05').parameters), [[4, 5]]);
  assert.deepEqual(widest(byId('ranges-08').parameters), [[3, 5]], 'A twice: one unit on A’s band is two on the join');
  assert.deepEqual(span('ranges-08'), [[11, 16]], 'the starting band 4 to 6 lets 16 out');
});

test('breaking a claim: one join outside the window', () => {
  const p = byId('ranges-01');
  let a = play(p, freshAttempt(p), set('A', 4));
  assert.equal(isSolved(p, a.board), false, '8 is inside');
  a = play(p, a, set('B', 3));
  assert.ok(isSolved(p, a.board), '7 breaks “always reaches 8”');
  assert.equal(move(p, freshAttempt(p), set('A', 7)), null, 'A stays inside its band');
  assert.equal(move(p, freshAttempt(p), set('A', 5)), null, 'the same length is no move');
});

test('Can’t: only after a try, no verdict on the press, judged by the two extreme joins', () => {
  const p1 = byId('ranges-01'), fresh = freshAttempt(p1);
  assert.equal(move(p1, fresh, {type: 'cant'}), null, 'no Can’t on a fresh board');
  let wrong = play(p1, fresh, set('A', 6), {type: 'cant'});
  assert.deepEqual([wrong.board.cant, wrong.board.told], [true, null], 'the press says nothing');
  assert.match(view(p1, wrong), /Pin the shortest and the longest join\./, 'the same words as on a board that holds');
  assert.equal(move(p1, wrong, {type: 'cant'}), null);
  wrong = play(p1, wrong, set('A', 4), {type: 'pin'}, set('A', 6), {type: 'pin'});
  assert.equal(wrong.board.told, 'shorter', '8 and 10 are not the shortest and the longest: 7 is');
  assert.equal(M.carry(p1, wrong.board, undo(wrong).board).told, 'shorter', 'Undo keeps the refusal');
  assert.ok(isSolved(p1, play(p1, wrong, set('A', 4), set('B', 3)).board), 'the shorter join breaks the claim');

  const p = byId('ranges-04');
  let a = play(p, freshAttempt(p), set('B', 4));
  assert.equal(move(p, a, {type: 'pin'}), null, 'no pin before Can’t');
  a = play(p, a, {type: 'cant'});
  assert.equal(a.board.cant, true);
  assert.equal(isSolved(p, a.board), false, 'Can’t alone is no solve');
  assert.match(view(p, a), /Pin the shortest and the longest join\./);
  assert.ok(!/class="rg-pin"/.test(view(p, a)), 'nothing is pinned for the child');
  a = play(p, a, {type: 'pin'}, set('A', 5));
  const refused = play(p, a, {type: 'pin'});
  assert.equal(refused.board.told, 'longer', '8 and 9 are not the shortest and the longest');
  assert.deepEqual(refused.board.pins, [], 'a refusal clears the pins');
  assert.match(view(p, refused), /A join can be longer\./);
  assert.equal(M.carry(p, refused.board, undo(refused).board).told, 'longer', 'Undo keeps the refusal while the strips stay put');
  assert.equal(play(p, refused, set('B', 5)).board.told, null, 'a move clears it');
  const lone = nextHint(p, play(p, freshAttempt(p), set('B', 4), set('A', 5), {type: 'cant'}, {type: 'pin'}));
  assert.equal(lone.type, 'deadend', 'a pin that is neither extreme is a dead end');
  assert.equal(lone.quiet, true, 'told only behind Hint: one pin is not judged alone');
  a = play(p, a, set('B', 5));
  assert.equal(isSolved(p, a.board), false, 'the longest join counts only when pinned');
  a = play(p, a, {type: 'pin'});
  assert.ok(isSolved(p, a.board), 'the shortest and the longest join, pinned together, certify it');
  assert.match(view(p, a), /Every join ends from 8 to 10\./);
});

test('widening: the app attacks each band; Widest is judged by pins on the window’s edges', () => {
  const p = byId('ranges-05'), q = p.parameters, fresh = freshAttempt(p);
  assert.deepEqual(fresh.board.len, {A: 4, B: 6}, 'the starting band 5 to 6 lets 4 + 6 = 10 out');
  assert.deepEqual(attack(q, [4, 5]), {A: 3, B: 4}, 'a safe band: the extreme nearest an edge');
  assert.deepEqual(attack(q, [3, 5]), {A: 3, B: 3}, '3 + 3 = 6 escapes');
  assert.equal(move(p, fresh, set('A', 3)), null, 'no strip moves before Widest');
  assert.equal(move(p, fresh, {type: 'widest'}), null, 'no Widest before the band moves');
  let a = play(p, fresh, {type: 'card', strip: 'B', end: 'hi', value: 5}, {type: 'widest'});
  assert.deepEqual([a.board.claim, a.board.told], [true, null], 'B 5 to 5: the press says nothing');
  assert.ok(a.board.len.A + a.board.len.B >= 8 && a.board.len.A + a.board.len.B <= 9, 'the strips are the child’s after Widest');
  a = play(p, a, {type: 'pin'}, set('A', a.board.len.A === 3 ? 4 : 3), {type: 'pin'});
  assert.equal(a.board.told, 'wider', '8 and 9 are the shortest and the longest join, but 8 is off the edge');
  assert.match(view(p, a), /The band can be wider\./);
  assert.equal(M.carry(p, a.board, undo(a).board).told, 'wider', 'Undo keeps the refusal');
  a = play(p, a, {type: 'card', strip: 'B', end: 'lo', value: 3});
  assert.equal(a.board.claim, false, 'moving the band takes Widest back');
  a = pinAt(p, pinAt(p, play(p, a, {type: 'widest'}), {A: 3, B: 3}), {A: 4, B: 5});
  assert.equal(a.board.told, 'outside', 'B 3 to 5: 3 + 3 = 6 lands outside');
  assert.match(view(p, a), /A join lands outside\./);
  a = play(p, freshAttempt(p), {type: 'card', strip: 'B', end: 'hi', value: 5}, {type: 'card', strip: 'B', end: 'lo', value: 4}, {type: 'widest'});
  assert.equal(a.board.claim, true);
  const at = a.board.len.A + a.board.len.B;
  assert.ok(at > 7 && at < 9, 'after Widest the strips start between the edges, so neither pin is free');
  a = pinAt(p, pinAt(p, a, {A: 3, B: 4}), {A: 4, B: 5});
  assert.ok(isSolved(p, a.board), '3 + 4 = 7 and 4 + 5 = 9 pin both edges');

  const p8 = byId('ranges-08');
  let b = play(p8, freshAttempt(p8), {type: 'card', strip: 'A', end: 'hi', value: 5}, {type: 'card', strip: 'A', end: 'lo', value: 3}, {type: 'widest'});
  b = pinAt(p8, pinAt(p8, b, {A: 3, B: 3}), {A: 5, B: 4});
  assert.ok(isSolved(p8, b.board), 'A twice: 3 + 3 + 3 = 9 and 5 + 5 + 4 = 14');
});

test('gaps: two pins judged together; the same A keeps its gap; a locked total moves both strips', () => {
  const p6 = byId('ranges-06');
  const g = play(p6, freshAttempt(p6), set('A', 15), set('B', 10), {type: 'pin'}, set('A', 13), set('B', 12), {type: 'pin'});
  assert.ok(isSolved(p6, g.board), 'the cross pairing: 15 − 10 = 5 and 13 − 12 = 1');
  assert.equal(play(p6, freshAttempt(p6), set('A', 15), set('B', 12), {type: 'pin'}, set('A', 13), set('B', 10), {type: 'pin'}).board.told, 'bigger', 'like with like gives 3 both times');
  const p = byId('ranges-07');
  let a = play(p, freshAttempt(p), set('A', 6), set('B', 4), {type: 'pin'});
  assert.equal(a.board.pins.length, 1);
  const wrong = play(p, a, set('A', 5), {type: 'pin'});
  assert.equal(wrong.board.told, 'smaller', 'the bottom gap can be smaller than 4');
  assert.match(view(p, wrong), /A gap can be smaller\./);
  a = play(p, a, set('A', 4), set('B', 6));
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, {type: 'pin'});
  assert.ok(isSolved(p, a.board), 'A 6 with B 4 and A 4 with B 6: the top gap is 3 both times, the bottom 5 and 1');
  assert.equal(certificates(p.parameters, p.parameters.cards).length, 2, 'only those two settings, in either order');

  const p8 = byId('ranges-09');
  assert.equal(move(p8, freshAttempt(p8), set('A', 10)), null, 'A can’t be 10: B would be 2');
  const b8 = play(p8, freshAttempt(p8), set('B', 3));
  assert.deepEqual(b8.board.len, {A: 9, B: 3}, 'moving B moves A');
});

test('a press goes to the nearest control in its row; drags are held inside what they can reach', () => {
  const pg = byId('ranges-playground'), q = pg.parameters;
  const b = {cards: {A: [3, 3], B: [3, 5]}, len: {A: 3, B: 4}};
  assert.equal(nearestTarget(q, b, 'A', 3.4, 0.2).end, 'hi', 'the band’s two ends meet: a press right of them takes the right end');
  assert.equal(nearestTarget(q, b, 'A', 2.6, 0.2).end, 'lo');
  assert.equal(nearestTarget(q, b, 'A', 3.1, 0.6).kind, 'set', 'lower in the row, the strip’s end is nearer');
  assert.equal(nearestTarget(q, b, 'B', 4.9, 0.2).end, 'hi');
  assert.equal(nearestTarget(q, b, 'B', 4.2, 0.55).kind, 'set');
  // A row with handles has the band's lane on top and the strip's below, so a
  // strip end on its band's end is still easy to tell from the handle.
  const met = {cards: {A: [2, 4], B: [3, 5]}, len: {A: 4, B: 4}};
  assert.equal(nearestTarget(q, met, 'A', 4, 0.8).kind, 'set', 'the strip’s lane: its end, though the band’s end is on the same unit');
  assert.equal(nearestTarget(q, met, 'A', 4, 0.2).end, 'hi', 'the band’s lane: the band’s right end');
  assert.equal(nearestTarget(q, met, 'A', 1.2, 0.8).kind, 'set', 'anywhere in the strip’s lane');
  const p5 = byId('ranges-05'), f5 = freshAttempt(p5).board;
  assert.equal(nearestTarget(p5.parameters, f5, 'B', 6.6, 0.5).end, 'hi', 'before Widest only the band’s ends move');
  assert.equal(nearestTarget(p5.parameters, f5, 'A', 3, 0.5), null, 'A is the app’s before Widest');
  assert.deepEqual(actionFor(p5.parameters, f5, {kind: 'card', strip: 'B', end: 'hi'}, 40), {type: 'card', strip: 'B', end: 'hi', value: 8}, 'a band stops where the join would leave the ruler');
  const p8 = byId('ranges-09'), f8 = freshAttempt(p8).board;
  assert.deepEqual(actionFor(p8.parameters, f8, {kind: 'set', strip: 'A'}, 12), set('A', 9), 'a drag past 9 stops at 9');
  assert.deepEqual(actionFor(byId('ranges-08').parameters, freshAttempt(byId('ranges-08')).board, {kind: 'card', strip: 'A', end: 'hi'}, 40), {type: 'card', strip: 'A', end: 'hi', value: 6}, 'A twice: its band stops at 6, as 6 + 6 + 4 = 16');
  assert.deepEqual(actionFor(p8.parameters, f8, {kind: 'set', strip: 'A'}, -3), set('A', 7));
});

test('hints: idea first, a try before Can’t, and a solve from anywhere', () => {
  for (const p of ranges.puzzles.filter(p => p.band !== 'playground')) {
    assert.ok(!/press/i.test(p.hints[0]), `${p.id}: the first hint is an idea`);
    let a = freshAttempt(p);
    const first = nextHint(p, a);
    assert.notEqual(first.action.type, 'cant', `${p.id}: Can’t is never the first move`);
    for (let k = 0; k < 30 && !isSolved(p, a.board); k++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve it`);
  }
  assert.deepEqual(nextHint(byId('ranges-playground'), freshAttempt(byId('ranges-playground'))), {type: 'note'});
  assert.equal(M.noHint(byId('ranges-playground')), true);
});

test('saves: forged boards are refused', () => {
  const p = byId('ranges-04'), b = freshAttempt(p).board;
  assert.equal(validBoard(p, {...b, len: {A: 6, B: 4}}), false);
  assert.equal(validBoard(p, {...b, cant: 'no', tried: true}), false, 'a Can’t that is not true or false');
  assert.equal(validBoard(p, {...b, cant: true, tried: true, pins: [{A: 5, B: 5}, {A: 5, B: 4}]}), false, 'two pins that are not the certificate');
  assert.equal(validBoard(p, {...b, cant: true, tried: true, pins: [{A: 4, B: 4}, {A: 5, B: 5}]}), true, 'the certificate');
  assert.equal(validBoard(p, {...b, pins: [{A: 4, B: 4}]}), false, 'a pin before Can’t');
  const p5 = byId('ranges-05'), b5 = freshAttempt(p5).board;
  assert.equal(validBoard(p5, {...b5, len: {A: 3, B: 5}}), false, 'strips that are not the app’s attack');
  assert.equal(validBoard(p5, {...b5, card: [4, 9]}), false, 'a band past the ruler');
});

test('render: sliders with names, Can’t waits for a try, no objective where the board shows it', () => {
  const p = byId('ranges-01'), fresh = freshAttempt(p);
  M.reset?.(p);
  const html = view(p, fresh);
  assert.match(html, /role="slider" aria-label="A’s end" aria-valuemin="4" aria-valuemax="6" aria-valuenow="5"/);
  assert.match(html, /data-focus="rg-knob-B"/);
  assert.match(html, /<button[^>]*rg-button[^>]*disabled>Can’t<\/button>/, 'Can’t is off until a try');
  assert.match(view(p, play(p, fresh, set('A', 4))), /<button[^>]*rg-button[^>]*data-focus="rg-knob-A" >Can’t<\/button>/);
  const html5 = view(byId('ranges-05'), freshAttempt(byId('ranges-05')));
  assert.match(html5, /aria-label="B’s band, left end"/);
  assert.ok(!/aria-label="A’s end"/.test(html5), 'no strip slider before Widest');
  assert.match(html5, /class="rg-end broken"/, 'the app’s escaping join is drawn');
  const html8 = view(byId('ranges-09'), freshAttempt(byId('ranges-09')));
  assert.match(html8, /class="rg-wall"/);
  assert.match(html8, /aria-valuemin="7" aria-valuemax="9"/, 'A’s slider reaches only 7 to 9');
  for (const q of ranges.puzzles) assert.ok(!view(q, freshAttempt(q)).includes(q.title), `${q.id}: no puzzle title on the board`);
});
