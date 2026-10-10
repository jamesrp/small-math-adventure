// Nearest dots: exact regions, edges and ties on the half-unit grid; making a
// target region, touching and avoiding, a four-way tie, taking a place with
// Can't and its segment after a checked attempt, Fewest with its refusal kept
// across Undo, regions hidden until Check, the playground, hints, saves and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import * as G from '../dist/families/sites/plane.js';
import {sitesMechanics, goal, makeAnswer, singleAnswers, certificates, reflect, amount, where, tried} from '../dist/families/sites/sites.js';
import {validateSites} from '../scripts/validate-sites.mjs';
import {loadPack} from '../scripts/packs.mjs';

const sites = JSON.parse(await readFile(new URL('../dist/families/sites/sites.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const M = sitesMechanics.sites;
const H = ([x, y]) => [2 * x, 2 * y], U = ([u, v]) => [u / 2, v / 2];
const byXY = (p, q) => p[0] - q[0] || p[1] - q[1];
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const put = (...points) => points.map(z => ({type: 'place', at: H(z)}));
const check = {type: 'check'}, fewest = {type: 'fewest'};
const cant = (i, j) => ({type: 'cant', pair: [i, j]});
const view = (p, a) => { M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 40; i++) a = move(p, a, nextHint(p, a).action); return a; };
const undoWithCarry = (p, a) => { const next = undo(a); return {...next, board: M.carry(p, a.board, next.board)}; };
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }

test('the pack validates: answers by clipping, hints solve, illegal moves and forged saves fail', async () => {
  const report = await validateSites();
  assert.equal(report.sitesPuzzles, 12);
  assert.ok(report.placementsChecked > 50000);
  assert.ok(report.slowestHintMs < 1000);
});

test('geometry: two dots split along the bisector, three meet at a corner, four can share one place', () => {
  // Two dots: each region is a half-plane, running off the box.
  const two = [[-2, 0], [2, 0]];
  assert.deepEqual(G.bisector(two[0], two[1]), {a: 1, b: 0, c: 0});
  assert.ok(!G.bounded(G.cellOf(two, 0)));
  assert.deepEqual(G.shared(two, 0, 1).kind, 'edge');
  // Three dots of grades 2–3 Problem 2 (in half-steps): one corner shared by all three.
  const tri = [[-4, 0], [4, 0], [0, 4]];
  const ties = G.ties(tri);
  assert.deepEqual(ties.map(t => [G.toUnits(t.at), t.sites]), [[[0, 0], [0, 1, 2]]]);
  assert.ok(!G.fourWay(tri));
  // Adding D 2 squares below the middle puts four on one circle.
  const four = [...tri, [0, -4]];
  assert.ok(G.fourWay(four) && G.fourWayAt(four, 3));
  assert.deepEqual(G.shared(four, 3, 2), {kind: 'point', at: [0, 0, 1]}, 'D and C share one point');
  assert.ok(G.touches(four, 3, 2), 'a single point counts as touching');
  // A closed region: A with three dots round it (grades 4–5 Problem 3).
  const closedIn = [[0, 0], [0, 4], [4, -2], [-4, -2]];
  const cell = G.cellOf(closedIn, 0);
  assert.ok(G.bounded(cell) && G.fits(cell, 6));
  assert.deepEqual(cell.verts.map(G.toUnits).sort(byXY), [[-1.75, 1], [0, -2.5], [1.75, 1]]);
  // Exact corners stay whole numbers over a whole-number denominator.
  assert.ok(cell.verts.every(v => v.every(Number.isSafeInteger) && v[2] > 0));
  // Segments, reflections and words.
  assert.ok(G.onSegment([-4, 0], [4, 0], [0, 0]) && !G.onSegment([-4, 0], [4, 0], [0, -4]) && !G.onSegment([-4, 0], [0, 0], [4, 0]));
  assert.deepEqual(reflect([0, 0], {a: 1, b: 0, c: 2}), [4, 0]);
  assert.deepEqual(reflect([-3, -2], {a: 3, b: 2, c: 0}), [3, 2]);
  assert.equal(reflect([0, 0], {a: 3, b: 2, c: 8}), null, 'the worksheet triangle’s mirror image is off the grid');
  assert.deepEqual([amount(1), amount(2), amount(4), amount(5)], ['half a square', '1 square', '2 squares', '2½ squares']);
});

test('make: a dot halfway, a strip, a corner, a slanted edge and a triangle; one answer each', () => {
  for (const [id, answer] of [['sites-01', [[0, 0]]], ['sites-02', [[-2, 0], [2, 0]]], ['sites-03', [[0, 2], [2, 0]]], ['sites-04', [[1.5, 1]]], ['sites-09', [[-2, 2], [0, -2], [2, 2]]]]) {
    const p = byId(id), q = p.parameters;
    assert.deepEqual(makeAnswer(q).map(U).sort(byXY), [...answer].sort(byXY), `${id}: the mirror images`);
    let a = play(p, freshAttempt(p), ...put(...answer));
    assert.ok(goal(q, a.board.dots) && !isSolved(p, a.board), `${id}: right, but not until Check`);
    a = play(p, a, check);
    assert.ok(isSolved(p, a.board), `${id}: solved at Check`);
  }
  // Puzzle 1: the dot on the shaded edge makes the edge halfway, too far left.
  const p = byId('sites-01');
  const a = play(p, freshAttempt(p), ...put([-1, 0]), check);
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /A’s region goes on past the frame and is not the shaded part\./);
  // Puzzle 3: a dot beyond the frame’s edge is not allowed, and the frame does not close A in.
  const corner = byId('sites-03');
  assert.equal(move(corner, freshAttempt(corner), {type: 'place', at: [-7, 0]}), null);
});

