// Ways out: pieces and ends on each map, the box certificate, the tree's
// 2m + 1, the disk's geometry, blocking and the budget, Check and Can't, hints,
// arrow keys, panning and the home button, the playground, rendering, saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {playView} from '../dist/ui.js';
import {endsMechanics, counts, endsOf, impossible, piecesOf, boxOf, outsidePieces, treeIsDot, treeNeighbours, treeDistance, isDot, sortDots, IDENTITY, STEP, compose, image, toward, settle, diskLayout, EDGE, arrowTarget, startView, startDot, nearestSolution, shiftOf} from '../dist/families/ends/ends.js';
import {validateEnds} from '../scripts/validate-ends.mjs';
import {loadPack} from '../scripts/packs.mjs';

const ends = JSON.parse(await readFile(new URL('../dist/families/ends/ends.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => ends.puzzles.find(p => p.id === id);
const maps = byId('ends-playground').parameters.maps;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const block = (...dots) => dots.map(dot => ({type: 'block', dot}));
const mech = endsMechanics.ends;
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const near = (u, v, eps = 1e-9) => Math.abs(u - v) < eps;

test('the pack validates: counts match a separate union-find, hints solve, illegal moves and forged saves fail', async () => {
  const report = await validateEnds();
  assert.equal(report.endsPuzzles, 12);
  assert.ok(report.placementsChecked > 300000);
  assert.ok(report.hintSteps > 500);
});

test('pieces: tails go on forever, gaps between blocks are trapped', () => {
  assert.deepEqual(counts(maps.line, []), {forever: 1, trapped: 0});
  assert.deepEqual(counts(maps.line, ['0,0']), {forever: 2, trapped: 0});
  assert.deepEqual(counts(maps.line, ['-2,0', '0,0', '2,0']), {forever: 2, trapped: 2});
  assert.deepEqual(counts(maps.line, ['0,0', '1,0']), {forever: 2, trapped: 0}, 'two side by side trap nothing');
  assert.deepEqual(counts(maps.ladder, ['0,0']), {forever: 1, trapped: 0}, 'the other rail goes round');
  assert.deepEqual(counts(maps.ladder, ['0,0', '1,1']), {forever: 2, trapped: 0}, 'a slanting pair splits it');
  assert.deepEqual(counts(maps.ladder, ['0,0', '2,0']), {forever: 1, trapped: 0}, 'one rail is not enough');
  assert.deepEqual(counts(maps.ladder, ['-1,0', '1,0', '0,1']), {forever: 2, trapped: 1});
  assert.deepEqual(counts(maps.strip, ['0,0', '1,1', '1,2']), {forever: 2, trapped: 0}, 'a stepped wall');
  assert.deepEqual(counts(maps.strip, ['0,0', '2,1', '2,2']), {forever: 1, trapped: 0}, 'a step of two lets pieces through');
  assert.deepEqual(counts(maps.grid, ['0,-1', '-1,0', '1,0', '0,1']), {forever: 1, trapped: 1});
  assert.deepEqual(counts(maps.grid, Array.from({length: 15}, (_, i) => `${i - 7},0`)), {forever: 1, trapped: 0}, 'a long wall: round its ends');
  assert.deepEqual(counts(maps.tee, ['0,1', '1,1', '0,0']), {forever: 3, trapped: 0});
  assert.deepEqual(counts(maps.tee, ['0,3', '1,3']), {forever: 2, trapped: 0}, 'cutting the stem off');
  // The pieces of a drawn window: every drawn dot is in one, and a piece far
  // out on a tail is the same piece as the tail by the blocks.
  const {pieces, pieceOf} = piecesOf(maps.line, ['0,0'], {x: [-20, 20], y: [0, 0]});
  assert.equal(pieces.length, 2);
  assert.equal(pieceOf.get('-20,0'), pieceOf.get('-1,0'));
  assert.notEqual(pieceOf.get('20,0'), pieceOf.get('-20,0'));
  assert.ok(!pieceOf.has('0,0'));
});

test('ends, and the box certificate for a Can’t', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(maps).map(([k, m]) => [k, endsOf(m)])), {line: 2, ladder: 2, strip: 2, grid: 1, tee: 3, tree: Infinity});
  const box = boxOf(maps.ladder, ['3,0', '-2,1']);
  assert.deepEqual(box, {x: [-2, 3], y: [0, 1]}, 'all the rows of the ladder');
  assert.equal(outsidePieces(maps.ladder, box).pieces.length, 2, 'two tails');
  assert.deepEqual(boxOf(maps.tee, ['5,0']), {x: [0, 5], y: [0, 2]}, 'the T’s box holds the junction');
  assert.equal(outsidePieces(maps.tee, boxOf(maps.tee, ['5,0'])).pieces.length, 3);
  assert.equal(outsidePieces(maps.grid, boxOf(maps.grid, ['-3,2', '4,-1'])).pieces.length, 1, 'the ring road');
  assert.equal(impossible(byId('ends-04').parameters), true);
  assert.equal(impossible(byId('ends-10').parameters), true);
  assert.equal(impossible(byId('ends-05').parameters), false);
  assert.equal(impossible({...byId('ends-05').parameters, goal: {forever: 9}}), true, 'nine needs four blocks');
});

