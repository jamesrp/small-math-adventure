// Ball triangles: exact corners and areas on the 15° grid, three right
// corners, pole–equator fractions, sets of corners made or refuted with the
// corner-sum rule after an attempt, a refusal kept across Undo, taps that go
// to what the child sees, keys, hints (quick, never Can't first), the lune
// pair playground, rendering, saves and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import {globeMechanics, factsOf, triangleFacts, kSign, kFloat, K, kMul, kSub, cosK, tapTarget, tapAction, keyStep, turned, frameOf, screenOf, vec, coverCounts, whereWords, placeWords, madeOf} from '../dist/families/globe/globe.js';
import {validateGlobe} from '../scripts/validate-globe.mjs';
import {loadPack} from '../scripts/packs.mjs';

const globe = JSON.parse(await readFile(new URL('../dist/families/globe/globe.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const M = globeMechanics.globe;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const place = (corner, to) => ({type: 'place', corner, to});
const cant = record => ({type: 'cant', record});
const back = (p, a) => { const b = undo(a); return {...b, board: M.carry(p, a.board, b.board)}; };
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 40; i++) a = move(p, a, nextHint(p, a).action); return a; };
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const degs = (q, corners) => factsOf(q, corners).corners.map(c => c.deg);

test('the pack validates: answers by brute force in Q(t), hints solve, illegal moves and forged saves fail', async () => {
  const report = await validateGlobe();
  assert.equal(report.puzzles, 10);
  assert.equal(report.triangles, 3032624);
  assert.ok(Object.keys(report.types).every(t => t.endsWith(',90,90')));
  assert.deepEqual(report.randomCantTaps, {'globe-03': '1/2', 'globe-06': '0/3', 'globe-10': '1/3'});
});

test('exact numbers: signs in Q(√2, √3), and cos 15° squared', () => {
  // √6 + √2 − 3.8637… is tiny but positive; 7 − 4√3 > 0; 5√2 − 7 > 0; 2√6 − 5 < 0.
  assert.equal(kSign(K(-38637, 10000, 0, 10000, 10000)), 1);
  assert.equal(kSign(K(7, 0, -4)), 1);
  assert.equal(kSign(K(-7, 5)), 1);
  assert.equal(kSign(K(-5, 0, 0, 2)), -1);
  assert.equal(kSign(K(0)), 0);
  const c = cosK(15);
  assert.ok(Math.abs(kFloat(c) - Math.cos(Math.PI / 12)) < 1e-15);
  assert.equal(kSign(kSub(kMul(c, c), K(2, 0, 1, 0, 4))), 0, 'cos² 15° = (2 + √3)/4');
});

test('corners and areas are exact: three right corners cover 1/8; a pole and the equator cover gap/720', () => {
  const q = byId('globe-01').parameters;
  assert.deepEqual(degs(q, {N: [90, 0], A: [0, 0], B: [0, 90]}), [90, 90, 90]);
  assert.equal(factsOf(q, {N: [90, 0], A: [0, 0], B: [0, 90]}).excess, 6, 'the octant: 6 steps of 15°, 6/48 = 1/8');
  for (let g = 15; g < 180; g += 15) {
    const f = factsOf(q, {N: [90, 0], A: [0, 0], B: [0, g]});
    assert.deepEqual(f.corners.map(c => c.deg), [g, 90, 90], `gap ${g}`);
    assert.equal(f.excess, g / 15, `gap ${g}: covers ${g}/720`);
  }
  // A corner that is not a whole number of degrees is not reported as one.
  const off = factsOf(q, {N: [90, 0], A: [0, 0], B: [30, 45]});
  assert.equal(off.corners[0].deg, 45);
  assert.equal(off.corners[1].deg, null);
  assert.ok(Math.abs(off.corners[1].approx - 50.77) < 0.01);
  assert.equal(off.excess, null, 'an area that is not a whole number of 48ths is not reported as one');
  // No triangle: opposite corners, or all three on one great circle.
  assert.equal(triangleFacts([[90, 0], [-90, 0], [0, 30]]).ok, false, 'two opposite corners');
  assert.equal(triangleFacts([[0, 0], [0, 30], [0, 60]]).ok, false, 'three on the equator');
  assert.equal(triangleFacts([[90, 0], [30, 45], [-15, 45]]).ok, false, 'three on one meridian');
  assert.equal(triangleFacts([[90, 0], [0, 0], [0, 30]]).ok, true);
});

test('three right corners: puzzle 1 by moving B a quarter turn along the equator', () => {
  const p = byId('globe-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, place('N', [75, 0])), null, 'N stays put');
  assert.equal(move(p, a, place('B', [-90, 0])), null, 'B opposite N leaves no triangle');
  assert.equal(move(p, a, place('B', [0, 180])), null, 'B opposite A leaves no triangle');
  assert.equal(move(p, a, place('B', [0, 45])).board.corners.B[1], 45);
  a = play(p, a, place('B', [0, 45]));
  assert.ok(!isSolved(p, a.board), 'two right corners are not three');
  a = play(p, a, place('B', [0, 90]));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, place('B', [0, 75])), null, 'no moves once solved');
});

