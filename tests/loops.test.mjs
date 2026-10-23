// Loop worlds: distances and refusals, making a world from clues, Can't with
// three clues (and a refused claim kept through Undo), every repair and
// That's all, pinning a world with a second world drawn, the playground,
// hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import * as W from '../dist/families/loops/world.js';
import {loopMechanics, cardTap, labelTap, clueTap, repairs, wasted} from '../dist/families/loops/loops.js';
import {loadPack} from '../scripts/packs.mjs';

const loops = JSON.parse(await readFile(new URL('../dist/families/loops/loops.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => loops.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) loopMechanics[p.mechanic].reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const solveByHints = (p, a) => { for (let k = 0; k < 120 && !isSolved(p, a.board); k++) { const h = nextHint(p, a); assert.equal(h.type, 'move', `${p.id}: ${h.text}`); a = move(p, a, h.action); assert.ok(a); } return a; };
const tell = (p, a, payload) => loopMechanics[p.mechanic].ui(p, {...payload, at: JSON.stringify(a.board)});

test('distances: the smallest loop round both cards, the frame 8; loops nest or keep apart', () => {
  const w = [[2, ['A', 'B']], [4, ['A', 'B', 'D']], [2, ['C', 'E']]];
  assert.ok(W.isWorld([...'ABCDE'], w));
  assert.equal(W.distance(w, 'A', 'B'), 2);
  assert.equal(W.distance(w, 'A', 'D'), 4);
  assert.equal(W.distance(w, 'B', 'C'), 8, 'the frame');
  assert.equal(W.distance(w, 'C', 'E'), 2);
  assert.deepEqual(W.refusal(w, 2, ['B', 'C']), {why: 'cross', loop: 0});
  assert.deepEqual(W.refusal(w, 2, ['A', 'B', 'D']), {why: 'order', loop: 0}, 'a 2 loop round a 2 loop');
  assert.equal(W.refusal(w, 4, ['C', 'E']), null, 'a 4 loop round the cards of a 2 loop changes nothing, but is allowed');
  assert.equal(W.refusal(w, 4, ['A', 'B']).why, 'order', 'not inside the 4 loop round A, B and D');
  assert.deepEqual(W.refusal(w, 2, ['A', 'B']), {why: 'same', loop: 0});
  assert.deepEqual(W.refusal(w, 2, ['A']), {why: 'few', loop: -1});
  assert.equal(W.refusal(w, 4, ['A', 'B', 'C', 'D', 'E']).why, 'order', 'a 4 loop round a 4 loop');
  assert.equal(W.fewest([...'ABCDEF'], []), 15, 'with no loops every pair needs its own clue');
});

test('making a world: tap cards then a number; clues light; a refused loop is told and ringed', () => {
  const p = byId('loops-02'), m = loopMechanics.loops;
  let a = freshAttempt(p);
  assert.deepEqual(cardTap(p, a.board, 'A'), {pick: ['A']});
  tell(p, a, {pick: ['A', 'B']});
  assert.deepEqual(labelTap(p, a.board, 2), {move: {type: 'add', label: 2, cards: ['A', 'B']}});
  a = play(p, a, {type: 'add', label: 2, cards: ['A', 'B']});
  let html = view(p, a);
  assert.equal((html.match(/lp-clue lit/g) || []).length, 1, 'A–B = 2 lights');
  tell(p, a, {pick: ['B', 'C']});
  const r = labelTap(p, a.board, 4);
  assert.deepEqual(r, {told: 'cross', loop: 0});
  tell(p, a, {told: r.told, loop: r.loop, pick: ['B', 'C']});
  html = view(p, a, true);
  assert.match(html, /Loops can’t cross\./);
  assert.match(html, /lp-loop l2 refused/, 'the loop in the way is ringed');
  a = play(p, a, {type: 'add', label: 4, cards: ['A', 'B', 'C']});
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/lp-clue lit/g) || []).length, 3);
  assert.equal(m.move(p, a.board, {type: 'remove', label: 4, cards: ['A', 'B', 'C']}), null, 'a solved board takes no moves');
});

