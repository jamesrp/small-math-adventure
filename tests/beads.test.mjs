import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {mechanicFor} from '../dist/expansion.js';
import {answers, fits, fewestOf, paintToward} from '../dist/families/beads/beads.js';
import {validateBeads} from '../scripts/validate-beads.mjs';
import {loadPack} from '../scripts/packs.mjs';

const beads = JSON.parse(await readFile(new URL('../dist/families/beads/beads.json', import.meta.url), 'utf8'));
// The app merges the packs at load time (dist/main.js).
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const paint = (p, a, word) => play(p, a, [...word].map((colour, bead) => ({bead, colour})).filter(({bead, colour}) => a.board.ring[bead] !== colour).map(x => ({type: 'paint', ...x})));
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

test('the pack validates: answers match an independent model, hints solve, claims are checked', async () => {
  const report = await validateBeads();
  assert.equal(report.necklacePuzzles, 12);
  assert.equal(report.hiddenTurns, 7);
});

test('a tap goes round the puzzle’s colours; a hint can set one', () => {
  const p = byId('beads-09');
  let a = freshAttempt(p);
  assert.equal(a.board.ring, '...');
  a = play(p, a, [{type: 'paint', bead: 0}, {type: 'paint', bead: 0}, {type: 'paint', bead: 0}]);
  assert.equal(a.board.ring[0], 'C');
  a = play(p, a, [{type: 'paint', bead: 0}]);
  assert.equal(a.board.ring[0], 'A', 'and back to green');
  assert.equal(move(p, a, {type: 'paint', bead: 0, colour: 'A'}), null, 'painting a bead its own colour is not a move');
  assert.deepEqual(paintToward('A..', ['ABC', 'AAA']), {bead: 1, colour: 'B'});
});

test('every ring: kept when it fits, once per class, That’s all only when complete, Undo keeps finds', () => {
  const p = byId('beads-01'), m = mechanicFor(p);
  let a = paint(p, freshAttempt(p), 'AAA');
  assert.deepEqual(a.board.found, ['AAA']);
  a = paint(p, a, 'AAB');
  a = paint(p, a, 'ABA');
  assert.deepEqual(a.board.found, ['AAA', 'AAB', 'ABB'], 'a turned ring is the same ring (ABB was made on the way)');
  let html = view(p, a);
  assert.match(html, /<li class="again" data-match="\{&quot;kind&quot;:&quot;turn&quot;,&quot;k&quot;:2\}">/, 'its card shows the turn that matches');
  a = play(p, a, [{type: 'done'}]);
  assert.ok(a.board.early && !isSolved(p, a.board));
  assert.match(view(p, a), /There is another\./);
  a = paint(p, a, 'ABB');
  assert.equal(a.board.early, false, 'the next move clears the message');
  assert.match(view(p, a), /<li class="again"/, 'a repeat of the newest card is shown as a repeat too');
  const before = a;
  a = paint(p, a, 'BBB');
  const back = undo(a), kept = m.carry(p, a.board, back.board);
  assert.deepEqual(kept.found, a.board.found, 'Undo never loses a ring');
  a = play(p, a, [{type: 'done'}]);
  assert.ok(isSolved(p, a.board));
  assert.ok(!isSolved(p, before.board));
  html = view(p, freshAttempt(p));
  assert.doesNotMatch(html, /That’s all/, 'nothing to claim before a ring is found');
});

test('colour counts, clashes and windows are shown on the board', () => {
  const two = byId('beads-02');
  let a = paint(two, freshAttempt(two), 'AAB.');
  let html = view(two, a);
  assert.match(html, /bd-count exact[^>]*aria-label="green: 2 of 2"/);
  assert.match(html, /bd-count under[^>]*aria-label="gold: 1 of 2"/);
  a = paint(two, a, 'AABA');
  assert.deepEqual(a.board.found, [], 'three green is not kept');
  assert.match(view(two, a), /bd-count over/);
  const apart = byId('beads-10');
  html = view(apart, paint(apart, freshAttempt(apart), 'AAB..'));
  assert.equal((html.match(/br-arc clash/g) || []).length, 1, 'one dashed string between the two greens');
  const win = byId('beads-12');
  html = view(win, paint(win, freshAttempt(win), 'AAAAB...'));
  assert.match(html, /class="bd-window more"/, 'green, green, green shows twice');
  assert.match(html, /class="br-way"/, 'the reading direction is drawn');
  assert.ok(fits(win, 'AAABABBB') && !fits(win, 'AAAABBBB'));
});