test('fractions: a twelfth is a 60° gap, and the board never prints the area', () => {
  const p = byId('globe-02');
  let a = freshAttempt(p);
  M.reset(p);
  const html = view(p, a);
  assert.ok(html.includes('Cover 1/12 of the ball.'));
  assert.doesNotMatch(html, /1\/24|of the ball covered/, 'the current area is not shown');
  a = play(p, a, place('B', [0, 60]));
  assert.ok(isSolved(p, a.board));
  const other = play(p, freshAttempt(p), place('B', [0, 300]));
  assert.ok(isSolved(p, other.board), 'either way round');
});

test('sets: made by a triangle with exactly those corners; Can’t after an attempt, judged by the corner sum', () => {
  const p = byId('globe-03');
  let a = freshAttempt(p);
  M.reset(p);
  assert.equal(move(p, a, cant(1)), null, 'no Can’t on a fresh board');
  assert.match(view(p, a), /class="gl-cant"[^>]*disabled/, 'the Can’t button waits');
  a = play(p, a, place('B', [15, 60]));
  assert.equal(a.board.tried, true);
  assert.doesNotMatch(view(p, a), /class="gl-cant"[^>]*disabled/, 'Can’t is open after a move');
  // A wrong claim: one refusal, kept through Undo until a corner moves.
  const told = play(p, a, cant(0));
  assert.equal(told.board.refused, 0);
  assert.match(view(p, told), /There is a way\./);
  assert.deepEqual(view(p, told).match(/<p class="gl-told">([^<]*)<\/p>/g), ['<p class="gl-told">There is a way.</p>'], 'the refusal prints no values');
  assert.equal(move(p, told, cant(1)), null, 'no second claim until a corner moves');
  const kept = back(p, told);
  assert.equal(kept.board.refused, 0, 'Undo keeps the refusal');
  assert.doesNotMatch(view(p, kept), /There is a way\./, 'Undo takes the words away');
  assert.notDeepEqual(kept.board, told.board, 'Undo changes the board');
  assert.equal(move(p, kept, cant(1)), null, 'still no claim after Undo');
  // Making the set: kept with the corners that made it.
  let m = play(p, kept, place('B', [0, 45]));
  assert.deepEqual(madeOf(m.board), [0]);
  assert.deepEqual(m.board.built[0].corners, {N: [90, 0], A: [0, 0], B: [0, 45]});
  assert.equal(m.board.refused, null, 'a move clears the refusal');
  assert.match(view(p, m), /gl-record made/);
  const undone = back(p, m);
  assert.deepEqual(madeOf(undone.board), [0], 'Undo keeps a set made');
  assert.deepEqual(undone.board.corners.B, [15, 60], 'and puts the corner back');
  // The right claim: the argument is drawn, and Undo keeps the claim.
  M.ui(p, {claiming: true});
  const picking = view(p, m);
  assert.equal((picking.match(/gl-record[^"]*pick/g) || []).length, 1, 'only the open set can be tapped');
  assert.doesNotMatch(picking, /gl-record[^"]*pick[^"]*hinted|gl-record[^"]*hinted[^"]*pick/, 'nothing marks the right tap');
  const done = play(p, m, cant(1));
  assert.ok(isSolved(p, done.board));
  assert.match(view(p, done), /gl-argument/);
  assert.match(view(p, done), /side by side: 180°, no further than a straight line/);
});

test('a shelf of sets that can all be made: every Can’t is refused', () => {
  const p = byId('globe-06');
  const a = play(p, freshAttempt(p), place('A', [0, 0]));
  for (let i = 0; i < 3; i++) assert.equal(move(p, a, cant(i)).board.refused, i, `set ${i} can be made`);
  const s = solve(p);
  assert.ok(isSolved(p, s.board));
  assert.deepEqual(s.board.cant, []);
  assert.deepEqual(madeOf(s.board).sort(), [0, 1, 2]);
});

test('hints: quick in CPU time, a corner move first, the reason before Can’t, and they solve', () => {
  for (const p of globe.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.equal(first.action.type, 'place', `${p.id}: never a claim first`);
    assert.doesNotMatch(first.text, /Can’t/);
    for (; !isSolved(p, a.board) && steps < 30; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      if (h.action.type === 'cant') assert.match(h.text, /^\d+°, \d+° and \d+° add up to \d+°\. Every triangle you make adds up to more\. Press Can’t, then tap that set\.$/);
      else assert.match(h.text, /^(Make a triangle: move|Move) [A-Z] (\d+ steps? (north|south|east|west)|to the (north|south) pole|off the pole)/, `${p.id}: ${h.text}`);
      a = move(p, a, h.action);
      assert.ok(a, `${p.id}: the hinted move is legal`);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  // A move after a solve-search: a tap stays fast too.
  const p = byId('globe-10'), a = play(p, freshAttempt(p), place('C', [60, 30]));
  const t = process.cpuUsage(); nextHint(p, a); view(p, a); const u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 < 100, 'a move and its redraw are quick');
  assert.equal(whereWords([0, 0], [0, 60]), '4 steps east');
  assert.equal(whereWords([0, 30], [-15, 345]), '1 step south and 3 steps west');
  assert.equal(whereWords([90, 0], [60, 120]), 'off the pole, 2 steps south');
  assert.equal(whereWords([15, 45], [-90, 0]), 'to the south pole');
  assert.equal(placeWords([0, 300]), 'on the equator at 60° west');
  assert.equal(placeWords([-15, 45]), 'at 15° south, 45° east');
});

test('taps go to what the child sees: a corner before a nearby dot, never a corner behind the ball', () => {
  const p = byId('globe-01'), q = p.parameters, corners = q.start, v = {lat: 20, lon: 30}, F = frameOf(v);
  const [bx, by] = screenOf(F, vec(corners.B));
  assert.deepEqual(tapTarget(q, corners, v, bx, by), {corner: 'B'});
  // A dot next to B, and a tap between them but nearer B.
  const [dx, dy] = screenOf(F, vec([30, 60]));
  assert.deepEqual(tapTarget(q, corners, v, dx, dy), {dot: [30, 60]});
  assert.deepEqual(tapTarget(q, corners, v, bx + (dx - bx) * 0.35, by + (dy - by) * 0.35), {corner: 'B'});
  assert.deepEqual(tapTarget(q, corners, v, bx + (dx - bx) * 0.8, by + (dy - by) * 0.8), {dot: [30, 60]});
  // Just outside B's disc, a dot nearer the tap than B wins; one farther does not.
  const gap = Math.hypot(dx - bx, dy - by), off = 9.6 / gap;
  assert.ok(gap > 19, `dots ${gap.toFixed(1)} units apart here`);
  assert.deepEqual(tapTarget(q, corners, v, bx + (dx - bx) * off, by + (dy - by) * off), {corner: 'B'}, 'outside the disc but nearer B');
  // Near a pole the ring's dots crowd: one under a corner's disc goes to the corner, the next one out to the dot.
  const pg = byId('globe-playground').parameters, ring = {A: [75, 0], B: [0, 0], C: [0, 90]}, top = {lat: 90, lon: 0}, T = frameOf(top);
  const [ux, uy] = screenOf(T, vec([75, 15])), [wx, wy] = screenOf(T, vec([75, 30])), [ax, ay] = screenOf(T, vec([75, 0]));
  assert.ok(Math.hypot(ux - ax, uy - ay) < 7.6, 'the next dot on the ring is under A’s disc');
  assert.deepEqual(tapTarget(pg, ring, top, ux, uy), {corner: 'A'}, 'a dot hidden by a corner’s disc goes to the corner');
  assert.deepEqual(tapTarget(pg, ring, top, wx, wy), {dot: [75, 30]}, 'the dot after it is its own');
  // Turn B to the back: a tap where it would be goes to a front dot.
  const behind = {lat: -20, lon: 225}, G = frameOf(behind), [hx, hy, hz] = screenOf(G, vec(corners.B));
  assert.ok(hz < 0);
  assert.equal(tapTarget(q, corners, behind, hx, hy)?.corner, undefined, 'a corner behind the ball is not tapped');
  // What a tap does.
  assert.deepEqual(tapAction(q, corners, 'B', {corner: 'B'}), {choose: 'B'});
  assert.equal(tapAction(q, corners, 'B', {corner: 'N'}), null, 'a corner that stays put is not chosen');
  assert.deepEqual(tapAction(q, corners, 'B', {dot: [0, 90]}), {move: place('B', [0, 90])});
  assert.deepEqual(tapAction(q, corners, 'B', {dot: [30, 45]}), {choose: 'B'}, 'a tap on a corner’s own dot chooses it');
  assert.equal(tapAction(q, corners, 'B', {dot: [0, 0]}), null, 'a tap on a corner that stays put does nothing');
  assert.equal(tapAction(q, corners, null, {dot: [0, 90]}), null);
});

test('keys: arrows step a corner by one dot; over a pole; turning wraps', () => {
  const v = {lat: 20, lon: 30};
  assert.deepEqual(keyStep(v, [0, 0], 'ArrowUp'), [15, 0]);
  assert.deepEqual(keyStep(v, [0, 0], 'ArrowLeft'), [0, 345]);
  assert.deepEqual(keyStep(v, [75, 60], 'ArrowUp'), [90, 0]);
  assert.equal(keyStep(v, [90, 0], 'ArrowUp'), null);
  assert.deepEqual(keyStep(v, [90, 0], 'ArrowDown'), [75, 30], 'off the pole toward the view');
  assert.equal(keyStep(v, [90, 0], 'ArrowRight'), null);
  assert.deepEqual(keyStep(v, [-75, 0], 'ArrowDown'), [-90, 0]);
  assert.deepEqual(turned({lat: 80, lon: 350}, 15, 15), {lat: 90, lon: 5});
  assert.deepEqual(turned({lat: -80, lon: 5}, -15, -15), {lat: -90, lon: 350});
});

test('every puzzle renders a ball, three corner cards and its objective; nothing reads corners from the picture', () => {
  for (const p of globe.puzzles) {
    M.reset(p);
    const a = freshAttempt(p), html = view(p, a);
    assert.match(html, /data-gl-ball/, `${p.id}: ball`);
    assert.equal((html.match(/class="gl-card[ "]/g) || []).length, 3, `${p.id}: three corner cards`);
    if (p.visibleObjective) assert.ok(html.includes(p.visibleObjective), `${p.id}: objective shown`);
    // The cards show the exact corner from the field, or ≈ and one decimal.
    const f = factsOf(p.parameters, a.board.corners);
    for (const c of f.corners) assert.ok(html.includes(c.deg !== null ? `>${c.deg}°<` : `≈${c.approx.toFixed(1)}°`), `${p.id}: a card shows ${c.deg ?? c.approx}`);
    if (p.band === 'playground') continue;
    const done = view(p, solve(p));
    assert.match(done, /gl-puzzle solved/, `${p.id}: solved`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Ball triangles/);
  const module = FAMILIES.find(m => m.id === 'globe');
  assert.equal(module.family.symbol, '◍');
  assert.equal(FAMILIES.filter(m => m.family?.symbol === '◍').length, 1, 'a symbol of its own');
  assert.equal(module.focus, '[data-gl-ball]', 'focus falls back to the ball, never Can’t, a set or a card');
});

test('the playground: lune pairs cover the triangle and its opposite three times, every other region once', () => {
  const pg = byId('globe-playground');
  let a = freshAttempt(pg);
  assert.ok(M.noHint(pg));
  assert.deepEqual(coverCounts([0, 1, 2]), [3, 1, 1, 1, 1, 1, 1, 3]);
  assert.deepEqual(coverCounts([0]), [1, 0, 0, 1, 1, 0, 0, 1]);
  a = play(pg, a, {type: 'pair', corner: 'A'}, {type: 'pair', corner: 'B'}, {type: 'pair', corner: 'C'});
  M.reset(pg);
  const html = view(pg, a);
  assert.ok((html.match(/class="gl-count"[^>]*>3</g) || []).length >= 1, 'a region covered three times shows 3');
  assert.match(html, /aria-pressed="true" aria-label="Pair at A"/);
  a = play(pg, a, place('A', [60, 15]));
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
  assert.equal(move(pg, a, cant(0)), null);
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const r = byId('globe-03'), f = byId('globe-05'), pg = byId('globe-playground');
  const claimed = play(r, freshAttempt(r), place('B', [0, 45]), place('B', [15, 45]), cant(1));
  const refused = play(r, freshAttempt(r), place('B', [15, 60]), cant(0));
  const half = play(f, freshAttempt(f), place('B', [0, 60]));
  const toy = play(pg, freshAttempt(pg), {type: 'pair', corner: 'B'});
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[r.id]: claimed, [f.id]: half, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[r.id, claimed], [f.id, half], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  const solved = solve(r);
  assert.deepEqual(resumeAttempt(r, solved).board, freshAttempt(r).board);
  const forge = (id, board) => ({...store, profiles: [profile({[id]: {...freshAttempt(byId(id)), board}})]});
  assert.ok(validBoard(r, refused.board));
  assert.throws(() => validateStore(forge(r.id, {...refused.board, refused: 1}), puzzles), 'a refusal of the set that can’t be made');
  assert.throws(() => validateStore(forge(r.id, {...claimed.board, built: [{record: 0, corners: claimed.board.corners}]}), puzzles), 'a set made with corners that don’t make it');
  assert.throws(() => validateStore(forge(r.id, {...freshAttempt(r).board, cant: [1]}), puzzles), 'a claim with no try');
  assert.throws(() => validateStore(forge(f.id, {corners: {N: [90, 0], A: [0, 0], B: [0, 60]}, done: true}), puzzles), 'a forged done');
  assert.throws(() => validateStore(forge(f.id, {corners: {N: [75, 0], A: [0, 0], B: [0, 60]}}), puzzles), 'N moved');
});

test('the satchel lists Ball triangles with its playground and ten puzzles', () => {
  const html = libraryView(profile({'globe-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-globe"/);
  assert.match(html, /data-id="globe-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 10; n++) assert.ok(html.includes(`data-id="globe-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Ball triangles, Easy, puzzle 2, completed/);
});