test('the tree: words for dots, three roads each, 2m + 1', () => {
  assert.ok(treeIsDot('o') && treeIsDot('abcb') && !treeIsDot('abb') && !treeIsDot('') && !treeIsDot('ad'));
  assert.deepEqual(treeNeighbours('o'), ['a', 'b', 'c']);
  assert.deepEqual(treeNeighbours('ab'), ['aba', 'a', 'abc']);
  assert.equal(treeDistance('ab', 'ac'), 2);
  assert.equal(treeDistance('abc', 'b'), 4);
  assert.deepEqual(sortDots(maps.tree, ['ab', 'c', 'o', 'a']), ['o', 'a', 'c', 'ab']);
  assert.deepEqual(counts(maps.tree, ['o']), {forever: 3, trapped: 0});
  assert.deepEqual(counts(maps.tree, ['o', 'ab', 'ba']), {forever: 7, trapped: 0});
  assert.deepEqual(counts(maps.tree, ['a', 'b', 'c']), {forever: 6, trapped: 1}, 'the centre is trapped');
  assert.deepEqual(counts(maps.tree, ['o', 'a']), {forever: 4, trapped: 0}, 'touching blocks gain less');
  assert.deepEqual(counts(maps.tree, ['o', 'ab', 'ba', 'ca']), {forever: 9, trapped: 0});
});

test('the disk: roads of length ln 3 at 120°, a step and back is no move, settling picks the nearest dot', () => {
  const out = ['a', 'b', 'c'].map(x => image(STEP[x], [0, 0]));
  for (const z of out) assert.ok(near(Math.hypot(...z), Math.tanh(EDGE / 2)), 'one road from the middle is at |z| = tanh(ln 3 / 2) = 1/2');
  for (let i = 0; i < 3; i++) {
    const [u, v] = [out[i], out[(i + 1) % 3]];
    assert.ok(near(Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))), 2 * Math.PI / 3), '120° apart');
  }
  for (const x of 'abc') {
    const back = compose(STEP[x], STEP[x]);
    assert.ok(near(Math.abs(back.a[0]), 1) && near(back.a[1], 0) && near(Math.hypot(...back.b), 0), `${x} then ${x} is the identity`);
  }
  // A dot two roads out sits where two steps put it.
  const {dots} = diskLayout({focus: 'o', frame: IDENTITY});
  const z = image(compose(STEP.a, STEP.b), [0, 0]);
  assert.ok(near(dots.get('ab').z[0], z[0]) && near(dots.get('ab').z[1], z[1]));
  assert.ok(dots.size > 40, 'many dots drawn');
  // Pan so that dot a is in the middle: the view settles on a.
  const toA = compose(toward([-out[0][0], -out[0][1]]), IDENTITY);
  const s = settle({focus: 'o', frame: toA});
  assert.equal(s.focus, 'a');
  assert.ok(Math.hypot(...image(s.frame, [0, 0])) < 1e-9);
});