test('Can’t: three clues on three cards whose biggest is there once; a refused claim keeps Can’t shut, through Undo', () => {
  const p3 = byId('loops-03');
  let a = play(p3, freshAttempt(p3), {type: 'cant', clues: [2, 0, 1]});
  assert.ok(isSolved(p3, a.board), '2, 2, 4');
  const p7 = byId('loops-07'), m = loopMechanics.loops;
  // A–B, A–D, B–D (2, 8, 8): loops can make these.
  a = play(p7, freshAttempt(p7), {type: 'add', label: 2, cards: ['A', 'B']}, {type: 'cant', clues: [0, 2, 4]});
  assert.equal(isSolved(p7, a.board), false);
  let html = view(p7, a);
  assert.match(html, /Loops can make these\./);
  assert.match(html, /lp-world mini/, 'with a world for the three');
  assert.match(html, /lp-cant[^>]*disabled/, 'Can’t is shut');
  assert.equal(m.move(p7, a.board, {type: 'cant', clues: [0, 1, 3]}), null);
  const h = nextHint(p7, a);
  assert.equal(h.text, 'Take away the 2 loop round A and B, then press Can’t.');
  // Undo takes back the loop, not the claim: the refusal goes with the loop it was made on.
  const b = play(p7, a, {type: 'add', label: 2, cards: ['C', 'D']});
  assert.equal(b.board.claim, null, 'a loop change opens Can’t');
  const back = undoPress(p7, b);
  assert.deepEqual(back.board.claim, [0, 2, 4], 'Undo keeps the refusal on the same loops');
  // Tapping three clues not on three cards is told.
  tell(p7, a, {claiming: [0, 1]});
  const fresh = freshAttempt(p7);
  tell(p7, fresh, {claiming: [0, 5]});
  assert.deepEqual(clueTap(p7, fresh.board, 1), {claiming: [], told: 'three'});
  tell(p7, fresh, {claiming: [0, 1]});
  assert.deepEqual(clueTap(p7, fresh.board, 3), {move: {type: 'cant', clues: [0, 1, 3]}});
  a = play(p7, fresh, {type: 'cant', clues: [0, 1, 3]});
  assert.ok(isSolved(p7, a.board), 'A–B, A–C, B–C: 2, 4, 2');
  // Where loops can make every clue, every claim is refused.
  const p8 = byId('loops-08');
  a = play(p8, freshAttempt(p8), {type: 'cant', clues: [0, 1, 2]});
  assert.equal(isSolved(p8, a.board), false);
});

test('every repair: a change cycles a clue’s number; a repair is kept when every clue lights; That’s all', () => {
  const p = byId('loops-10');
  assert.deepEqual(repairs(p.parameters), [[0, 4], [1, 4], [2, 2]], 'A–B to 4, A–C to 4, B–C to 2');
  let a = play(p, freshAttempt(p), {type: 'change', clue: 1});
  assert.deepEqual(a.board.change, [1, 4]);
  a = play(p, a, {type: 'change', clue: 1});
  assert.deepEqual(a.board.change, [1, 8]);
  a = play(p, a, {type: 'change', clue: 1});
  assert.equal(a.board.change, null, 'back to the printed number');
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a repair');
  a = play(p, a, {type: 'change', clue: 1}, {type: 'add', label: 2, cards: ['A', 'B']}, {type: 'add', label: 2, cards: ['D', 'E']}, {type: 'add', label: 4, cards: ['A', 'B', 'C']});
  assert.deepEqual(a.board.found, [[1, 4]], 'the original world: A–C to 4');
  let html = view(p, a);
  assert.match(html, /lp-found/);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null);
  const back = undoPress(p, a);
  assert.deepEqual(back.board.found, [[1, 4]], 'Undo keeps the repair found');
  assert.equal(back.board.told, 'more', 'and the line');
  a = solveByHints(p, a);
  assert.deepEqual(a.board.found, [[0, 4], [1, 4], [2, 2]]);
  assert.equal(a.board.told, 'all');
});

test('pin: two cards ask a clue; full pips with another world draw it; the fewest clues solve', () => {
  const p = byId('loops-11');
  let a = freshAttempt(p);
  assert.deepEqual(cardTap(p, a.board, 'B'), {pick: ['B']});
  tell(p, a, {pick: ['B']});
  assert.deepEqual(cardTap(p, a.board, 'A'), {move: {type: 'ask', pair: ['A', 'B']}});
  a = play(p, a, {type: 'ask', pair: ['B', 'A']}, {type: 'ask', pair: ['D', 'E']}, {type: 'ask', pair: ['A', 'C']}, {type: 'ask', pair: ['B', 'C']});
  assert.equal(isSolved(p, a.board), false, 'B–C is settled by A–B and A–C');
  assert.deepEqual(wasted(p.parameters, a.board.asked), ['B', 'C']);
  let html = view(p, a);
  assert.match(html, /This world fits too\./);
  assert.match(html, /Another world that fits these clues/);
  tell(p, a, {pick: ['A']});
  assert.deepEqual(cardTap(p, a.board, 'D'), {pick: [], told: 'full'});
  assert.equal(nextHint(p, a).text, 'Take away the clue B–C.');
  a = play(p, a, {type: 'drop', pair: ['B', 'C']}, {type: 'ask', pair: ['C', 'E']});
  assert.ok(isSolved(p, a.board), 'A–B, D–E, A–C and one 8 across');
  const p12 = byId('loops-12');
  let b = play(p12, freshAttempt(p12), ...[['A', 'B'], ['C', 'D'], ['E', 'F'], ['A', 'C'], ['C', 'E'], ['B', 'D']].map(pair => ({type: 'ask', pair})));
  assert.equal(isSolved(p12, b.board), false, 'two 8s don’t settle the third');
  const other = W.otherWorld(p12.parameters.cards, p12.parameters.world, b.board.asked);
  assert.equal(W.distance(other, 'A', 'E'), 4, 'the other world pulls two pairs into a 4 loop');
});

