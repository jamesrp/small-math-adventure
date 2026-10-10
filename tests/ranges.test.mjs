// Ruler strips: join and gap ranges, a locked total, breaking a claim, Can't
// after a try with its two extreme joins pinned and judged together, widening a band against the app's
// attack, Widest and its pinning joins, gaps kept as they are made, Undo,
// presses on contested controls, clamped drags, hints, saves and rendering.
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
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const M = rangeMechanics.ranges;

test('join and gap ranges, and a locked total cutting a band', () => {
  const span = id => { const q = byId(id).parameters; return extremes(q, q.cards).map(e => [e.lo, e.hi]); };
  assert.deepEqual(span('ranges-01'), [[7, 10]]);
  assert.deepEqual(span('ranges-02'), [[8, 12]]);
  assert.deepEqual(span('ranges-03'), [[3, 4]], 'the same A taken away leaves B');
  assert.deepEqual(span('ranges-06'), [[3, 3], [1, 5]], 'the same A cancels; a separate B does not');
  assert.deepEqual(span('ranges-08'), [[2, 6]]);
  const q8 = byId('ranges-08').parameters;
  assert.deepEqual(reach(q8, q8.cards, q8.start, 'A'), [7, 9], 'A = 10 would need B = 2');
  assert.deepEqual(reach(q8, q8.cards, q8.start, 'B'), [3, 5]);
  assert.equal(settings(q8, q8.cards).length, 3);
  assert.equal(breakable(byId('ranges-01').parameters), true);
  assert.equal(breakable(byId('ranges-04').parameters), false);
  assert.deepEqual(widest(byId('ranges-05').parameters), [[4, 5]]);
  assert.deepEqual(widest(byId('ranges-07').parameters), [[4, 6]]);
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

test('Can’t: only after a try, refused for good when wrong, and certified by the two extreme joins', () => {
  const p1 = byId('ranges-01'), fresh = freshAttempt(p1);
  assert.equal(move(p1, fresh, {type: 'cant'}), null, 'no Can’t on a fresh board');
  const wrong = play(p1, fresh, set('A', 6), {type: 'cant'});
  assert.equal(wrong.board.cant, 'no');
  assert.equal(move(p1, wrong, {type: 'cant'}), null);
  const back = undo(wrong);
  assert.equal(M.carry(p1, wrong.board, back.board).cant, 'no', 'Undo takes back the move, not the refusal');
  assert.match(view(p1, wrong), /It can break\./);

  const p = byId('ranges-04');
  let a = play(p, freshAttempt(p), set('B', 4));
  assert.equal(move(p, a, {type: 'pin'}), null, 'no pin before Can’t');
  a = play(p, a, {type: 'cant'});
  assert.equal(a.board.cant, 'yes');
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
  assert.equal(nextHint(p, play(p, freshAttempt(p), set('B', 4), set('A', 5), {type: 'cant'}, {type: 'pin'})).type, 'deadend', 'a pin that is neither extreme is a dead end');
  a = play(p, a, set('B', 5));
  assert.equal(isSolved(p, a.board), false, 'the longest join counts only when pinned');
  a = play(p, a, {type: 'pin'});
  assert.ok(isSolved(p, a.board), 'the shortest and the longest join, pinned together, certify it');
  assert.match(view(p, a), /Every join ends from 8 to 10\./);
});

test('widening: the app attacks each band; Widest is checked; the strips move only after it', () => {
  const p = byId('ranges-05'), q = p.parameters, fresh = freshAttempt(p);
  assert.deepEqual(fresh.board.len, {A: 4, B: 6}, 'the starting band 5 to 6 lets 4 + 6 = 10 out');
  assert.deepEqual(attack(q, [4, 5]), {A: 3, B: 4}, 'a safe band: the extreme nearest an edge');
  assert.deepEqual(attack(q, [3, 5]), {A: 3, B: 3}, '3 + 3 = 6 escapes');
  assert.equal(move(p, fresh, set('A', 3)), null, 'no strip moves before Widest');
  let a = play(p, fresh, {type: 'card', strip: 'B', end: 'hi', value: 5});
  a = play(p, a, {type: 'widest'});
  assert.equal(a.board.claim, 'no', 'B 5 to 5 can be wider');
  assert.match(view(p, a), /It can be wider\./);
  assert.equal(move(p, a, {type: 'widest'}), null, 'the answer waits for a change');
  assert.equal(M.carry(p, a.board, undo(a).board).claim, 'no', 'Undo keeps the refusal on the same band');
  a = play(p, a, {type: 'card', strip: 'B', end: 'lo', value: 3});
  assert.equal(a.board.claim, null);
  a = play(p, a, {type: 'widest'});
  assert.match(view(p, a), /A join lands outside\./);
  a = play(p, freshAttempt(p), {type: 'card', strip: 'B', end: 'hi', value: 5}, {type: 'card', strip: 'B', end: 'lo', value: 4}, {type: 'widest'});
  assert.equal(a.board.claim, 'yes');
  assert.equal(move(p, a, {type: 'card', strip: 'B', end: 'lo', value: 3}), null, 'the band is fixed after Widest');
  a = play(p, a, {type: 'pin'}, set('A', 4), set('B', 5), {type: 'pin'});
  assert.ok(isSolved(p, a.board), '3 + 4 = 7 and 4 + 5 = 9 pin both ends');
});

test('gaps: two pins judged together; the same A keeps its gap; a locked total moves both strips', () => {
  const p = byId('ranges-06');
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

  const p8 = byId('ranges-08');
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
  const p5 = byId('ranges-05'), f5 = freshAttempt(p5).board;
  assert.equal(nearestTarget(p5.parameters, f5, 'B', 6.6, 0.5).end, 'hi', 'before Widest only the band’s ends move');
  assert.equal(nearestTarget(p5.parameters, f5, 'A', 3, 0.5), null, 'A is the app’s before Widest');
  assert.deepEqual(actionFor(p5.parameters, f5, {kind: 'card', strip: 'B', end: 'hi'}, 40), {type: 'card', strip: 'B', end: 'hi', value: 8}, 'a band stops where the join would leave the ruler');
  const p8 = byId('ranges-08'), f8 = freshAttempt(p8).board;
  assert.deepEqual(actionFor(p8.parameters, f8, {kind: 'set', strip: 'A'}, 12), set('A', 9), 'a drag past 9 stops at 9');
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
  assert.equal(validBoard(p, {...b, cant: 'no', tried: true}), false, 'a refusal on a claim that holds');
  assert.equal(validBoard(p, {...b, cant: 'yes', tried: true, pins: [{A: 5, B: 5}, {A: 5, B: 4}]}), false, 'two pins that are not the certificate');
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
  const html8 = view(byId('ranges-08'), freshAttempt(byId('ranges-08')));
  assert.match(html8, /class="rg-wall"/);
  assert.match(html8, /aria-valuemin="7" aria-valuemax="9"/, 'A’s slider reaches only 7 to 9');
  for (const q of ranges.puzzles) assert.ok(!view(q, freshAttempt(q)).includes(q.title), `${q.id}: no puzzle title on the board`);
});