test('blocking: toggles, keeps reading order, refuses past the budget, and any change clears Check', () => {
  const p = byId('ends-01');
  let a = play(p, freshAttempt(p), ...block('2,0', '-2,0', '0,0'));
  assert.deepEqual(a.board.blocks, ['-2,0', '0,0', '2,0']);
  a = play(p, a, {type: 'check'});
  assert.equal(a.board.shown, 'pieces');
  assert.equal(move(p, a, {type: 'check'}), null, 'Check waits for a change');
  assert.ok(isSolved(p, a.board));
  const q = byId('ends-02');
  let b = play(q, freshAttempt(q), ...block('0,0', '3,0'), {type: 'check'});
  assert.ok(!isSolved(q, b.board));
  assert.equal(move(q, b, {type: 'block', dot: '0,1'}), null, 'the budget');
  b = play(q, b, {type: 'unblock', dot: '3,0'});
  assert.equal(b.board.shown, null, 'a change clears the pieces');
  b = play(q, b, {type: 'block', dot: '0,1'}, {type: 'check'});
  assert.ok(isSolved(q, b.board));
  assert.deepEqual(undo(b).board, {blocks: ['0,0', '0,1'], shown: null}, 'Undo takes back the Check');
  assert.equal(move(q, freshAttempt(q), {type: 'block', dot: '0,2'}), null, 'off the ladder');
});

test('Can’t: right on the line, ladder and grid, wrong elsewhere; a wrong one waits for a change', () => {
  for (const id of ['ends-04', 'ends-06', 'ends-10']) {
    const p = byId(id), a = play(p, freshAttempt(p), {type: 'cant'});
    assert.equal(a.board.shown, 'cant');
    assert.ok(isSolved(p, a.board), id);
  }
  const p = byId('ends-07');
  let a = play(p, freshAttempt(p), {type: 'cant'});
  assert.equal(a.board.shown, 'can');
  assert.equal(move(p, a, {type: 'cant'}), null);
  a = play(p, a, {type: 'block', dot: '0,0'});
  assert.equal(a.board.shown, null);
  assert.equal(play(p, a, {type: 'cant'}).board.shown, 'can', 'asked again after a change');
});

test('hints: the start, then where to go from a block, take off a wrong block, Can’t when it can’t', () => {
  const first = id => nextHint(byId(id), freshAttempt(byId(id)));
  assert.deepEqual(first('ends-02').action, {type: 'block', dot: '0,0'});
  assert.equal(first('ends-08').action.dot, '0,1', 'the T starts at the junction');
  assert.deepEqual(first('ends-05'), {type: 'move', action: {type: 'block', dot: 'o'}, text: 'Block the centre dot.'});
  assert.deepEqual(first('ends-10'), {type: 'move', action: {type: 'cant'}, text: 'Press Can’t.'});
  const p = byId('ends-02');
  let a = play(p, freshAttempt(p), ...block('0,0'));
  assert.deepEqual(nextHint(p, a), {type: 'move', action: {type: 'block', dot: '0,1'}, text: 'Block the dot one step down from a block.'});
  a = play(p, freshAttempt(p), ...block('0,0', '2,0'));
  assert.equal(nextHint(p, a).action.type, 'unblock');
  // Moved along the ladder, the nearest answer moves with the blocks.
  assert.deepEqual(nearestSolution(p.parameters, ['7,1']), ['7,0', '7,1']);
  assert.equal(shiftOf(maps.ladder), 'x');
  assert.equal(shiftOf(maps.grid), 'xy');
  assert.equal(shiftOf(maps.tee), null);
  const t = byId('ends-05');
  let b = play(t, freshAttempt(t), ...block('a', 'b', 'c'), {type: 'check'});
  assert.equal(nextHint(t, b).text, 'A piece is trapped. Take off a block next to it.');
  b = play(t, freshAttempt(t), ...block('o', 'a'));
  assert.equal(nextHint(t, b).text, 'Two blocks touch. Take one off.');
  for (const q of ends.puzzles.filter(x => x.band !== 'playground')) {
    let c = freshAttempt(q), n = 0;
    while (!isSolved(q, c.board) && n++ < 40) { const h = nextHint(q, c); assert.equal(h.type, 'move', `${q.id}: ${h.text}`); c = play(q, c, h.action); }
    assert.ok(isSolved(q, c.board), `${q.id}: hints alone solve it`);
  }
});

