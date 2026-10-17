// Three-arm lines: exact meeting of two lines and fans of junctions in
// half-steps; meeting in a named point or stretch with Check; one junction
// through every circle, and Can't with two circles whose fans leave one
// junction; marking the ray of junctions with That's all judging the shelf;
// refusals kept across Undo while the board still changes; the playground;
// hints in CPU time; saves; rendering and scoped styles.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import * as L from '../dist/families/tropical/lines.js';
import {tropicalMechanics, meetAnswers, throughAnswer, certificatesOf, judgeMarks, judgeClaim, placeWords, relWords, strokeOf, snap} from '../dist/families/tropical/tropical.js';
import {validateTropical} from '../scripts/validate-tropical.mjs';
import {loadPack} from '../scripts/packs.mjs';

const tropical = JSON.parse(await readFile(new URL('../dist/families/tropical/tropical.json', import.meta.url), 'utf8'));
const css = await readFile(new URL('../dist/families/tropical/tropical.css', import.meta.url), 'utf8');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const M = tropicalMechanics.tropical;
const H = ([x, y]) => [2 * x, 2 * y], U = ([u, v]) => [u / 2, v / 2];
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const put = z => ({type: 'put', at: H(z)});
const check = {type: 'check'}, all = {type: 'all'}, keep = {type: 'keep'}, drop = {type: 'drop'};
const cant = (i, j) => ({type: 'cant', picks: [i, j]});
const mark = m => ({type: 'mark', ...m});
const view = (p, a, keepUi = false) => { if (!keepUi) M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const board = (p, a) => M.render(p, a);
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 40; i++) a = move(p, a, nextHint(p, a).action); return a; };
const undoWithCarry = (p, a) => { const next = undo(a); return {...next, board: M.carry(p, a.board, next.board)}; };
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }

test('the pack validates: answers from the min-tie definition, hints solve, illegal moves and forged saves fail', async () => {
  const report = await validateTropical();
  assert.equal(report.tropicalPuzzles, 12);
  assert.ok(report.linePairs > 2000 && report.targetSets === 400);
  assert.ok(report.shelvesJudged > 1500);
  assert.equal(report.certificateTaps['tropical-11'].wins, 0, 'Can’t never solves where a line exists');
  assert.ok(report.certificateTaps['tropical-12'].share < 0.01, 'random taps almost never finish the certificate');
  assert.equal(report.certificateTaps['tropical-12'].atCertificate, '2 of 6', 'even at the right junction, one pair in three');
  assert.ok(report.slowestHintCpuMs < 100);
});