test('regions stay hidden until Check, and a change hides them again', () => {
  const p = byId('sites-02');
  let a = play(p, freshAttempt(p), ...put([-2, 0]));
  assert.doesNotMatch(view(p, a), /st-fill/, 'no regions before Check');
  a = play(p, a, check);
  assert.match(view(p, a), /class="st-fill c-sun"/, 'A’s region after Check');
  assert.match(view(p, a), /st-outline off/);
  a = play(p, a, ...put([2, 0]));
  assert.equal(a.board.checked, false);
  assert.doesNotMatch(view(p, a), /st-fill/, 'hidden again after a change');
  // Moving a dot and taking it away are single moves.
  let b = play(p, freshAttempt(p), ...put([1, 0]), {type: 'move', from: H([1, 0]), to: H([2, 0])});
  assert.deepEqual(b.board.dots, [H([2, 0])]);
  b = play(p, b, {type: 'remove', at: H([2, 0])});
  assert.deepEqual(b.board.dots, []);
  assert.equal(move(p, play(p, freshAttempt(p), ...put([-2, 0], [2, 0])), {type: 'place', at: H([0, 2])}), null, 'no dot past the budget');
});

test('four at once and two but not three: a point tie counts as touching', () => {
  const four = byId('sites-05');
  assert.deepEqual(singleAnswers(four.parameters), [H([0, -2])]);
  let a = play(four, freshAttempt(four), ...put([0, -2]), check);
  assert.ok(isSolved(four, a.board));
  assert.match(view(four, a), /class="st-tie four"/);
  const touch = byId('sites-06');
  a = play(touch, freshAttempt(touch), ...put([0, -2]), check);
  assert.ok(!isSolved(touch, a.board), 'D shares the middle with C');
  const html = view(touch, a);
  assert.match(html, /class="st-tie four bad"/, 'the shared point is marked');
  assert.match(html, /D’s region touches A, B, C\./);
  a = play(touch, a, {type: 'move', from: H([0, -2]), to: H([0, -2.5])}, check);
  assert.ok(isSolved(touch, a.board));
  assert.equal(singleAnswers(touch.parameters).length, 56);
});