test('make puzzles: the first ring that fits solves; No ring can is checked', () => {
  const back2 = byId('beads-03');
  let a = paint(back2, freshAttempt(back2), 'AABB');
  assert.ok(!isSolved(back2, a.board));
  a = play(back2, a, [{type: 'claim'}]);
  assert.ok(a.board.wrong && !isSolved(back2, a.board));
  assert.match(view(back2, a), /There is one\./);
  assert.match(view(back2, a), /bd-claim"[^>]*disabled/);
  a = paint(back2, a, 'ABAB');
  assert.ok(isSolved(back2, a.board));
  const never = byId('beads-05');
  assert.equal(answers(never).length, 0);
  let b = freshAttempt(never);
  assert.match(view(never, b), /bd-claim"[^>]*disabled/, 'No ring can waits for a finished ring');
  assert.equal(move(never, b, {type: 'claim'}), null);
  b = paint(never, b, 'AAAB');
  b = play(never, b, [{type: 'claim'}]);
  assert.ok(isSolved(never, b.board));
  assert.equal(nextHint(never, freshAttempt(never)).type, 'note', 'hints never say whether a ring exists');
  assert.equal(nextHint(back2, freshAttempt(back2)).type, 'note');
});

test('the copy is view state: Turn and Flip move it, and the ring shows what matches', () => {
  const p = byId('beads-06'), m = mechanicFor(p);
  m.reset(p);
  let a = paint(p, freshAttempt(p), 'AABAAB');
  let html = view(p, a);
  assert.match(html, /data-ui="\{&quot;copy&quot;:&quot;turn&quot;\}"/);
  assert.doesNotMatch(html, /&quot;flip&quot;/, 'necklaces stay face up: no Flip');
  assert.match(html, /br-copy home/);
  for (let i = 0; i < 3; i++) m.ui(p, {copy: 'turn'});
  html = view(p, a);
  assert.match(html, /br-ring br-all/, 'after three turns the copy matches');
  assert.match(html, /<b class="bd-turns" aria-hidden="true">3<\/b>/);
  m.ui(p, {copy: 'flip'});
  assert.match(view(p, a), /bd-turns" aria-hidden="true">3</, 'a necklace copy cannot flip');
  m.reset(p);
  const h = byId('beads-h02');
  m.reset(h);
  m.ui(h, {copy: 'flip'});
  html = view(h, paint(h, freshAttempt(h), 'ABBA..'));
  assert.match(html, /&quot;copy&quot;:&quot;flip&quot;/);
  assert.match(html, /style="transform:rotateY\(180deg\) rotate\(0\.000deg\)"/);
  assert.ok(isSolved(h, paint(h, freshAttempt(h), 'AABABB').board), 'a lopsided ring of six solves');
  m.reset(h);
});

test('fewest puzzles: a lopsided ring at the fewest and a true claim one below', () => {
  const p = byId('beads-h01');
  assert.equal(fewestOf(p), 3);
  let a = paint(p, freshAttempt(p), 'AABB');
  assert.match(view(p, a), /None with 2 colours/);
  a = play(p, a, [{type: 'claim'}]);
  assert.deepEqual(a.board.claims, [2]);
  assert.match(view(p, a), /<li class="no"/);
  a = paint(p, a, 'AABC');
  assert.ok(isSolved(p, a.board));
  const gold = byId('beads-h04');
  let g = paint(gold, freshAttempt(gold), 'BBBBAAAA');
  assert.match(view(gold, g), /None with 4 gold/);
  g = play(gold, g, [{type: 'claim'}]);
  assert.equal(g.board.wrong, 4, 'a false claim is refused');
  assert.match(view(gold, g), /There is one with 4 gold\./);
  g = paint(gold, g, 'BBABAAAA');
  assert.deepEqual(g.board.found, [3]);
  assert.ok(!isSolved(gold, g.board), 'the fewest needs its claim too');
});

test('Hidden turns: every lopsided eight counts turned and flipped rings once', () => {
  const p = byId('beads-h05');
  assert.deepEqual(answers(p), ['AAAABABB', 'AAABAABB']);
  let a = paint(p, freshAttempt(p), 'BABBAAAA');
  a = paint(p, a, 'BBABAAAA');
  assert.equal(a.board.found.length, 1, 'the mirror image is the same ring here');
  assert.match(view(p, a), /data-match="\{&quot;kind&quot;:&quot;flip&quot;/);
  const flips = byId('beads-h06');
  assert.ok(isSolved(flips, paint(flips, freshAttempt(flips), 'AABAAB').board));
  assert.equal(answers(byId('beads-h07')).length, 0);
});

test('saves round-trip through storage, and forged saves are rejected', () => {
  const p = byId('beads-07');
  let a = freshAttempt(p);
  for (let i = 0; !isSolved(p, a.board) && i < 200; i++) a = move(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  const f = byId('beads-h03'), claimed = play(f, paint(f, freshAttempt(f), 'AABAB'), [{type: 'claim'}]);
  const pg = byId('beads-playground'), painted = play(pg, freshAttempt(pg), [{type: 'size', n: 7}, {type: 'paint', bead: 0}]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, [f.id]: claimed, [pg.id]: painted})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  assert.deepEqual(loaded.store.profiles[0].attempts[p.id].board, a.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[f.id].board, claimed.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[pg.id].board, painted.board);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  assert.throws(() => validateStore({...store, profiles: [profile({[p.id]: {...a, board: {...a.board, found: ['AAAAC']}}})]}, puzzles));
  assert.throws(() => validateStore({...store, profiles: [profile({[f.id]: {...claimed, board: {...claimed.board, claims: [3]}}})]}, puzzles));
});

test('the playground paints rings of 3 to 12 beads, turns and flips the copy, and never counts as solved', () => {
  const pg = byId('beads-playground'), m = mechanicFor(pg);
  m.reset(pg);
  let a = freshAttempt(pg);
  assert.deepEqual(a.board, {n: 6, colours: 2, ring: '......'});
  a = play(pg, a, [{type: 'size', n: 7}, {type: 'colours', colours: 3}, {type: 'paint', bead: 0}, {type: 'paint', bead: 1}, {type: 'paint', bead: 1}]);
  assert.equal(a.board.ring, 'AB.....');
  m.ui(pg, {copy: 'flip'});
  m.ui(pg, {copy: 'turn'});
  const html = view(pg, a);
  assert.match(html, /aria-label="7 beads" aria-pressed="true"|aria-pressed="true" aria-label="7 beads"/);
  assert.match(html, /The copy is flipped/);
  assert.doesNotMatch(html, /data-action="hint"/);
  assert.equal(isSolved(pg, a.board), false);
  assert.equal(move(pg, a, {type: 'size', n: 13}), null);
  assert.ok(puzzleObjective(pg));
  m.reset(pg);
});

// Where the family sits in the satchel, and whether it starts open, is the
// seam's rule (tests/families.test.mjs).
test('the satchel lists Bead rings: playground, twelve puzzles, then Hidden turns', () => {
  const html = libraryView(profile({'beads-03': {completed: true}}), puzzles);
  const start = html.indexOf('data-view-key="family-beads"'), family = html.slice(start, html.indexOf('</details>', start));
  assert.ok(start > 0);
  assert.match(family, /data-id="beads-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(family.includes(`data-id="beads-${String(n).padStart(2, '0')}"`));
  for (let n = 1; n <= 7; n++) assert.ok(family.includes(`data-id="beads-h${String(n).padStart(2, '0')}"`));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Hidden turns</h2>'));
  assert.match(family, /Bead rings, Easy, puzzle 3, completed/);
});

test('every puzzle renders its ring and objective, with no count of answers', () => {
  for (const p of beads.puzzles) {
    const a = freshAttempt(p), html = view(p, a);
    assert.match(html, /class="br-ring/, p.id);
    if (p.band !== 'playground') {
      const shown = visiblePuzzleObjective(p);
      if (shown) assert.ok(html.includes(shown.replace(/’/g, '’')), `${p.id}: objective shown`);
      assert.doesNotMatch(html, /Found \d+ of|of \d+ rings|slot/, `${p.id}: no slot or count per answer`);
    }
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Bead rings/);
});
