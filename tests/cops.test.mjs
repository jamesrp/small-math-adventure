// Cops and robbers: game values, the perfect robber, catching within the
// moves, keeping R away against every C move (with jumps and new starts),
// Can't in both directions, adding roads, folds and their refusals, two cops,
// the playground, hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import * as game from '../dist/families/cops/game.js';
import {copsMechanics, gameOf, chase, escapeState, roadTap, foldTap, twoTap, twoChase, goodSets, stepWords} from '../dist/families/cops/cops.js';
import {loadPack} from '../scripts/packs.mjs';

const cops = JSON.parse(await readFile(new URL('../dist/families/cops/cops.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => cops.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) copsMechanics[p.mechanic].reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const solveByHints = (p, a) => { for (let k = 0; k < 80 && !isSolved(p, a.board); k++) { const h = nextHint(p, a); assert.equal(h.type, 'move', `${p.id}: ${h.text}`); a = move(p, a, h.action); assert.ok(a); } return a; };

test('values: paths and trees by their farthest dots, rings and the house robber-win, two cops on rings', () => {
  const starts = id => { const q = byId(id).parameters, G = gameOf(q); return Object.fromEntries(G.ids.map((x, i) => [x, game.oneCop(G).start(i)])); };
  assert.deepEqual(starts('cops-01'), {a: 4, b: 3, c: 2, d: 3, e: 4});
  assert.equal(starts('cops-02').d, 3);
  assert.equal(starts('cops-05').h, 5, 'the bent branch from h');
  assert.equal(starts('cops-03').c, 2);
  for (const id of ['cops-04', 'cops-06', 'cops-08']) assert.ok(Object.values(starts(id)).every(v => v === Infinity), `${id}: R escapes from every start`);
  assert.equal(starts('cops-07').d, 2, 'the triangle with a tail from d');
  const q = byId('cops-11').parameters;
  assert.deepEqual(goodSets(q).map(s => s.map(r => r.join('')).join('+')).sort(), ['ac+ad', 'ac+ce', 'ad+bd', 'bd+be', 'be+ce'], 'only roads sharing an end');
  const two = id => { const t = byId(id).parameters, G = gameOf(t), s = G.index[t.start]; return game.twoCops(G).start(s, s); };
  assert.equal(two('cops-two-01'), 3);
  assert.equal(two('cops-two-02'), 4);
});

test('catching: R starts far and holds out; C moves one road; the pips run out', () => {
  const p = byId('cops-01');
  let a = play(p, freshAttempt(p), {type: 'start', at: 'b'});
  const G = gameOf(p.parameters);
  assert.equal(G.ids[chase(G, 'b', []).r], 'e', 'R runs to the far end');
  assert.equal(move(p, a, {type: 'move', to: 'd'}), null, 'one road at a time');
  a = play(p, a, {type: 'move', to: 'c'}, {type: 'move', to: 'd'});
  assert.equal(isSolved(p, a.board), false);
  assert.match(view(p, a), /Out of moves\./);
  assert.equal(move(p, a, {type: 'move', to: 'e'}), null, 'no moves past the pips');
  assert.equal(nextHint(p, a).type, 'deadend');
  a = undo(undo(undo(a)));
  assert.equal(a.board.start, null, 'Undo takes back each move with R’s answer, then the start');
  assert.equal(G.ids[chase(G, 'c', []).r], 'a', 'from the middle R takes an end');
  a = play(p, a, {type: 'start', at: 'c'}, {type: 'move', to: 'b'}, {type: 'move', to: 'a'});
  assert.ok(isSolved(p, a.board), 'from the middle, two moves');
  assert.match(view(p, a), /C caught R\./);
});

test('a losing move is told only behind Hint, and Undo recovers', () => {
  const p = byId('cops-05');
  let a = play(p, freshAttempt(p), {type: 'move', to: 'h'});
  const h = nextHint(p, a);
  assert.equal(h.type, 'deadend');
  assert.ok(h.quiet, 'only behind Hint');
  a = solveByHints(p, undo(a));
  assert.ok(isSolved(p, a.board));
});

test('keeping R away on the square: three answers cover every C move', () => {
  const p = byId('cops-04'), G = gameOf(p.parameters);
  let a = freshAttempt(p);
  assert.match(view(p, a), /cp-tray cR/, 'R waits to be put down');
  assert.equal(move(p, a, {type: 'r', at: 'a'}), null, 'not on C');
  a = play(p, a, {type: 'r', at: 'c'});
  let e = escapeState(G, a.board.answers);
  assert.equal(e.status, 'reply');
  assert.equal(G.ids[e.c], 'b', 'C steps next to R');
  assert.equal(move(p, a, {type: 'r', at: 'b'}), null, 'R never steps onto C');
  a = play(p, a, {type: 'r', at: 'd'});
  e = escapeState(G, a.board.answers);
  assert.equal(e.jump, false, 'C goes on from where the pieces stand');
  assert.equal(G.ids[e.c], 'b', 'and stays');
  a = play(p, a, {type: 'r', at: 'd'});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /R gets away forever\./);
  // Next to C, R is caught at once; Undo takes the answer back.
  let b = play(p, freshAttempt(p), {type: 'r', at: 'b'});
  assert.equal(escapeState(G, b.board.answers).status, 'caught');
  assert.match(view(p, b), /C caught R\./);
  assert.equal(move(p, b, {type: 'r', at: 'c'}), null, 'nothing after a catch');
  b = undo(b);
  assert.equal(escapeState(G, b.board.answers).status, 'place');
});

test('the house: Can’t certified by escaping, with a jump back and new starts', () => {
  const p = byId('cops-08');
  let a = play(p, freshAttempt(p), {type: 'start', at: 'a'}, {type: 'cant'});
  const seen = new Set();
  for (let k = 0; k < 20 && !isSolved(p, a.board); k++) {
    const html = view(p, a);
    for (const line of ['C tries another move.', 'C tries another start.']) if (html.includes(line)) seen.add(line);
    a = move(p, a, nextHint(p, a).action);
  }
  assert.ok(isSolved(p, a.board));
  assert.deepEqual([...seen].sort(), ['C tries another move.', 'C tries another start.']);
  assert.equal(a.board.cant.length, 10, 'ten answers');
});

test('Can’t where C wins: the app’s C catches R, and Hint says so quietly', () => {
  const p = byId('cops-07');
  let a = play(p, freshAttempt(p), {type: 'cant'});
  const h = nextHint(p, a);
  assert.equal(h.type, 'deadend');
  assert.ok(h.quiet);
  const G = gameOf(p.parameters);
  for (let k = 0; k < 20; k++) {
    const e = escapeState(G, a.board.cant);
    if (e.status === 'caught') break;
    const options = e.status === 'place' ? G.ids.filter((_, i) => i !== e.c) : G.nb[e.r].filter(i => i !== e.c).map(i => G.ids[i]);
    a = play(p, a, {type: 'r', at: options.at(-1)});
  }
  assert.equal(escapeState(G, a.board.cant).status, 'caught');
  assert.equal(isSolved(p, a.board), false);
  assert.match(nextHint(p, a).text, /C can always catch R here/);
});

test('roads: two taps add a road, a tap takes it away, slots are a limit, Play and Roads switch', () => {
  const p = byId('cops-09'), q = p.parameters;
  let a = freshAttempt(p);
  assert.deepEqual(roadTap(q, a.board, null, 'a'), {pick: 'a'});
  assert.deepEqual(roadTap(q, a.board, 'a', 'a'), {pick: null});
  assert.deepEqual(roadTap(q, a.board, 'a', 'b'), {pick: 'b'}, 'a road already there');
  assert.deepEqual(roadTap(q, a.board, 'a', 'c'), {move: {type: 'add', road: ['a', 'c']}});
  assert.equal(move(p, a, {type: 'cant'}), null, 'Can’t waits for the new road');
  a = play(p, a, {type: 'add', road: ['c', 'a']});
  assert.deepEqual(a.board.added, [['a', 'c']]);
  assert.deepEqual(roadTap(q, a.board, 'b', 'd'), {full: true});
  assert.deepEqual(roadTap(q, a.board, 'c', 'a'), {move: {type: 'remove', road: ['a', 'c']}});
  assert.equal(move(p, a, {type: 'add', road: ['b', 'd']}), null, 'past the slots');
  a = play(p, a, {type: 'play'}, {type: 'start', at: 'b'});
  a = play(p, a, {type: 'edit'});
  assert.deepEqual(a.board, {added: [['a', 'c']], play: false, start: null, moves: [], cant: null}, 'Roads keeps the roads and clears the game');
  a = solveByHints(p, a);
  assert.ok(isSolved(p, a.board));
  // No Can't here: two of the nine roads work.
  assert.equal(move(p, play(p, freshAttempt(p), {type: 'add', road: ['e', 'f']}), {type: 'cant'}), null, 'no Can’t on the square with two tails');
  assert.deepEqual(goodSets(q).map(s => s[0].join('-')).sort(), ['a-c', 'b-d']);
  // With b–d, a corner with a tail is too far from the other tail.
  let b = play(p, freshAttempt(p), {type: 'add', road: ['b', 'd']}, {type: 'play'}, {type: 'start', at: 'a'});
  assert.equal(nextHint(p, b).type, 'deadend', 'from a, the far tail is three moves away');
  b = play(p, freshAttempt(p), {type: 'add', road: ['e', 'f']}, {type: 'play'}, {type: 'start', at: 'a'});
  assert.deepEqual(nextHint(p, b).action, {type: 'edit'}, 'joining the tails leaves R a ring: back to Roads');
});

test('two roads on the pentagon: one move, from the end the roads share', () => {
  const p = byId('cops-11');
  assert.equal(p.parameters.budget, 1);
  let a = play(p, freshAttempt(p), {type: 'add', road: ['a', 'c']}, {type: 'add', road: ['a', 'd']}, {type: 'play'}, {type: 'start', at: 'b'});
  assert.equal(nextHint(p, a).type, 'deadend', 'from b one move is not enough');
  a = play(p, freshAttempt(p), {type: 'add', road: ['a', 'c']}, {type: 'add', road: ['a', 'd']}, {type: 'play'}, {type: 'start', at: 'a'});
  a = solveByHints(p, a);
  assert.equal(a.board.moves.length, 1);
});

test('after Can’t, the line says the child now keeps R away', () => {
  const p = byId('cops-08');
  assert.equal(copsMechanics.cops.objective(p, freshAttempt(p).board), undefined);
  const a = play(p, freshAttempt(p), {type: 'cant'});
  assert.equal(copsMechanics.cops.objective(p, a.board), 'Keep R away from C forever.');
  assert.match(view(p, a), /<h1 class="puzzle-goal">Keep R away from C forever\.<\/h1>/);
  assert.match(view(p, freshAttempt(p)), /<h1 class="puzzle-goal">Catch R, or press Can’t if R can always get away\.<\/h1>/);
});

test('one road on the pentagon: Can’t on the child’s own road; two crossing roads still lose', () => {
  const p = byId('cops-10');
  let a = play(p, freshAttempt(p), {type: 'add', road: ['b', 'e']}, {type: 'play'}, {type: 'start', at: 'a'});
  assert.equal(nextHint(p, a).action.type, 'edit', 'Hint sends the child back to the roads');
  a = solveByHints(p, play(p, freshAttempt(p), {type: 'add', road: ['b', 'e']}));
  assert.ok(isSolved(p, a.board));
  assert.ok(a.board.cant.length > 0);
  const t = byId('cops-11');
  let c = play(t, freshAttempt(t), {type: 'add', road: ['a', 'c']}, {type: 'add', road: ['b', 'd']}, {type: 'play'});
  assert.equal(move(t, c, {type: 'cant'}), null, 'no Can’t here');
  assert.equal(nextHint(t, c).action.type, 'edit');
  c = solveByHints(t, c);
  assert.ok(isSolved(t, c.board));
});

test('folds: tap, tap; a refused fold names the dot missed; Can’t refused while a fold is left', () => {
  const p = byId('cops-fold-01'), q = p.parameters, m = copsMechanics.copsfold;
  let a = freshAttempt(p);
  assert.deepEqual(foldTap(q, a.board, null, 'e'), {pick: 'e'});
  assert.deepEqual(foldTap(q, a.board, 'e', 'c'), {told: {v: 'e', u: 'c', w: 'e'}}, 'c misses e itself');
  assert.deepEqual(foldTap(q, a.board, 'c', 'd'), {told: {v: 'c', u: 'd', w: 'a'}});
  assert.deepEqual(foldTap(q, a.board, 'e', 'd'), {move: {type: 'fold', v: 'e', u: 'd'}});
  m.reset(p);
  m.ui(p, {told: {v: 'e', u: 'c', w: 'e'}, pick: 'e', at: JSON.stringify(a.board)});
  assert.match(view(p, a, true), /c can’t reach e\./);
  a = play(p, a, {type: 'cant'});
  assert.match(view(p, a), /There is a fold\./);
  assert.equal(move(p, a, {type: 'cant'}), null, 'Can’t waits for a fold');
  a = play(p, a, {type: 'fold', v: 'e', u: 'd'});
  assert.equal(a.board.claim, null, 'a fold clears the refusal');
  const back = undoPress(p, a);
  assert.equal(back.board.claim, 'refused', 'Undo keeps the refusal on the same map');
  a = solveByHints(p, a);
  assert.equal(a.board.folds.length, 5);
  const f2 = byId('cops-fold-02');
  let b = play(f2, freshAttempt(f2), {type: 'fold', v: 'b', u: 'c'}, {type: 'cant'});
  assert.ok(isSolved(f2, b.board), 'the square has no fold');
  assert.match(view(f2, b), /No dot can fold\./);
});

test('two cops: plan each cop with a tap, Go moves both, a cop with no plan stays', () => {
  const p = byId('cops-two-01'), q = p.parameters, G = gameOf(q);
  let a = freshAttempt(p);
  const t = twoChase(G, q.start, []);
  assert.equal(G.ids[t.r], 'd', 'R starts opposite');
  let r = twoTap(G, t, 'C1', {C1: null, C2: null}, 'b');
  assert.deepEqual(r, {plan: {C1: 'b', C2: null}, chosen: 'C2'});
  r = twoTap(G, t, 'C2', r.plan, 'f');
  assert.deepEqual(r.plan, {C1: 'b', C2: 'f'});
  assert.equal(twoTap(G, t, 'C1', {C1: null, C2: null}, 'd'), null, 'too far for either cop');
  assert.equal(move(p, a, {type: 'go', c1: 'c', c2: 'a'}), null, 'one road at a time');
  a = play(p, a, {type: 'go', c1: 'b', c2: 'f'});
  assert.equal(isSolved(p, a.board), false);
  a = solveByHints(p, a);
  assert.ok(isSolved(p, a.board));
  assert.ok(a.board.moves.length <= q.budget);
  const html = view(p, freshAttempt(p));
  assert.match(html, /aria-label="Cop C1"/);
  assert.match(html, /cp-go/);
});

test('the playground: maps and sides, the app plays the other piece, never solved, no hint', () => {
  const p = byId('cops-playground'), m = copsMechanics.cops;
  let a = play(p, freshAttempt(p), {type: 'map', map: 'ring'}, {type: 'side', side: 'robber'});
  assert.deepEqual(a.board, {map: 'ring', side: 'robber', moves: []});
  a = play(p, a, {type: 'r', at: 'd'});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(nextHint(p, a).type, 'done');
  assert.ok(m.noHint(p));
  a = play(p, freshAttempt(p), {type: 'start', at: 'd'}, {type: 'move', to: 'c'});
  assert.equal(a.board.moves.length, 2);
  assert.doesNotMatch(view(p, a), /Out of moves/);
});

test('hints solve every puzzle from fresh and never open with Can’t', () => {
  for (const p of cops.puzzles.filter(x => x.band !== 'playground')) {
    const first = nextHint(p, freshAttempt(p));
    assert.equal(first.type, 'move', p.id);
    assert.notEqual(first.action.type, 'cant', `${p.id}: the first hint acts on the board`);
    assert.ok(isSolved(p, solveByHints(p, freshAttempt(p)).board), p.id);
  }
});

test('words for steps follow the drawing', () => {
  const q = byId('cops-01').parameters;
  assert.equal(stepWords(q, 'b', 'c'), 'one step right');
  assert.equal(stepWords(byId('cops-04').parameters, 'a', 'b'), 'one step down and right');
});

test('forged saves are rejected', () => {
  assert.equal(validBoard(byId('cops-01'), {start: 'c', moves: ['e'], cant: null}), false, 'a jump past a dot');
  assert.equal(validBoard(byId('cops-01'), {start: null, moves: [], cant: []}), false, 'Can’t where none is offered');
  assert.equal(validBoard(byId('cops-05'), {start: 'a', moves: [], cant: null}), false, 'the fixed start');
  assert.equal(validBoard(byId('cops-04'), {answers: ['c', 'b']}), false, 'R onto C');
  assert.equal(validBoard(byId('cops-04'), {answers: ['c', 'd', 'd', 'd']}), false, 'answers after the end');
  assert.equal(validBoard(byId('cops-09'), {added: [['a', 'b']], play: false, start: null, moves: [], cant: null}), false, 'a road already there');
  assert.equal(validBoard(byId('cops-09'), {added: [], play: false, start: null, moves: [], cant: []}), false, 'Can’t where none is offered');
  assert.equal(validBoard(byId('cops-fold-02'), {folds: [], claim: 'stuck'}), false, 'stuck with a fold left');
  assert.equal(validBoard(byId('cops-two-01'), {moves: [['c', 'a']]}), false, 'a cop two roads at once');
});

test('every puzzle renders its board with no puzzle name, and no button inside another', () => {
  for (const p of cops.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /cp-puzzle/, p.id);
    assert.match(html, /gb-board/, p.id);
    assert.ok(!html.includes(`>${p.title}<`), `${p.id}: no puzzle name on the play screen`);
    assert.doesNotMatch(html, /<button[^>]*>(?:(?!<\/button>).)*<button/s, `${p.id}: no nested buttons`);
  }
  const p = byId('cops-01'), a = play(p, freshAttempt(p), {type: 'start', at: 'c'});
  const html = view(p, a);
  assert.match(html, /data-gb-node="d"/, 'C’s neighbours can be tapped');
  assert.match(html, /aria-label="Dot c, C is here\. Keep C here"/, 'staying is a tap on C');
  assert.doesNotMatch(html, /data-gb-node="a"/, 'a far dot is not a control');
  assert.match(html, /cp-token cC mine/);
  const hinted = view(p, {...a, hintLevel: 2});
  assert.match(hinted, /gb-node[^"]*hinted/, 'the second Hint rings the dot');
});