test('arrow keys walk along roads; the start dot and view', () => {
  assert.equal(arrowTarget(maps.ladder, startView(maps.ladder), '0,0', 'ArrowDown'), '0,1');
  assert.equal(arrowTarget(maps.ladder, startView(maps.ladder), '0,1', 'ArrowDown'), null, 'no road');
  assert.equal(arrowTarget(maps.line, startView(maps.line), '0,0', 'ArrowLeft'), '-1,0');
  assert.equal(arrowTarget(maps.grid, startView(maps.grid), '0,0', 'Tab'), null);
  const v = startView(maps.tree);
  assert.equal(arrowTarget(maps.tree, v, 'o', 'ArrowUp'), 'a', 'road a points up');
  assert.equal(arrowTarget(maps.tree, v, 'o', 'ArrowRight'), 'b');
  assert.equal(arrowTarget(maps.tree, v, 'o', 'ArrowLeft'), 'c');
  assert.equal(startDot(maps.strip), '0,1');
  assert.equal(startDot(maps.tree), 'o');
  assert.ok(isDot(maps.tee, '1,9') && !isDot(maps.tee, '2,9') && !isDot(maps.grid, '-0,0'));
});

test('rendering: the board, slots, Check and Can’t; the pieces after Check; the box after a right Can’t', () => {
  for (const p of ends.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /ends-puzzle/, p.id);
    assert.match(html, /data-ends-board/, p.id);
    assert.match(html, /data-focus="ends-check"/, p.id);
    assert.equal(/data-focus="ends-cant"/.test(html), p.band !== 'playground', `${p.id}: Can’t only in puzzles`);
    assert.equal(/ends-maps/.test(html), p.band === 'playground', `${p.id}: map picker only in the playground`);
    assert.doesNotMatch(html, /ends-home/, `${p.id}: no home button at the start`);
    assert.ok(p.visibleObjective.length < 40, `${p.id}: one short objective`);
  }
  const p = byId('ends-01');
  let html = view(p, freshAttempt(p));
  assert.equal((html.match(/<i class="ends-used">/g) || []).length, 0);
  assert.equal((html.match(/<i class="">/g) || []).length, 4, 'four slots');
  assert.match(html, /data-dot="0,0"[^>]*role="button" tabindex="0"[^>]*aria-label="Start dot"/, 'the keyboard starts on the start dot');
  const a = play(p, freshAttempt(p), ...block('0,0', '1,0'), {type: 'check'});
  html = view(p, a);
  assert.match(html, /<p class="ends-told">2 forever pieces\.<\/p>/);
  assert.match(html, /ends-dot ends-on ends-c0/);
  assert.match(html, /ends-dot ends-on ends-c1/, 'the two tails take different colours');
  assert.equal((html.match(/<i class="ends-used">/g) || []).length, 2);
  // A right Can't on the grid: the box, the ring road, one piece outside.
  const g = byId('ends-10');
  html = view(g, play(g, freshAttempt(g), ...block('0,0', '1,0', '2,0'), {type: 'cant'}));
  assert.match(html, /class="ends-box"/);
  assert.match(html, /class="ends-ring"/);
  assert.match(html, /Outside the box: 1 piece\./);
  assert.doesNotMatch(html, /ends-bar/, 'solved: no buttons');
  // On the ladder there is no ring road, and two pieces outside.
  const l = byId('ends-06');
  html = view(l, play(l, freshAttempt(l), {type: 'cant'}));
  assert.match(html, /class="ends-box"/);
  assert.doesNotMatch(html, /class="ends-ring"/);
  assert.match(html, /Outside the box: 2 pieces\./);
  // A wrong Can't.
  const w = byId('ends-03');
  assert.match(view(w, play(w, freshAttempt(w), {type: 'cant'})), /It can be done\./);
  // The tree, with a trapped centre.
  const t = byId('ends-05');
  html = view(t, play(t, freshAttempt(t), ...block('a', 'b', 'c'), {type: 'check'}));
  assert.match(html, /ends-stage disk/);
  assert.match(html, /6 forever pieces, 1 trapped\./);
  assert.match(html, /class="ends-dot trap[^"]*" data-dot="o"/, 'the centre is trapped');
  // A marked dot at the second hint level.
  const h = view(byId('ends-02'), {...freshAttempt(byId('ends-02')), hintLevel: 2});
  assert.match(h, /class="ends-dot hinted[^"]*" data-dot="0,0"/);
});

