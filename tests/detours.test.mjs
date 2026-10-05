// Road detours: shortening, turning points, reachability, walking and
// Shorten, what is told, collecting every route, each-way roads, the
// playground, hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {shorten, turns, cancelAt, reachable, results, canStep, needs} from '../dist/families/detours/detours.js';
import {loadPack} from '../scripts/packs.mjs';

const detours = JSON.parse(await readFile(new URL('../dist/families/detours/detours.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => detours.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const steps = dots => [...dots].map(to => ({type: 'step', to}));
const cancelAll = (p, a) => { while (turns(a.board.trip).length) a = play(p, a, {type: 'cancel', at: turns(a.board.trip)[0]}); return a; };

test('turning points, cancelling and the shortest form', () => {
  assert.deepEqual(turns([...'ABABDFDE']), [1, 2, 5], 'B between two As, A between two Bs, F between two Ds');
  assert.equal(cancelAt([...'ABCBD'], 2).join(''), 'ABD');
  assert.equal(shorten([...'CBABDEDBDF']).join(''), 'CBDF', 'a new turning point appears and goes');
  assert.equal(shorten([...'HABHCDHBAHDCH']).join(''), 'HABHCDHBAHDCH', 'the commutator keeps every step');
  assert.equal(shorten([...'ABCDCBA']).join(''), 'A');
});

test('reachable: only by cancelling pairs that never straddle a kept step', () => {
  assert.ok(reachable([...'ABABDFDE'], [...'ABDFDE']));
  assert.ok(reachable([...'ABABDFDE'], [...'ABDE']));
  assert.ok(reachable([...'ABCBA'], [...'ABA']), 'cancel at C');
  assert.equal(reachable([...'ABDBA'], [...'ABCBA']), false, 'a step that was never there');
  assert.equal(reachable([...'ABCDA'], [...'A']), false, 'a whole turn never cancels');
  assert.equal(reachable([...'AB'], [...'BA']), false);
});

test('shorten puzzles: any order, the same end', () => {
  const p = byId('detours-02');
  assert.deepEqual(turns(p.parameters.trip), [3, 6]);
  let a = play(p, freshAttempt(p), {type: 'cancel', at: 6}, {type: 'cancel', at: 3});
  assert.equal(a.board.trip.join(''), 'CBDBDF');
  assert.equal(move(p, a, {type: 'cancel', at: 1}), null, 'B is between C and D');
  a = play(p, a, {type: 'cancel', at: 3});
  assert.ok(isSolved(p, a.board));
  assert.equal(a.board.trip.join(''), 'CBDF');
  const b = play(p, freshAttempt(p), {type: 'cancel', at: 3});
  assert.deepEqual(turns(b.board.trip), [2, 4], 'a new turning point at D');
  assert.equal(move(p, freshAttempt(p), {type: 'step', to: 'B'}), null, 'no walking in a shorten puzzle');
});

test('make: walk, Shorten tells what is missing, then cancel to a solve or a miss', () => {
  const p = byId('detours-05');
  let a = play(p, freshAttempt(p), ...steps('BCDA'));
  a = play(p, a, {type: 'shorten'});
  assert.deepEqual(a.board.told, {kind: 'need', what: 'steps'});
  assert.equal(move(p, a, {type: 'shorten'}), null, 'change the trip first');
  a = play(p, a, ...steps('BADA'));
  assert.equal(a.board.told, null, 'a step clears the answer');
  assert.equal(move(p, a, {type: 'step', to: 'B'}), null, 'eight steps at most');
  a = play(p, a, {type: 'shorten'});
  assert.deepEqual(a.board.input, [...'ABCDABADA']);
  assert.equal(move(p, a, {type: 'step', to: 'B'}), null, 'no walking while shortening');
  a = cancelAll(p, a);
  assert.ok(isSolved(p, a.board), 'A, B, C, D, A once around');
  let b = play(p, freshAttempt(p), ...steps('BABADADA'), {type: 'shorten'});
  b = cancelAll(p, b);
  assert.deepEqual(b.board.told, {kind: 'miss'});
  assert.equal(isSolved(p, b.board), false);
  b = play(p, b, {type: 'new'});
  assert.deepEqual(b.board, freshAttempt(p).board);
});

test('a trip that is to lose no steps shows its turning point', () => {
  const p = byId('detours-09');
  let a = play(p, freshAttempt(p), ...steps('ABHBAHCDH'));
  assert.deepEqual(needs(p.parameters, a.board.trip), []);
  a = play(p, a, {type: 'shorten'});
  assert.deepEqual(a.board.told, {kind: 'pair', at: 3});
  assert.equal(a.board.input, null);
  a = play(p, freshAttempt(p), ...steps('ABHCDHBAH'), {type: 'shorten'});
  assert.ok(isSolved(p, a.board), 'left, right, left back');
});

test('each-way roads are never taken the same way twice', () => {
  const p = byId('detours-10'), q = p.parameters;
  const a = play(p, freshAttempt(p), ...steps('ABH'));
  assert.equal(canStep(q, a.board.trip, 'A'), false, 'H to A again');
  assert.equal(move(p, a, {type: 'step', to: 'A'}), null);
  assert.ok(canStep(q, a.board.trip, 'B'), 'H to B is the other way');
  const done = play(p, freshAttempt(p), ...steps('ABHCDHBAHDCH'), {type: 'shorten'});
  assert.ok(isSolved(p, done.board), 'the commutator');
});

test('every route: keep, found already, there is another, That’s all, Undo keeps the row', () => {
  const p = byId('detours-06');
  assert.equal(p.parameters.answers, 5);
  assert.deepEqual(results(p.parameters).map(r => r.join('')), ['A', 'ABCDA', 'ADCBA', 'ABCDABCDA', 'ADCBADCBA']);
  const route = (a, dots) => cancelAll(p, play(p, a, ...steps(dots), {type: 'shorten'}));
  let a = route(freshAttempt(p), 'BABABABA');
  assert.deepEqual(a.board.found, [['A']]);
  assert.equal(play(p, a, {type: 'all'}).board.told.kind, 'more');
  a = route(play(p, a, {type: 'new'}), 'BCDABABA');
  assert.equal(a.board.found.length, 2);
  const again = route(play(p, a, {type: 'new'}), 'BABCDABA');
  assert.equal(again.board.told.kind, 'again');
  const undone = undo(play(p, a, {type: 'new'}));
  assert.equal(undone.board.found.length, 2, 'Undo keeps what was found');
  a = route(play(p, a, {type: 'new'}), 'DCBADABA');
  a = route(play(p, a, {type: 'new'}), 'BCDABCDA');
  a = route(play(p, a, {type: 'new'}), 'DCBADCBA');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('the playground: any map, walking and cancelling mixed', () => {
  const p = detours.puzzles.find(x => x.band === 'playground');
  let a = play(p, freshAttempt(p), {type: 'map', map: 'rings'}, ...steps('ABA'), {type: 'cancel', at: 2}, ...steps('BH'));
  assert.equal(a.board.trip.join(''), 'HABH');
  assert.equal(move(p, a, {type: 'map', map: 'rings'}), null, 'already on that map');
  assert.equal(move(p, a, {type: 'step', to: 'H'}), null, 'no road from H to H');
  assert.equal(nextHint(p, a).type, 'done');
});

test('hints alone solve every puzzle, from fresh and after wandering', () => {
  for (const p of detours.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p), n = 0;
    while (!isSolved(p, a.board) && n++ < 200) {
      const h = nextHint(p, a);
      if (h.type === 'deadend') { a = undo(a); continue; }
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id} solves`);
  }
});

test('forged saves are rejected', () => {
  const p = byId('detours-05'), fresh = freshAttempt(p).board;
  assert.equal(validBoard(p, {...fresh, trip: [...'AC']}), false, 'no road from A to C');
  assert.equal(validBoard(p, {...fresh, trip: [...'BA']}), false, 'trips start at A');
  assert.equal(validBoard(p, {...fresh, trip: [...'ABCDA'], input: [...'ABCDA']}), false, 'the input has eight steps');
  assert.equal(validBoard(p, {...fresh, trip: [...'ABCDA'], input: [...'ADCBADCBA']}), false, 'not reachable from the input');
  assert.equal(validBoard(p, {...fresh, told: {kind: 'pair', at: 1}}), false);
  const e = byId('detours-06');
  assert.equal(validBoard(e, {...freshAttempt(e).board, found: [['A'], ['A']]}), false, 'a route twice');
  assert.equal(validBoard(e, {...freshAttempt(e).board, found: [[...'ABA']]}), false, 'not a shortened route');
  assert.equal(validBoard(e, {...freshAttempt(e).board, found: [['A']], done: true}), false, 'That’s all too soon');
});

test('every puzzle renders its board and controls', () => {
  for (const p of detours.puzzles) {
    const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
    assert.match(html, /dt-puzzle/, p.id);
    assert.match(html, /gb-board/, p.id);
  }
  const p = byId('detours-01'), html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cancel&quot;,&quot;at&quot;:2\}"/, 'turning points are buttons');
  const w = byId('detours-03'), walk = playView(w, play(w, freshAttempt(w), ...steps('B')), {pack, selected: null, message: ''});
  assert.match(walk, /dt-pips/);
  assert.match(walk, /data-gb-node="C"/, 'the pawn’s neighbours can be tapped');
  assert.doesNotMatch(walk, /data-gb-node="E"/);
});
