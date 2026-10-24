// Bridge Courier Islands: walks over every bridge once, every start judged as
// a whole, No walk and Fewest with the child's certificate, new bridges and
// their bends, delivery repeats, hints (CPU-timed), Undo's carry, the view
// state of a claim, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {bridgesOf, oddIslands, deadEnds, walkStarts, fewestNew, fewestRepeats, walkOf, claims} from '../dist/families/islands/islands.js';
import {graphOf, edgeGeometry} from '../dist/graph-board.js';
import {loadPack} from '../scripts/packs.mjs';

const book = JSON.parse(await readFile(new URL('../dist/families/islands/islands.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = n => book.puzzles.find(p => p.id === `islands-${String(n).padStart(2, '0')}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const B = (p, u, v, k = 0) => bridgesOf(p.parameters).map(([x, y], i) => [x, y, i]).filter(([x, y]) => (x === u && y === v) || (x === v && y === u))[k][2];
const cross = (p, ...pairs) => pairs.map(([u, v, k]) => ({type: 'bridge', bridge: B(p, u, v, k)}));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const undoCarry = (p, a) => { const back = undo(a); return {...back, board: mechanicFor(p).carry(p, a.board, back.board)}; };

test('the pack joins Bridge Courier as its Islands group', () => {
  assert.equal(book.puzzles.length, 11);
  for (const p of book.puzzles) {
    assert.equal(p.libraryFamily, 'route'); assert.equal(p.group, 'Islands'); assert.equal(p.mechanic, 'islands'); assert.equal(p.band, 'all');
    assert.ok(validBoard(p, freshAttempt(p).board), `${p.id}: a fresh board is valid`);
  }
  assert.ok(pack.puzzles.some(p => p.id === 'islands-09'), 'the pack loads with the app');
  assert.ok(pack.puzzles.some(p => p.id === 'route-01'), 'the base puzzles stay');
});

test('Euler: starts are both odd islands, every island, or none', () => {
  assert.deepEqual(walkStarts(byId(1).parameters), ['A', 'B']);
  assert.deepEqual(walkStarts(byId(2).parameters), ['B', 'C']);
  assert.deepEqual(walkStarts(byId(4).parameters), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(walkStarts(byId(5).parameters), []);
  assert.deepEqual(oddIslands(byId(9).parameters), ['A', 'B', 'C', 'D'], 'Königsberg: 5, 3, 3, 3');
  assert.equal(bridgesOf(byId(9).parameters).length, 7, 'seven bridges');
  assert.equal(fewestNew(byId(10).parameters), 2);
  assert.equal(fewestNew(byId(8).parameters), 1);
  assert.equal(fewestRepeats(byId(11).parameters), 3, 'the star needs 3 repeats, not 2');
  assert.deepEqual(deadEnds(byId(11).parameters), ['A', 'C', 'D']);
});

test('a walk crosses a bridge once, and a double bridge is two bridges', () => {
  const p = byId(2), a = play(p, freshAttempt(p), {type: 'island', island: 'A'}, ...cross(p, ['A', 'B', 0]));
  assert.equal(move(p, a, {type: 'bridge', bridge: B(p, 'A', 'B', 0)}), null, 'no counter, no crossing');
  const back = play(p, a, {type: 'island', island: 'A'});
  assert.equal(back.board.path.at(-1), B(p, 'A', 'B', 1), 'tapping the island across crosses the bridge with its counter');
  assert.equal(move(p, back, {type: 'island', island: 'C'}), null, 'no teleporting');
  assert.equal(walkOf(bridgesOf(p.parameters), 'A', [0, 1]).at, 'A');
});

// Put the token on `start` and cross the first bridge with a counter until
// the walk can go no further.
function stuck(p, a, start) {
  a = play(p, a, {type: 'island', island: start});
  for (let i = 0; i < 40; i++) {
    const b = a.board, all = bridgesOf(p.parameters, b.added), w = walkOf(all, b.start, b.path);
    const next = all.findIndex(([u, v], j) => !w.uses[j] && (u === w.at || v === w.at));
    if (next < 0) return a;
    a = play(p, a, {type: 'bridge', bridge: next});
  }
  throw new Error('a walk that never ends');
}

test('a walk counts as tried only once it ends', () => {
  const p = byId(9);
  let a = play(p, freshAttempt(p), {type: 'island', island: 'B'}, ...cross(p, ['B', 'A', 0], ['A', 'C', 0], ['C', 'D']));
  assert.equal(a.board.tried, 0, 'three crossings with counters left at the token: not yet');
  assert.equal(claims(p.parameters, a.board).noWalk, false, 'so No walk is still off');
  a = play(p, a, ...cross(p, ['D', 'A'], ['A', 'B', 1], ['B', 'D']));
  assert.equal(a.board.tried, 1, 'stuck at D: tried');
  assert.equal(claims(p.parameters, a.board).noWalk, true);
});

test('where can it start: Done judges the colored islands as a whole, once per walk', () => {
  const p = byId(2);
  assert.equal(move(p, play(p, freshAttempt(p), {type: 'color', island: 'B'}), {type: 'done'}), null, 'Done waits for a walk');
  let a = play(p, freshAttempt(p), {type: 'island', island: 'B'}, ...cross(p, ['B', 'A', 0], ['A', 'B', 1], ['B', 'C']));
  assert.deepEqual(a.board.colored, ['B'], 'a walk over every bridge colors its start');
  a = play(p, a, {type: 'done'});
  assert.equal(a.board.told, 'other'); assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /There is another\./);
  assert.doesNotMatch(view(p, a).replace(/<p class="sr-only"[^]*?<\/p>/, ''), /\d of \d|\d (starts|islands) (left|found)/, 'no count of starts');
  assert.equal(move(p, a, {type: 'done'}), null, 'Done waits for a new walk');
  const back = undoCarry(p, a);
  assert.equal(back.board.told, null, 'Undo takes the answer away');
  assert.equal(move(p, back, {type: 'done'}), null, 'and keeps Done locked');
  // Recoloring alone doesn't reopen Done: probing one island at a time costs a walk each.
  a = play(p, a, {type: 'again'}, {type: 'color', island: 'B'}, {type: 'color', island: 'A'});
  assert.equal(move(p, a, {type: 'done'}), null, 'new colors, no new walk: still locked');
  a = play(p, a, {type: 'island', island: 'A'}, ...cross(p, ['A', 'B', 0]));
  assert.equal(move(p, a, {type: 'done'}), null, 'a walk under way is not yet tried');
  a = play(p, a, ...cross(p, ['B', 'C']));
  assert.equal(a.board.tried, 2, 'stuck at C');
  a = play(p, a, {type: 'done'});
  assert.equal(a.board.told, 'notall');
  assert.match(view(p, a), /One of these can’t start a walk\./);
  a = play(p, a, {type: 'color', island: 'A'}, {type: 'color', island: 'B'}, {type: 'color', island: 'C'});
  assert.equal(move(p, a, {type: 'done'}), null);
  a = stuck(p, play(p, a, {type: 'again'}), 'C');
  a = play(p, a, {type: 'done'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.equal((html.match(/gb-node [^"]*\blit\b/g) || []).length, 2, 'the odd islands are lit');
  assert.match(html, /class="gb-badge"/, 'with their bridge counts');
});

test('No walk comes after a walk that ends and is certified by the child’s taps', () => {
  const p = byId(9), q = p.parameters, fresh = freshAttempt(p);
  assert.equal(claims(q, fresh.board).noWalk, false, 'not on a fresh board');
  assert.equal(move(p, fresh, {type: 'check', claim: 'none', picks: ['A', 'B', 'C', 'D']}), null);
  let a = stuck(p, fresh, 'B');
  assert.equal(claims(q, a.board).noWalk, true);
  for (const picks of [['A', 'B', 'D'], ['A', 'B', 'C', 'D', 'A'].slice(0, 2), ['B']]) {
    const told = move(p, a, {type: 'check', claim: 'none', picks});
    assert.equal(told.board.told, 'wrong', `${picks}: one answer for any wrong set`);
  }
  a = play(p, a, {type: 'check', claim: 'none', picks: ['A', 'B', 'D']});
  assert.match(view(p, a), /Not these islands\./);
  assert.equal(move(p, a, {type: 'check', claim: 'none', picks: ['A', 'B', 'C', 'D']}), null, 'locked until a new walk');
  a = play(p, a, {type: 'again'}, {type: 'island', island: 'D'}, ...cross(p, ['D', 'A']));
  assert.equal(move(p, a, {type: 'check', claim: 'none', picks: ['A', 'B', 'C', 'D']}), null, 'a walk under way does not reopen it');
  a = stuck(p, play(p, a, {type: 'again'}), 'D');
  a = play(p, a, {type: 'check', claim: 'none', picks: ['D', 'C', 'B', 'A']});
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.done, {claim: 'none', picks: ['A', 'B', 'C', 'D']});
  assert.match(view(p, a), /A walk has only two ends\./);
  // A wrong No walk where a walk exists: one short refusal, no walk played back.
  const w = byId(6);
  let b = stuck(w, freshAttempt(w), 'B');
  b = play(w, b, {type: 'check', claim: 'none', picks: ['D', 'F']});
  assert.equal(b.board.told, 'walk'); assert.match(view(w, b), /There is a walk\./);
  assert.ok(!/gb-node[^"]*lit/.test(view(w, b)), 'nothing lit');
});

test('add a bridge: tap two islands, then walk; the budget is one', () => {
  const p = byId(7);
  let a = play(p, freshAttempt(p), {type: 'add', u: 'C', v: 'A'});
  assert.equal(walkStarts(p.parameters, bridgesOf(p.parameters, a.board.added)).length, 0, 'a bridge to the middle leaves no walk');
  assert.equal(move(p, a, {type: 'add', u: 'A', v: 'B'}), null, 'one new bridge');
  assert.equal(nextHint(p, a).action.type, 'remove');
  a = play(p, a, {type: 'remove', bridge: 8});
  a = play(p, a, {type: 'add', u: 'A', v: 'E'});
  const all = bridgesOf(p.parameters, a.board.added);
  assert.notEqual(all[8][2], 0, 'a new bridge across the middle island bends around it');
  const g = graphOf({nodes: p.parameters.nodes, edges: all.map(([u, v, bend]) => [u, v, null, bend]), aspect: p.parameters.aspect});
  const {m} = edgeGeometry(g, g.edges[8]);
  assert.ok(Math.hypot(m[0] - g.pos.C[0], m[1] - g.pos.C[1]) > 8, 'clear of C');
  assert.deepEqual(walkStarts(p.parameters, all), ['B', 'D']);
  for (let i = 0; i < 20 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
});

test('fewest new bridges: a closed walk, then Fewest and the odd islands', () => {
  const p = byId(10);
  let a = play(p, freshAttempt(p), {type: 'add', u: 'A', v: 'B'}, {type: 'add', u: 'C', v: 'D'}, {type: 'add', u: 'A', v: 'B'}, {type: 'add', u: 'A', v: 'B'});
  const all = bridgesOf(p.parameters, a.board.added), ab = all.map(([u, v, bend], i) => [u, v, bend, i]).filter(([u, v]) => u === 'A' && v === 'B');
  assert.equal(new Set(ab.map(([, , bend]) => bend)).size, ab.length, 'every A–B bridge has its own bend');
  // A closed walk with four new bridges: Fewest is refused.
  const walk = [];
  const go = (at, used) => { if (used.size === all.length) return at === 'A'; for (let i = 0; i < all.length; i++) { if (used.has(i) || (all[i][0] !== at && all[i][1] !== at)) continue; walk.push(i); if (go(all[i][0] === at ? all[i][1] : all[i][0], new Set([...used, i]))) return true; walk.pop(); } return false; };
  assert.ok(go('A', new Set()));
  a = play(p, a, {type: 'island', island: 'A'}, ...walk.map(i => ({type: 'bridge', bridge: i})));
  assert.equal(claims(p.parameters, a.board).fewest, true);
  a = play(p, a, {type: 'check', claim: 'fewest', picks: ['A', 'B', 'C', 'D']});
  assert.equal(a.board.told, 'fewer'); assert.match(view(p, a), /Fewer new bridges can work\./);
  // The hints take the extra bridges away and walk again.
  for (let i = 0; i < 40 && !isSolved(p, a.board); i++) {
    const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
    assert.ok((u.user + u.system) / 1000 < 100, 'a quick hint (CPU time)');
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board));
  assert.equal(a.board.added.length, 2);
  assert.match(view(p, a), /A new bridge has only two ends\./);
});

test('the star delivery: 3 repeats, certified by the dead ends', () => {
  const p = byId(11);
  let a = play(p, freshAttempt(p), {type: 'island', island: 'A'}, ...cross(p, ['A', 'B'], ['B', 'C'], ['C', 'B'], ['B', 'D'], ['D', 'B'], ['B', 'A']));
  assert.equal(walkOf(bridgesOf(p.parameters), 'A', a.board.path).repeats, 3);
  assert.match(view(p, a), /×2/, 'each bridge shows it was crossed twice');
  a = play(p, a, {type: 'check', claim: 'fewest', picks: ['A', 'B', 'C', 'D']});
  assert.equal(a.board.told, 'wrong'); assert.match(view(p, a), /Not these islands\./);
  a = play(p, a, {type: 'again'}, {type: 'island', island: 'B'}, ...cross(p, ['B', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'B'], ['B', 'D'], ['D', 'B']));
  a = play(p, a, {type: 'check', claim: 'fewest', picks: ['C', 'A', 'D']});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /Each dead end’s bridge is crossed twice\./);
});

test('hints alone solve every puzzle, quickly, and never start with a claim', () => {
  for (const p of book.puzzles) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.notEqual(first.action.type, 'check', `${p.id}: never a claim first`);
    assert.notEqual(first.action.type, 'done', `${p.id}: never Done first`);
    for (; !isSolved(p, a.board) && steps < 80; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      if (h.action.type === 'check') assert.match(h.text, /^(Count|A, C|A and)/, `${p.id}: the reason before the claim`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
});

test('Undo always changes the board and never takes back a lock', () => {
  for (const p of book.puzzles) {
    let a = freshAttempt(p);
    for (let i = 0; i < 80 && !isSolved(p, a.board); i++) {
      const next = play(p, a, nextHint(p, a).action);
      if (isSolved(p, next.board)) break;
      const back = undoCarry(p, next);
      assert.notEqual(JSON.stringify(back.board), JSON.stringify(next.board), `${p.id}: Undo changes the board`);
      assert.ok(back.board.lock >= next.board.lock, `${p.id}: the lock stays`);
      a = next;
    }
  }
});

test('the claim view: taps are view state, cleared by any move', () => {
  const p = byId(9), m = mechanicFor(p);
  m.reset(p);
  let a = play(p, freshAttempt(p), {type: 'island', island: 'B'}, ...cross(p, ['B', 'D']));
  view(p, a);
  m.ui(p, {claim: 'none'});
  let html = view(p, a);
  assert.match(html, /Tap every island a walk would have to start or end on\./);
  assert.match(html, />Check</);
  assert.doesNotMatch(html, /gb-node[^"]*\bhinted\b/, 'nothing tinted for the certificate');
  a = play(p, a, {type: 'island', island: 'A'});
  html = view(p, a);
  assert.doesNotMatch(html, />Check</, 'a move ends the claim');
  m.ui(p, {tool: 'color'});
  assert.match(view(p, a), /aria-pressed="true"[^>]*>Color</);
  m.reset(p);
});

test('forged saves are refused', () => {
  const p = byId(5), a = stuck(p, freshAttempt(p), 'A');
  for (const board of [
    {...freshAttempt(p).board, done: {claim: 'none', picks: ['A', 'C', 'D', 'F']}},
    {...a.board, done: {claim: 'none', picks: ['A', 'C']}},
    {...a.board, done: {claim: 'starts'}},
    {...a.board, told: 'walk'},
    {...a.board, path: [0, 0]},
    {...a.board, colored: ['C', 'A']},
    {...a.board, added: [['A', 'B']]},
    {...a.board, tried: 0},
    {...a.board, lock: a.board.tried, done: {claim: 'none', picks: ['A', 'C', 'D', 'F']}},
    {...a.board, told: 'wrong'},
    {...a.board, extra: 1},
    {...a.board, shut: null}
  ]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  assert.equal(validBoard(p, {...a.board, told: 'wrong', lock: a.board.tried}), true, 'a refusal with its lock');
  assert.equal(validBoard(p, {...a.board, done: {claim: 'none', picks: ['A', 'C', 'D', 'F']}}), true);
});

test('every puzzle renders a compact map with its controls', () => {
  for (const p of book.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="islands"/);
    assert.match(html, /class="gb-board [^"]*isl-map/);
    assert.equal((html.match(/class="isl-counter"/g) || []).length, bridgesOf(p.parameters).length, `${p.id}: a counter on every bridge`);
    if (bridgesOf(p.parameters).some(([, , bend]) => bend)) assert.match(html, /<path class="gb-line" d="M[^"]+ Q/, `${p.id}: double bridges curve`);
    const mode = p.parameters.mode;
    if (mode === 'starts') { assert.match(html, />No walk</); assert.match(html, />Done</); }
    if (mode === 'fewest' || mode === 'deliver') assert.match(html, />Fewest</);
    if (mode === 'add') assert.doesNotMatch(html, />Fewest<|>No walk</);
    if (mode !== 'add') assert.match(html, /disabled data-toggle="isl-claim" aria-pressed="false">(No walk|Fewest)</, `${p.id}: no claim on a fresh board`);
  }
});

test('Bridge Courier tells a doomed route only behind Hint', () => {
  const p = pack.puzzles.find(q => q.id === 'route-07');
  const a = move(p, freshAttempt(p), {vertex: 'A'});
  assert.ok(a, 'a doomed start is a legal move');
  assert.equal(nextHint(p, a).type, 'deadend');
  const quiet = view(p, a);
  assert.doesNotMatch(quiet, /cannot finish/, 'nothing said unasked');
  assert.match(quiet, /<div class="feedback " role="status"/);
  assert.match(view(p, {...a, hintLevel: 1}), /This route cannot finish within the rules/, 'Hint tells it');
  assert.match(view(p, {...a, hintLevel: 2}), /data-action="rescue"/, 'and offers the Undo rescue');
});

test('every puzzle renders its solved board', () => {
  for (const p of book.puzzles) {
    const a = play(p, freshAttempt(p), ...p.solution.moves);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    const html = view(p, a);
    assert.match(html, /isl-map[^"]* solved/, `${p.id}: solved map`);
    assert.match(html, /completion-heading/, `${p.id}: completion`);
  }
});

test('a hint never says a whole walk can’t pick up every counter', () => {
  const p = byId(1);
  let a = play(p, freshAttempt(p), {type: 'island', island: 'A'}, {type: 'bridge', bridge: 2}, {type: 'bridge', bridge: 0}, {type: 'bridge', bridge: 1});
  assert.deepEqual(a.board.colored, ['A'], 'the whole walk colors its start');
  a = play(p, a, {type: 'color', island: 'A'});
  const text = nextHint(p, a)?.text ?? '';
  assert.doesNotMatch(text, /can’t pick up every counter/, text);
});