test('the playground: any loops, two cards show their distance; never solved, no hint', () => {
  const p = byId('loops-playground'), m = loopMechanics.loops;
  let a = play(p, freshAttempt(p), {type: 'add', label: 2, cards: ['A', 'B']}, {type: 'add', label: 4, cards: ['A', 'B', 'C']});
  tell(p, a, {pick: ['A', 'C']});
  assert.match(view(p, a, true), /aria-label="Distance"[\s\S]*<b>4<\/b>/);
  assert.equal(isSolved(p, a.board), false);
  assert.ok(m.noHint(p));
});

test('hints solve every puzzle from fresh, never opening with the answer', () => {
  for (const p of loops.puzzles.filter(p => p.parameters.mode !== 'playground')) {
    const a = solveByHints(p, freshAttempt(p));
    assert.ok(isSolved(p, a.board), p.id);
    assert.ok(!/Can’t|That’s all/.test(p.hints[0]), `${p.id}: first hint`);
  }
});

test('forged saves are rejected', () => {
  assert.equal(validBoard(byId('loops-01'), {loops: [[2, ['A', 'B']], [2, ['B', 'C']]], claim: null}), false, 'crossing loops');
  assert.equal(validBoard(byId('loops-01'), {loops: [[4, ['A', 'B']], [2, ['A', 'B', 'C']]], claim: null}), false, 'numbers shrinking outward');
  assert.equal(validBoard(byId('loops-01'), {loops: [[2, ['B', 'A']]], claim: null}), false, 'cards out of order');
  assert.equal(validBoard(byId('loops-07'), {loops: [], claim: [0, 1, 5]}), false, 'a claim on four cards');
  assert.equal(validBoard(byId('loops-10'), {loops: [], change: null, found: [[3, 4]], told: null}), false, 'a repair that is not one');
  assert.equal(validBoard(byId('loops-10'), {loops: [], change: null, found: [[0, 4]], told: 'all'}), false, 'That’s all with one found');
  assert.equal(validBoard(byId('loops-11'), {asked: [['A', 'B'], ['A', 'C'], ['A', 'D'], ['A', 'E'], ['B', 'C']]}), false, 'past the pips');
  assert.equal(validBoard(byId('loops-11'), {asked: [['B', 'A']]}), false, 'a pair out of order');
});

test('every puzzle renders with no puzzle name and no button inside another; Hint rings the next step', () => {
  for (const p of loops.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /lp-puzzle/, p.id);
    assert.match(html, /lp-world/, p.id);
    assert.ok(!html.includes(`>${p.title}<`), `${p.id}: no puzzle name on the play screen`);
    assert.doesNotMatch(html, /<button[^>]*>(?:(?!<\/button>).)*<button/s, `${p.id}: no nested buttons`);
  }
  const p = byId('loops-06'), a = freshAttempt(p);
  const hinted = view(p, {...a, hintLevel: 2});
  assert.match(hinted, /lp-card hinted/, 'the second Hint rings the cards');
  assert.match(hinted, /lp-label l2 hinted/, 'and the number');
  const p9 = byId('loops-09');
  assert.match(view(p9, {...freshAttempt(p9), hintLevel: 2}), /lp-cant hinted/);
});

test('the pack: fifteen puzzles and a playground, the number cards as a group', () => {
  assert.equal(loops.puzzles.length, 16);
  assert.deepEqual(loops.puzzles.filter(p => p.group).map(p => p.id), ['loops-num-01', 'loops-num-02']);
  assert.ok(loops.puzzles.filter(p => p.group).every(p => p.mechanic === 'loopsnum' && p.band === 'all'));
  const modes = loops.puzzles.map(p => p.parameters.mode);
  assert.deepEqual([...new Set(modes)].sort(), ['make', 'pin', 'playground', 'repair']);
  for (const p of loops.puzzles) assert.ok(p.parent.sourceIds.every(id => loops.sources.some(s => s.id === id)), p.id);
});