test('geometry: two lines share one point unless the junctions share a column, row or rising diagonal', () => {
  // The worksheet's page 1 example: U = (1, 4) and V = (4, 2) share only (4, 4).
  assert.deepEqual(L.meet(H([1, 4]), H([4, 2])), {kind: 'point', at: H([4, 4])});
  // Problem 1's bottom grid: A = (2, 2) and B = (5, 6) share only (2, 3).
  assert.deepEqual(L.meet(H([2, 2]), H([5, 6])), {kind: 'point', at: H([2, 3])});
  // Problem 2's pairs: a column, a row, a diagonal.
  assert.deepEqual(L.meet(H([3, 2]), H([3, 6])), {kind: 'ray', from: H([3, 6]), dir: 'N'});
  assert.deepEqual(L.meet(H([2, 4]), H([6, 4])), {kind: 'ray', from: H([6, 4]), dir: 'E'});
  assert.deepEqual(L.meet(H([2, 2]), H([6, 6])), {kind: 'ray', from: H([2, 2]), dir: 'SW'});
  // Up and to the right, wide and tall: the upper slanting arm meets the lower line.
  assert.deepEqual(L.meet([0, 0], [6, 2]), {kind: 'point', at: [4, 0]});
  assert.deepEqual(L.meet([0, 0], [2, 6]), {kind: 'point', at: [0, 4]});
  assert.deepEqual(L.meet([0, 0], [0, 0]), {kind: 'line'});
  // Fans: the junctions for a point are left, down, and up-right of it.
  assert.ok(L.inFan(H([1, 3]), H([3, 3])) && L.inFan(H([3, 0]), H([3, 3])) && L.inFan(H([5, 5]), H([3, 3])));
  assert.ok(!L.inFan(H([4, 3]), H([3, 3])) && !L.inFan(H([2, 2]), H([3, 3])));
  // Two points, one line: Problem 4's pairs.
  assert.deepEqual(L.junctionsFor([H([2, 5]), H([6, 2])]), {kind: 'point', at: H([2, 2])});
  assert.deepEqual(L.junctionsFor([H([2, 2]), H([6, 5])]), {kind: 'point', at: H([5, 5])});
  // Aligned: a ray of junctions (Problem 5).
  assert.deepEqual(L.junctionsFor([H([2, 4]), H([6, 4])]), {kind: 'ray', from: H([2, 4]), dir: 'W'});
  assert.deepEqual(L.junctionsFor([H([2, 2]), H([5, 5])]), {kind: 'ray', from: H([5, 5]), dir: 'NE'});
  // Three points: on a line, or not.
  assert.deepEqual(L.junctionsFor([H([2, 2]), H([7, 5]), H([5, 8])]), {kind: 'point', at: H([5, 5])});
  assert.equal(L.junctionsFor([H([2, 2]), H([7, 5]), H([6, 6])]), null);
  assert.ok(!Object.is(L.fanMeet([0, 0], [6, 2]).at[1], -0), 'no negative zero');
  // Words.
  assert.equal(placeWords([1, 0]), '½ across, 0 up');
  assert.equal(placeWords([3, 8]), '1½ across, 4 up');
  assert.equal(relWords(H([6, 4]), H([6, 1]), 'the ring'), 'below the ring');
  assert.equal(relWords(H([6, 4]), H([7, 5]), 'the ring'), 'up and to the right of the ring');
  assert.equal(relWords(H([6, 4]), H([2, 4]), 'the ring'), 'left of the ring');
});

test('meet: B is judged only on Check; a point goal and a stretch goal', () => {
  const p = byId('tropical-01'), q = p.parameters;
  assert.deepEqual(meetAnswers(q).map(U).sort(), [[6, 0], [6, 1], [6, 2], [6, 3], [7, 5], [8, 6]].sort());
  let a = freshAttempt(p);
  assert.doesNotMatch(board(p, a), /tr-shared|tr-ring (good|bad)/, 'nothing shared is drawn before Check');
  a = play(p, a, put([6, 2]));
  assert.ok(!isSolved(p, a.board), 'right, but not until Check');
  assert.doesNotMatch(board(p, a), /tr-ring good|tr-told/, 'still no verdict while B moves');
  const done = play(p, a, check);
  assert.ok(isSolved(p, done.board));
  assert.match(board(p, done), /class="tr-ring good"/);
  // B on the ring shares A's right arm from there.
  const onRing = play(p, freshAttempt(p), put([6, 4]), check);
  assert.ok(!isSolved(p, onRing.board) && onRing.board.refused);
  assert.match(board(p, onRing), /<p class="tr-told">They share a whole stretch\.<\/p>/);
  assert.match(board(p, onRing), /tr-shared bad/);
  assert.equal(move(p, onRing, check), null, 'Check again in the same place is refused');
  // Undo takes back the words, not the refusal.
  const back = undoWithCarry(p, onRing);
  assert.ok(back.board.refused && !back.board.said && validBoard(p, back.board));
  assert.notEqual(board(p, back), board(p, onRing), 'Undo changes the board');
  assert.match(board(p, back), /data-move="\{&quot;type&quot;:&quot;check&quot;\}"[^>]*disabled/, 'Check stays off');
  // Elsewhere: they meet somewhere else.
  assert.match(board(p, play(p, freshAttempt(p), put([0, 7]), check)), /They meet somewhere else\./);

  const s = byId('tropical-02');
  assert.deepEqual(meetAnswers(s.parameters).map(U).sort(), [[0, 4], [1, 4], [2, 4], [3, 4]]);
  assert.match(board(s, play(s, freshAttempt(s), put([6, 4]), check)), /They share a different stretch\./, 'B right of A: the stretch starts at B');
  assert.match(board(s, play(s, freshAttempt(s), put([6, 7]), check)), /They share only one point\./);
  assert.ok(isSolved(s, play(s, freshAttempt(s), put([2, 4]), check).board));
  // The slanting stretch from A: B above A on its diagonal, not below.
  const d = byId('tropical-05');
  assert.deepEqual(meetAnswers(d.parameters).map(U).sort(), [[5, 5], [6, 6], [7, 7], [8, 8]]);
  assert.match(board(d, play(d, freshAttempt(d), put([2, 2]), check)), /They share a different stretch\./);
  assert.ok(isSolved(d, play(d, freshAttempt(d), put([7, 7]), check).board));
  // No answer is a point the board draws.
  for (const m of [byId('tropical-01'), s, d, byId('tropical-06'), byId('tropical-10')]) {
    const g = m.parameters.goal, drawn = g.kind === 'point' ? g.at : g.from;
    assert.ok(!meetAnswers(m.parameters).some(B => L.same(B, drawn) || L.same(B, m.parameters.A)), `${m.id}: no answer drawn`);
  }
  // Half-steps on Hard: B half a square left of the ring or below it.
  const h = byId('tropical-10');
  assert.deepEqual(meetAnswers(h.parameters).map(U).sort(), [[0, 0.5], [0.5, 0]]);
  assert.ok(isSolved(h, play(h, freshAttempt(h), {type: 'put', at: [0, 1]}, check).board));
});