test('take: a dot on S takes it with P and Q tied; Can’t needs a checked try and the segment through R', () => {
  const s = byId('sites-07');
  let a = play(s, freshAttempt(s), ...put([0, -2]), check);
  assert.ok(isSolved(s, a.board), 'P and Q tie between A and the new dot, and stay A’s');
  assert.deepEqual(certificates(s.parameters), [], 'no segment through S');

  const r = byId('sites-10'), fresh = freshAttempt(r);
  assert.equal(move(r, fresh, cant(1, 2)), null, 'Can’t on a fresh board does nothing');
  assert.match(view(r, fresh), /class="secondary st-button st-cant"[^>]*disabled/, 'Can’t waits for a try');
  assert.equal(nextHint(r, fresh).action.type, 'place', 'the first hint is a try, not Can’t');
  a = play(r, fresh, ...put([0, 0]));
  assert.equal(move(r, a, cant(1, 2)), null, 'not before Check');
  a = play(r, a, check);
  assert.ok(tried(a.board));
  assert.match(nextHint(r, a).text, /^R is on the straight line from P to Q\. Press Can’t and tap P and Q\.$/);
  const wrong = play(r, a, cant(0, 1));
  assert.deepEqual(wrong.board.refused, [0, 1]);
  assert.match(view(r, wrong), /<p class="st-told">Misses R\.<\/p>/);
  assert.match(view(r, wrong), /class="st-cert bad"/);
  assert.equal(move(r, wrong, cant(0, 1)), null, 'the same claim waits for a change');
  const right = play(r, wrong, cant(1, 2));
  assert.ok(isSolved(r, right.board));
  assert.deepEqual(right.board.dots, [H([0, 0])], 'the segment is drawn over the child’s own try');
  const html = view(r, right);
  assert.match(html, /class="st-cert good"/);
  assert.match(html, /class="st-fill/, 'the try’s regions stay shown');
  // Keep P, take R: a dot behind A.
  const k = byId('sites-11');
  assert.deepEqual(singleAnswers(k.parameters).map(U).sort(byXY), [[-1.5, 2.5], [-1, 3]]);
  a = play(k, freshAttempt(k), ...put([1, 1]), check);
  assert.ok(!isSolved(k, a.board), 'a dot on R takes P too');
  assert.match(view(k, a), /class="st-ring bad"/);
});

test('Can’t is a toggle that shows the places to tap; picks are view state', () => {
  const r = byId('sites-10');
  const a = play(r, freshAttempt(r), ...put([0, 0]), check);
  M.reset(r);
  M.ui(r, {claiming: true});
  let html = playView(r, a, {pack, selected: null, message: ''});
  assert.match(html, /aria-pressed="true"/);
  assert.equal((html.match(/class="st-pick"/g) || []).length, 3, 'A, P and Q can be tapped');
  M.ui(r, {pick: 1});
  html = playView(r, a, {pack, selected: null, message: ''});
  assert.match(html, /aria-label="P, chosen"/);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;pair&quot;:\[1,2\]\}"/, 'a tap on Q makes the claim');
  M.reset(r);
});

test('fit: Fewest after a fit; fewer dots can, and Undo keeps that answer', () => {
  const p = byId('sites-08');
  let a = play(p, freshAttempt(p), ...put([0, 2], [2, -2], [-2, -2], [0, -2]));
  assert.equal(move(p, a, fewest), null, 'Fewest needs a Check');
  a = play(p, a, check, fewest);
  assert.equal(a.board.fewer, 4);
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /<p class="st-told">Fewer dots can\.<\/p>/);
  assert.equal(move(p, a, fewest), null, 'not again with four');
  const back = undoWithCarry(p, a);
  assert.equal(back.board.fewer, 4, 'Undo takes back the move, not the refusal');
  assert.equal(move(p, back, fewest), null);
  a = play(p, back, {type: 'remove', at: H([0, -2])}, check, fewest);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /st-arg-line/, 'the argument is drawn after a right Fewest');
  const b = byId('sites-12');
  assert.ok(b.parameters.budget > b.parameters.fewest);
  let c = play(b, freshAttempt(b), ...put([0, 2]), check);
  assert.match(view(b, c), /B’s region goes on past the frame\./);
  assert.equal(move(b, c, fewest), null, 'no Fewest while B’s region runs off');
  c = play(b, c, ...put([0, -2]), check, fewest);
  assert.ok(isSolved(b, c.board));
});

test('hints: words a child can follow, toward the answer, and never Can’t first', () => {
  const texts = id => { const p = byId(id); let a = freshAttempt(p); const out = []; while (!isSolved(p, a.board)) { const h = nextHint(p, a); out.push(h.text); a = move(p, a, h.action); } return out; };
  assert.deepEqual(texts('sites-01'), ['Put a dot 2 squares right of A.', 'Press Check.']);
  assert.deepEqual(texts('sites-05'), ['Put D 4 squares below C.', 'Press Check.']);
  assert.deepEqual(texts('sites-10'), ['Put a dot on R.', 'Press Check.', 'R is on the straight line from P to Q. Press Can’t and tap P and Q.']);
  assert.deepEqual(texts('sites-12').slice(-2), ['Press Check.', 'Press Fewest.']);
  const p = byId('sites-08'), a = play(p, freshAttempt(p), ...put([2, 2]));
  assert.equal(nextHint(p, a).action.type, 'move', 'a stray dot moves toward a set that works');
  assert.equal(where(p.parameters, H([0, 2])), '2 squares above A');
  for (const q of sites.puzzles.filter(q => q.band !== 'playground')) assert.notEqual(nextHint(q, freshAttempt(q)).action.type, 'cant', `${q.id}`);
});