test('panning is view state: the board moves, the home button appears and goes back', () => {
  const p = byId('ends-01'), a = freshAttempt(p);
  view(p, a);
  mech.ui(p, {view: {cx: 30, cy: -0.4}});
  let html = view(p, a, true);
  assert.match(html, /viewBox="25.5 /, 'the window moved right');
  assert.match(html, /data-dot="30,0"[^>]*tabindex="0"/, 'the keyboard dot follows into view');
  assert.match(html, /class="ends-home"/);
  mech.ui(p, {view: {cx: 'far'}});
  assert.match(view(p, a, true), /viewBox="25.5 /, 'a bad view is ignored');
  mech.ui(p, {home: true});
  html = view(p, a, true);
  assert.doesNotMatch(html, /class="ends-home"/);
  assert.match(html, /viewBox="-4.5 /);
  const t = byId('ends-05');
  view(t, freshAttempt(t));
  mech.ui(t, {view: {focus: 'abc', frame: IDENTITY}});
  assert.match(view(t, freshAttempt(t), true), /class="ends-home"/);
  mech.ui(t, {view: {focus: 'abb', frame: IDENTITY}});
  assert.match(view(t, freshAttempt(t), true), /data-dot="abc"[^>]*tabindex/, 'a view on a dot that is not on the tree is ignored');
});

test('the playground: six maps, forty blocks, Check, never solved, no Can’t', () => {
  const p = byId('ends-playground');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {map: 'line', blocks: [], shown: null});
  assert.equal(mech.noHint(p), true);
  a = play(p, a, {type: 'map', map: 'tree'}, ...block('o', 'ab'), {type: 'check'});
  assert.equal(a.board.shown, 'pieces');
  assert.ok(!isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'cant'}), null);
  const html = view(p, a);
  assert.match(html, /5 forever pieces\./);
  assert.match(html, /aria-pressed="true" aria-label="Tree"/);
  a = play(p, a, {type: 'map', map: 'grid'});
  assert.deepEqual(a.board, {map: 'grid', blocks: [], shown: null});
  for (let k = 0; k < 40; k++) a = play(p, a, {type: 'block', dot: `${k % 8},${Math.floor(k / 8)}`});
  assert.equal(move(p, a, {type: 'block', dot: '9,9'}), null, 'forty at most');
  assert.equal(nextHint(p, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const {puzzles} = pack;
  const p = byId('ends-02'), a = play(p, freshAttempt(p), ...block('0,0', '1,1'), {type: 'check'});
  const t = byId('ends-12'), half = play(t, freshAttempt(t), ...block('o', 'ab'));
  const n = byId('ends-10'), cant = play(n, freshAttempt(n), {type: 'cant'});
  const pg = byId('ends-playground'), toy = play(pg, freshAttempt(pg), {type: 'map', map: 'tee'}, ...block('0,1'));
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, [t.id]: half, [n.id]: cant, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[p.id, a], [t.id, half], [n.id, cant], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board, 'a solved puzzle opens fresh');
  const forged = board => ({...store, profiles: [profile({[p.id]: {...a, board}})]});
  assert.throws(() => validateStore(forged({blocks: ['0,0', '1,1'], shown: 'cant'}), puzzles), 'Can’t on a ladder that splits');
  assert.throws(() => validateStore(forged({blocks: ['0,0', '0,1', '1,0'], shown: null}), puzzles), 'past the budget');
  assert.throws(() => validateStore(forged({blocks: ['1,1', '0,0'], shown: null}), puzzles), 'out of order');
  assert.throws(() => validateStore(forged({blocks: ['0,2'], shown: null}), puzzles), 'off the ladder');
  assert.equal(validBoard(n, {blocks: [], shown: 'can'}), false, '“it can be done” on the grid');
  assert.equal(validBoard(pg, {map: 'tee', blocks: [], shown: 'cant'}), false);
});