test('through: one junction through two circles; Can’t with two circles after an attempt', () => {
  const p = byId('tropical-03');
  assert.deepEqual(U(throughAnswer(p.parameters).at), [2, 2]);
  const missed = play(p, freshAttempt(p), put([2, 3]), check);
  assert.match(board(p, missed), /The line misses Q\./);
  assert.equal(move(p, missed, cant(0, 1)), null, 'no Can’t without three circles');
  assert.doesNotMatch(board(p, missed), /tr-cant/, 'no Can’t button with two circles');
  assert.ok(isSolved(p, play(p, freshAttempt(p), put([2, 2]), check).board));

  const r = byId('tropical-12'), q = r.parameters, fresh = freshAttempt(r);
  assert.equal(throughAnswer(q), null);
  assert.deepEqual(certificatesOf(q).map(c => [c.picks, U(c.at)]), [[[0, 1], [5, 5]], [[1, 2], [6, 5]]]);
  assert.match(board(r, fresh), /tr-cant"[^>]*disabled>Can’t/, 'Can’t is off before an attempt');
  assert.equal(move(r, fresh, cant(0, 1)), null);
  let a = play(r, fresh, put([5, 5]));
  assert.doesNotMatch(board(r, a), /tr-cant"[^>]*disabled/, 'on after one');
  // Can't: tap two circles. Every circle gets the same ring; none is marked.
  M.ui(r, {claiming: true});
  const claiming = board(r, a);
  assert.match(claiming, /<p class="tr-told">Tap two circles\.<\/p>/);
  assert.equal((claiming.match(/class="tr-pick"/g) || []).length, 3);
  assert.doesNotMatch(claiming, /tr-hint|picked/);
  M.ui(r, {claiming: false});
  // A wrong pair: one short refusal; that pair stays refused here, also across Undo.
  const wrong = play(r, a, cant(1, 2));
  assert.match(board(r, wrong), /<p class="tr-told">The line misses R\.<\/p>/);
  assert.deepEqual(wrong.board.claimed, [[1, 2]]);
  assert.equal(JSON.stringify(move(r, wrong, cant(2, 1)).board), JSON.stringify(wrong.board), 'the same pair again changes nothing');
  const back = undoWithCarry(r, wrong);
  assert.ok(back.board.claimed.length === 1 && back.board.said === null);
  assert.notEqual(board(r, back), board(r, wrong));
  assert.ok(!isSolved(r, play(r, back, cant(1, 2)).board), 'still refused after Undo');
  assert.deepEqual(nextHint(r, wrong).action, cant(0, 1), 'the hint goes to the right pair, with no stepping off and back');
  // P and R allow a whole ray of junctions.
  assert.deepEqual(judgeClaim(q, [0, 2], H([6, 6])), {why: 'more'});
  assert.match(board(r, play(r, play(r, fresh, put([6, 6])), cant(0, 2))), /Other junctions pass P and R too\./);
  // The right pair: solved, with both fans and R ringed.
  const done = play(r, a, cant(0, 1));
  assert.ok(isSolved(r, done.board));
  assert.deepEqual(done.board.at, H([5, 5]), 'drawn round the child’s own junction');
  const drawn = board(r, done);
  assert.equal((drawn.match(/class="tr-fan tr-fan-on"/g) || []).length, 2);
  assert.equal((drawn.match(/class="tr-fan tr-fan-off"/g) || []).length, 1);
  assert.match(drawn, /class="tr-ring bad" cx="60" cy="-60"/, 'R ringed');
  // The other certificate, and Can't where a line exists.
  assert.ok(isSolved(r, play(r, fresh, put([6, 5]), cant(1, 2)).board));
  const t = byId('tropical-11');
  for (const pair of [[0, 1], [0, 2], [1, 2]]) assert.ok(!isSolved(t, play(t, freshAttempt(t), put([5, 5]), cant(...pair)).board));
  assert.match(board(t, play(t, freshAttempt(t), put([5, 5]), cant(0, 1))), /There is a way\./);
});

test('every: marks judged as a whole by That’s all, past the edge and between dots', () => {
  const p = byId('tropical-07'), fresh = freshAttempt(p);
  assert.deepEqual(judgeMarks(p.parameters, [{from: H([2, 4]), dir: 'W'}]), null);
  assert.doesNotMatch(board(p, fresh), /data-move="\{&quot;type&quot;:&quot;check/, 'no Check in a find-every puzzle');
  assert.match(board(p, fresh), /That’s all<\/button>/);
  assert.match(board(p, fresh), /type&quot;:&quot;all&quot;\}"[^>]*disabled/, 'That’s all is off with no marks');
  // Grid dots only: there are more.
  let a = fresh;
  for (const x of [2, 1, 0]) a = play(p, a, put([x, 4]), keep);
  const more = play(p, a, all);
  assert.match(board(p, more), /<p class="tr-told">There are more\.<\/p>/);
  assert.doesNotMatch(board(p, more), /\d+ (more|left)/, 'no count');
  assert.equal(move(p, more, all), null, 'That’s all stays off until the marks change');
  const back = undoWithCarry(p, more);
  assert.ok(back.board.lock && !back.board.said);
  assert.notEqual(board(p, back), board(p, more));
  assert.equal(move(p, back, all), null);
  // A ray the wrong way: this one doesn't work, with a line that misses.
  const wrongWay = play(p, fresh, mark({from: H([2, 4]), dir: 'E'}), all);
  assert.match(board(p, wrongWay), /This one doesn’t work\./);
  assert.match(board(p, wrongWay), /tr-off/);
  // A stretch and a ray: right, gaps between dots covered.
  const pieces = play(p, fresh, mark({from: H([2, 4]), to: H([1, 4])}), mark({from: H([1, 4]), dir: 'W'}), all);
  assert.ok(isSolved(p, pieces.board));
  // Keep and Drop at the junction.
  a = play(p, fresh, put([2, 4]), keep);
  assert.equal(move(p, a, keep), null);
  a = play(p, a, mark({from: H([2, 4]), dir: 'W'}));
  a = play(p, a, put([1, 4]), drop);
  assert.deepEqual(a.board.marks, [{from: H([2, 4])}], 'Drop takes off every mark at the junction');
  // Slanting on Hard, half-steps included.
  const h = byId('tropical-09');
  assert.ok(isSolved(h, play(h, freshAttempt(h), mark({from: H([5, 5]), dir: 'NE'}), all).board));
  assert.ok(!isSolved(h, play(h, freshAttempt(h), mark({from: H([2, 2]), to: H([5, 5])}), all).board), 'the stretch between the circles is wrong');
  // Strokes: the nearest of eight directions, a ray once past the frame.
  const q = h.parameters;
  assert.deepEqual(strokeOf(q, H([5, 5]), [11.2, 10.8]), {from: H([5, 5]), to: H([5.5, 5.5])});
  assert.deepEqual(strokeOf(q, H([5, 5]), [12.5, 12.5]), {from: H([5, 5]), to: H([6, 6])}, 'stops at the frame');
  assert.deepEqual(strokeOf(q, H([5, 5]), [13.5, 13]), {from: H([5, 5]), dir: 'NE'});
  assert.equal(strokeOf(q, H([5, 5]), [10.2, 10.1]), null);
  assert.deepEqual(snap(byId('tropical-07').parameters, [3.2, 6.9]), [4, 6]);
});

test('hints: the authored first hint, then moves with the reason before Can’t, quick in CPU time', () => {
  for (const p of tropical.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    assert.ok(view(p, {...a, hintLevel: 1}).includes(`<p>${p.hints[0]}</p>`), `${p.id}: the authored first hint on a fresh board`);
    assert.notEqual(nextHint(p, a).action.type, 'cant', `${p.id}: never Can’t first`);
    for (; !isSolved(p, a.board) && steps < 20; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      if (h.action.type === 'cant') assert.match(h.text, /^Only this junction’s line passes P and Q, and it misses R\./);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  const p = byId('tropical-01'), moved = play(p, freshAttempt(p), put([2, 2]));
  assert.equal(nextHint(p, moved).text, 'Put B below the ring.');
  assert.doesNotMatch(view(p, {...moved, hintLevel: 1}), /tr-hint/, 'no ring at the first level');
  assert.match(view(p, {...moved, hintLevel: 2}), /class="tr-ring tr-hint" cx="60" cy="-20"/, 'the ring marks the nearest place');
  assert.match(view(p, {...moved, hintLevel: 3}), /data-action="apply-hint"/);
  const r = byId('tropical-12');
  assert.equal(nextHint(r, freshAttempt(r)).text, 'Put the junction up and to the right of P and left of Q.');
  const e = byId('tropical-07');
  assert.equal(nextHint(e, play(e, freshAttempt(e), put([2, 4]))).text, 'Every junction further left works too, between dots and past the edge. Slide from P left, off the board.');
});

test('every puzzle renders its board, arms past the frame, one short objective; styles are scoped', () => {
  for (const p of tropical.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-tr-board/, `${p.id}: board`);
    assert.match(html, /data-mechanic-wire="tropical"/);
    if (p.band === 'playground') { assert.match(html, /tr-shared-live/); continue; }
    assert.ok(html.includes(p.visibleObjective), `${p.id}: objective shown`);
    assert.ok(p.visibleObjective.split(/[.!?]/).filter(Boolean).length === 1, `${p.id}: one sentence`);
    // Every arm ends in an arrowhead outside the frame.
    const q = p.parameters, heads = [...board(p, freshAttempt(p)).matchAll(/class="tr-head [^"]*" d="M(-?[\d.]+) (-?[\d.]+)/g)];
    assert.ok(heads.length >= 3);
    for (const [, x, y] of heads) assert.ok(+x < 5 * q.win[0] || +x > 5 * q.win[2] || -y < 5 * q.win[1] || -y > 5 * q.win[3], `${p.id}: arrowhead at ${x}, ${y} is past the frame`);
    assert.doesNotMatch(html, /rotate|turn the/i, `${p.id}: no rotate handle`);
    const done = board(p, solve(p));
    assert.match(done, /solved/, `${p.id}: solved view`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Three-arm lines/);
  const module = FAMILIES.find(m => m.id === 'tropical');
  assert.equal(module.family.symbol, '∟');
  assert.equal(FAMILIES.filter(m => m.family?.symbol === '∟').length, 1, 'a unique symbol');
  assert.doesNotMatch(module.focus, /tr-cant/, 'focus never lands on Can’t');
  assert.match(module.focus, /:not\(\[disabled\]\)/);
  // Every rule sits under the family's own root.
  const rules = css.replace(/\/\*[^]*?\*\//g, '').replace(/@media[^{]*\{/g, '').split('}').map(r => r.split('{')[0].trim()).filter(Boolean);
  for (const selectors of rules) for (const s of selectors.split(',')) assert.match(s.trim(), /^\[data-mechanic-wire="tropical"\]/, `scoped: ${s}`);
  // How to play opens with the mathematics and has the pictures.
  for (const p of tropical.puzzles) assert.match(p.controls, /^A line is three arms from one junction/);
  const help = M.help(byId('tropical-01'));
  assert.match(help, /data-mechanic-wire="tropical"/);
  assert.match(help, /P is on the line; Q is not\./);
  // Focus is restored to the live board, never to a How to play picture.
  assert.match(module.focus.split(',')[0], /^\[data-tr-board\]$/);
  assert.doesNotMatch(help, /data-tr-board/, 'the pictures are not the board');
  assert.match(board(byId('tropical-01'), freshAttempt(byId('tropical-01'))), /data-tr-board/);
});

test('the playground: two lines, both movable, what they share always drawn; never solved', () => {
  const pg = byId('tropical-playground');
  let a = freshAttempt(pg);
  assert.match(board(pg, a), /class="tr-ring good" cx="40" cy="-40"/, 'A and B share (4, 4)');
  a = play(pg, a, {type: 'put', which: 'b', at: H([4, 4])});
  assert.match(board(pg, a), /tr-shared good/, 'a row: a shared stretch');
  a = play(pg, a, {type: 'put', which: 'a', at: H([4, 4])});
  assert.match(board(pg, a), /They share everything\./);
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
  assert.ok(M.noHint(pg));
  assert.equal(move(pg, a, check), null);
  M.ui(pg, {chosen: 'a'});
  assert.match(board(pg, a), /A is chosen\./);
  M.reset(pg);
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const r = byId('tropical-12'), m = byId('tropical-01'), e = byId('tropical-07'), pg = byId('tropical-playground');
  const claimed = play(r, freshAttempt(r), put([5, 5]), cant(1, 2));
  const refused = play(m, freshAttempt(m), put([6, 4]), check);
  const locked = play(e, freshAttempt(e), put([2, 4]), keep, all);
  const toy = play(pg, freshAttempt(pg), {type: 'put', which: 'a', at: [0, 0]});
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[r.id]: claimed, [m.id]: refused, [e.id]: locked, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[r.id, claimed], [m.id, refused], [e.id, locked], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(r, solve(r)).board, freshAttempt(r).board);
  const forge = (id, b) => ({...store, profiles: [profile({[id]: {...freshAttempt(byId(id)), board: b}})]});
  const fr = freshAttempt(r).board;
  assert.throws(() => validateStore(forge(r.id, {...fr, done: true}), puzzles), 'a forged done');
  assert.throws(() => validateStore(forge(r.id, {...fr, at: H([5, 5]), tried: true, cert: [1, 2], done: true}), puzzles), 'a certificate in the wrong place');
  assert.throws(() => validateStore(forge(r.id, {...fr, cert: [0, 1], done: true}), puzzles), 'a certificate with no attempt');
  assert.throws(() => validateStore(forge(m.id, {...freshAttempt(m).board, at: H([6, 4]), done: true}), puzzles), 'a forged meet');
  assert.throws(() => validateStore(forge(e.id, {...freshAttempt(e).board, marks: [{from: H([2, 4])}], done: true}), puzzles), 'a forged shelf');
  assert.equal(validBoard(pg, {a: [0, 0], b: [0, 0], done: false}), false);
});

test('the satchel lists Three-arm lines with its playground and twelve puzzles', () => {
  const html = libraryView(profile({'tropical-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-tropical"/);
  assert.match(html, /data-id="tropical-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="tropical-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Three-arm lines, Easy, puzzle 2, completed/);
});