test('every puzzle renders its board, one short objective and no quiz about who owns a place', () => {
  for (const p of sites.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-st-board/, `${p.id}: board`);
    assert.doesNotMatch(JSON.stringify(p), /which dot owns|whose place|who owns/i, `${p.id}: no ownership quiz`);
    if (p.band === 'playground') { assert.match(html, /st-fill/, 'the playground shows regions'); continue; }
    assert.ok(html.includes(p.visibleObjective), `${p.id}: objective shown`);
    assert.doesNotMatch(html, /st-fill/, `${p.id}: no regions before Check`);
    assert.equal((html.match(/<span class="st-slots"[^]*?<\/span>/)[0].match(/<i /g) || []).length, p.parameters.budget, `${p.id}: slots for the budget, not the answer`);
    const done = view(p, solve(p));
    assert.match(done, /st-fill/, `${p.id}: regions shown when solved`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Nearest dots/);
  const module = FAMILIES.find(m => m.id === 'sites');
  assert.equal(module.family.symbol, '⬡');
  assert.doesNotMatch(module.focus, /st-cant/, 'focus never lands on Can’t');
});

test('the playground: up to ten dots, every one movable, regions always shown; never solved', () => {
  const pg = byId('sites-playground');
  let a = freshAttempt(pg);
  assert.equal(a.board.dots.length, 2);
  assert.match(view(pg, a), /class="st-fill c-sun"[^]*class="st-fill c-sky"/);
  a = play(pg, a, {type: 'place', at: [0, 0]}, {type: 'move', from: pg.parameters.start[0], to: [-4, -4]});
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
  assert.ok(M.noHint(pg));
  assert.equal(move(pg, a, check), null);
  for (let k = 1; a.board.dots.length < 10; k++) a = play(pg, a, {type: 'place', at: [k - 5, 5]});
  assert.equal(move(pg, a, {type: 'place', at: [5, -5]}), null, 'ten at most');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const r = byId('sites-10'), s = byId('sites-07'), f = byId('sites-08'), pg = byId('sites-playground');
  const claimed = play(r, freshAttempt(r), ...put([0, 0]), check, cant(0, 1));
  const half = play(s, freshAttempt(s), ...put([0, 0]));
  const refusedFit = play(f, freshAttempt(f), ...put([0, 2], [2, -2], [-2, -2], [0, -2]), check, fewest);
  const toy = play(pg, freshAttempt(pg), {type: 'place', at: [0, 0]});
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[r.id]: claimed, [s.id]: half, [f.id]: refusedFit, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[r.id, claimed], [s.id, half], [f.id, refusedFit], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  const solved = solve(r);
  assert.deepEqual(resumeAttempt(r, solved).board, freshAttempt(r).board);
  const forge = (id, board) => ({...store, profiles: [profile({[id]: {...freshAttempt(byId(id)), board}})]});
  assert.throws(() => validateStore(forge(r.id, {dots: [], checked: false, claimed: [1, 2], refused: null}), puzzles), 'a claim with no try');
  assert.throws(() => validateStore(forge(s.id, {dots: [H([0, 0])], checked: true, claimed: [1, 2], refused: null}), puzzles), 'a claim that is not a certificate');
  assert.throws(() => validateStore(forge(f.id, {dots: [], checked: false, done: false, fewer: 3}), puzzles), 'a refusal at the fewest');
  assert.throws(() => validateStore(forge(f.id, {dots: [H([2, 0]), H([0, 0])], checked: false, done: false, fewer: null}), puzzles), 'a dot on A, out of order');
  assert.equal(validBoard(pg, {dots: [[0, 0], [0, 0]]}), false);
});

test('the satchel lists Nearest dots with its playground and twelve puzzles', () => {
  const html = libraryView(profile({'sites-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-sites"/);
  assert.match(html, /data-id="sites-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="sites-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Nearest dots, Easy, puzzle 2, completed/);
});
