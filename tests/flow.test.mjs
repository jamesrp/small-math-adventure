// Routes and roadblocks: drawing routes, roadblocks, the two-sided solve, the
// hints, the roadblock game, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {allRoutes, bestCount, blockingSets, leak, winsToMove, goodMove} from '../dist/families/flow/flow.js';
import {loadPack} from '../scripts/packs.mjs';

const flow = JSON.parse(await readFile(new URL('../dist/families/flow/flow.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => flow.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const step = node => ({type: 'step', node});
const diamond = byId('flow-01'), shortcut = byId('flow-02'), funnel = byId('flow-03');
const arc = (p, u, v) => p.parameters.arcs.findIndex(([a, b]) => a === u && b === v);

test('routes, best counts and blocking sets on the small maps', () => {
  assert.equal(allRoutes(diamond.parameters).length, 2);
  assert.equal(bestCount(diamond.parameters), 2);
  assert.equal(blockingSets(diamond.parameters, 2).length, 4);
  assert.equal(blockingSets(diamond.parameters, 1).length, 0);
  assert.equal(bestCount(shortcut.parameters), 2);
  assert.deepEqual(blockingSets(funnel.parameters, 1).map(set => set.map(i => funnel.parameters.arcs[i].join(''))), [['CD'], ['Dt']]);
  assert.deepEqual(leak(diamond.parameters, []), ['s', 'A', 't']);
  assert.equal(leak(diamond.parameters, [arc(diamond, 's', 'A'), arc(diamond, 'B', 't')]), null);
});

test('a route follows arrows, never revisits a dot and never reuses an arrow', () => {
  const p = shortcut;
  let a = play(p, freshAttempt(p), step('A'));
  assert.deepEqual(a.board.routes, [['s', 'A']], 'tapping a dot next to start begins a route');
  assert.equal(move(p, a, step('s')).board.routes.length, 1, 'start drops the unfinished route and begins again');
  assert.equal(move(p, a, step('A')), null, 'no step to the dot already reached');
  a = play(p, a, step('B'), step('t'));
  assert.deepEqual(a.board.routes, [['s', 'A', 'B', 't']]);
  // The shortcut route used sA and Bt: no second route can start along sA or finish along Bt.
  assert.equal(move(p, a, step('A')), null, 'sA is taken');
  const b = play(p, a, step('B'));
  assert.equal(move(p, b, step('t')), null, 'Bt is taken');
  assert.equal(move(p, b, step('A')), null, 'no arrow from B to A');
});

test('roadblocks and routes are separate; matching counts with no way through solve it', () => {
  const p = diamond;
  let a = play(p, freshAttempt(p), step('A'), step('t'), step('B'), step('t'));
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, {type: 'close', arc: arc(p, 's', 'A')});
  assert.equal(isSolved(p, a.board), false, 'one roadblock leaves a way through');
  assert.equal(move(p, a, {type: 'close', arc: arc(p, 's', 'A')}), null, 'no roadblock twice');
  a = play(p, a, {type: 'close', arc: arc(p, 'B', 't')});
  assert.equal(isSolved(p, a.board), true, 'two routes, two roadblocks, no way through');
  assert.equal(move(p, a, {type: 'open', arc: 0}), null, 'nothing moves after a solve');
});

test('more roadblocks than routes do not solve, even when they stop everything', () => {
  const p = shortcut;
  let a = play(p, freshAttempt(p), step('A'), step('B'), step('t'));
  a = play(p, a, {type: 'close', arc: arc(p, 's', 'A')}, {type: 'close', arc: arc(p, 's', 'B')});
  assert.equal(leak(p.parameters, a.board.closed), null);
  assert.equal(isSolved(p, a.board), false, 'one route against two roadblocks');
  a = play(p, a, {type: 'erase', route: 0}, step('A'), step('t'), step('B'), step('t'));
  assert.equal(isSolved(p, a.board), true);
});

test('hints keep good routes, clear a trap route and then place the roadblocks', () => {
  const p = shortcut;
  const trapped = play(p, freshAttempt(p), step('A'), step('B'), step('t'));
  const hint = nextHint(p, trapped);
  assert.deepEqual(hint.action, {type: 'erase', route: 0});
  let a = trapped;
  for (let i = 0; i < 30 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  // From two good routes and one stray roadblock, hints open the stray one first.
  let b = play(p, freshAttempt(p), step('A'), step('t'), step('B'), step('t'), {type: 'close', arc: arc(p, 'A', 'B')});
  assert.deepEqual(nextHint(p, b).action, {type: 'open', arc: arc(p, 'A', 'B')});
});

test('Undo takes back one step; Restart-style fresh boards are valid', () => {
  const p = diamond;
  const a = play(p, freshAttempt(p), step('A'), step('t'));
  assert.deepEqual(undo(a).board.routes, [['s', 'A']]);
  for (const q of flow.puzzles) assert.ok(validBoard(q, freshAttempt(q).board), `${q.id}: fresh board is valid`);
});

test('forged saves are rejected', () => {
  const p = diamond;
  assert.equal(validBoard(p, {routes: [['s', 'A', 't'], ['s', 'A']], closed: []}), false, 'two routes on sA');
  assert.equal(validBoard(p, {routes: [['s', 'B'], ['s', 'A', 't']], closed: []}), false, 'an unfinished route before a finished one');
  assert.equal(validBoard(p, {routes: [['s', 't']], closed: []}), false, 'no arrow from start to finish');
  assert.equal(validBoard(p, {routes: [], closed: [9]}), false, 'no such arrow');
  assert.equal(validBoard(p, {routes: [], closed: []}), true);
});

test('the roadblock game: the app plays its best and the right choice wins', () => {
  const two = byId('flow-08'), short = byId('flow-12');
  assert.equal(winsToMove(two.parameters, []), false, 'on two roads the first player loses');
  assert.equal(winsToMove(short.parameters, []), true);
  assert.equal(goodMove(short.parameters, []), arc(short, 'A', 'B'), 'the only winning opening closes the shortcut');
  let a = play(short, freshAttempt(short), {type: 'order', order: 'first'}, {type: 'close', arc: arc(short, 'A', 'B')});
  assert.equal(a.board.closed.length, 2, 'the other side answers at once');
  a = play(short, a, nextHint(short, a).action);
  assert.ok(isSolved(short, a.board), 'closing the other road wins');
  // A wrong opening loses, and the hint is Again.
  let b = play(short, freshAttempt(short), {type: 'order', order: 'first'}, {type: 'close', arc: arc(short, 's', 'A')});
  assert.equal(isSolved(short, b.board), false);
  assert.equal(leak(short.parameters, b.board.closed), null, 'the other side stopped the last way through');
  assert.deepEqual(nextHint(short, b).action, {type: 'again'});
  b = play(short, b, {type: 'again'});
  assert.deepEqual(b.board, {order: null, closed: []});
  // Going second on two roads.
  let c = play(two, freshAttempt(two), {type: 'order', order: 'second'});
  assert.equal(c.board.closed.length, 1);
  c = play(two, c, nextHint(two, c).action);
  assert.ok(isSolved(two, c.board));
});

test('every puzzle renders its board and controls', () => {
  for (const p of flow.puzzles) {
    const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
    assert.match(html, /data-gb-board/, `${p.id}: the map`);
    assert.match(html, /data-mechanic-wire="flow"/, `${p.id}: wired`);
    if (p.parameters.mode === 'pack') assert.match(html, /Roadblocks/, `${p.id}: the two tools`);
    else assert.match(html, /I go first/, `${p.id}: who goes first`);
  }
  const p = shortcut, m = mechanicFor(p);
  m.ui(p, {tool: 'block'});
  const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
  assert.match(html, /flow-leak/, 'the roadblock tool shows a way through');
  m.reset(p);
  // A roadblock hint while the Routes tool is on marks the Roadblocks button.
  let a = play(p, freshAttempt(p), step('A'), step('t'), step('B'), step('t'));
  a = {...a, hintLevel: 2};
  assert.match(playView(p, a, {pack, selected: null, message: ''}), /class="secondary flow-tool hinted"[^>]*data-focus="flow-tool-block"/);
  m.ui(p, {tool: 'block'});
  assert.doesNotMatch(playView(p, a, {pack, selected: null, message: ''}), /flow-tool hinted/, 'no mark once that tool is on');
  m.reset(p);
});
