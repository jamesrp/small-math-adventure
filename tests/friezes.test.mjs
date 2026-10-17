// Footprint borders: the four forms and the copy's moves, matches on the
// guide's witness borders, shortest slides and glides, forced half-turns,
// building and moving Fs, attempts before Can't, Fs in both rows before any
// claim, certificates right and wrong (gaps too), refusals kept with their
// board through edits, slides and Undo and cleared by Restart, hints (quick,
// in CPU time, and solving from fresh), saves, rendering and the family's
// symbol.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import * as F from '../dist/families/friezes/friezes.js';
import {FAMILIES, loadPack} from '../scripts/packs.mjs';

const friezes = JSON.parse(await readFile(new URL('../dist/families/friezes/friezes.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = F.friezeMechanics.friezes;
const byId = n => friezes.puzzles.find(p => p.id === (typeof n === 'number' ? `friezes-${String(n).padStart(2, '0')}` : n));
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const cellOf = text => text.split('/').map(row => [...row].map(ch => (ch === '·' ? null : 'AVHR'.indexOf(ch))));
const [A, V, H, R] = [0, 1, 2, 3];
const turn = {s: -1, f: -1}, flip = {s: 1, f: -1}, mirror = {s: -1, f: 1}, slide = {s: 1, f: 1};
const at = (g, u) => ({...g, u});

test('the guide’s witness borders: T, G, H, R and E', () => {
  const T = cellOf('A·/··'), G = cellOf('A·/·H'), Hb = cellOf('A·/H·'), Rb = cellOf('A·/·R'), E = cellOf('VA/RH');
  assert.equal(F.shortestOf(T, 'slide'), 2);
  assert.equal(F.shortestOf(T, 'glide'), null, 'T has no glide');
  assert.ok(F.fits(G, at(flip, 1)) && !F.fits(G, at(flip, 0)) && !F.fits(G, at(slide, 1)), 'G: the glide, not the flip, not the half slide');
  assert.equal(F.shortestOf(G, 'glide') * 2, F.shortestOf(G, 'slide'), 'G: the glide is half the slide');
  assert.ok(F.fits(Hb, at(flip, 0)) && F.matchStates(2, {move: 'turn'}).every(g => !F.fits(Hb, g)), 'H: the flip, no half-turn');
  assert.equal(F.shortestOf(Hb, 'glide'), 2, 'H: glides only by whole cells');
  assert.ok(F.centres(Rb).length > 0 && !F.fits(Rb, at(flip, 0)) && F.matchStates(2, {move: 'mirror'}).every(g => !F.fits(Rb, g)), 'R: half-turns, no flips');
  assert.deepEqual(F.centres(Rb).map(m2 => m2 / 2), [-3, -2, -1, 0, 1, 2, 3, 4, 5], 'R: a centre every place');
  assert.ok(F.fits(E, at(flip, 0)) && F.fits(E, at(mirror, 0)) && F.fits(E, at(turn, 0)), 'E: both flips and the half-turn at their crossing');
});

test('a glide done twice is a slide, and two crossing flips make a half-turn', () => {
  for (const P of [2, 3]) for (let n = 0; n < 5 ** (2 * P); n += 7) {
    const cell = [Array(P).fill(null), Array(P).fill(null)];
    let k = n;
    for (let i = 0; i < 2 * P; i++) { const v = k % 5; k = (k - v) / 5; cell[i % 2][i >> 1] = v === 4 ? null : v; }
    if (F.empty(cell)) continue;
    for (let u = -P; u <= P; u++) if (u && F.fits(cell, at(flip, u)) && Math.abs(2 * u) <= P) assert.ok(F.fits(cell, at(slide, 2 * u)), 'glide twice');
    if (F.fits(cell, at(flip, 0)) && F.fits(cell, at(mirror, 0))) assert.ok(F.fits(cell, at(turn, 0)), 'flip then flip across');
    const g = F.shortestOf(cell, 'glide'), s = F.shortestOf(cell, 'slide');
    if (g !== null && !F.fits(cell, at(flip, 0))) assert.equal(2 * g, s, 'the shortest glide is half the shortest slide');
  }
});

test('moves of the copy: slides, the three buttons, and what each counts as', () => {
  assert.equal(F.kindOf(F.HOME), 'home');
  assert.deepEqual(['slide', 'flip', 'glide', 'mirror', 'turn'].map(k => F.kindOf({slide: at(slide, 2), flip: at(flip, 0), glide: at(flip, -1), mirror: at(mirror, 3), turn: at(turn, 1)}[k])), ['slide', 'flip', 'glide', 'mirror', 'turn']);
  assert.deepEqual(F.keysOf(at(slide, -2)), ['slide', 'slide:2']);
  assert.deepEqual(F.keysOf(at(flip, 3)), ['glide', 'glide:3']);
  assert.deepEqual([F.keysOf(at(mirror, 0)), F.keysOf(at(mirror, 1))], [['mirror', 'mirror:0'], ['mirror']], 'the flip across the crossing line is its own attempt');
  // Image places: the turned copy of a 2-place cell at u = 0 turns round the cell's middle.
  assert.deepEqual(F.imageOf(2, at(turn, 0), 0, 0), {c: 1, r: 1});
  assert.equal(F.axis2Of(2, at(turn, 0)), 2);
  const p = byId(7);
  let a = freshAttempt(p);
  a = play(p, a, {type: 'slide', by: 2}, {type: 'flip'});
  assert.deepEqual(a.board.copy, at(flip, 2));
  assert.deepEqual(a.board.tried, ['glide', 'glide:2', 'slide', 'slide:2'], 'every attempt is kept');
  assert.equal(move(p, a, {type: 'turn'}), null, 'a button the puzzle doesn’t have');
  assert.equal(move(p, a, {type: 'slide', by: 3}), null, 'no further than a cell');
});

test('building: free places, moving Fs, and an edit starts the attempts again', () => {
  const p = byId(3);
  let a = play(p, freshAttempt(p), {type: 'put', c: 0, r: 0, form: A}, {type: 'put', c: 1, r: 1, form: H}, {type: 'flip'});
  assert.deepEqual(a.board.tried, ['flip']);
  a = play(p, a, {type: 'slide', by: 1});
  assert.deepEqual(a.board.shown, [0], 'the glide is shown');
  a = play(p, a, {type: 'clear', c: 1, r: 1});
  assert.deepEqual([a.board.tried, a.board.shown], [[], []], 'an edit clears what was shown and tried, and the copy where it is, missing, is no attempt');
  a = play(p, a, {type: 'put', c: 1, r: 1, form: H});
  assert.deepEqual([a.board.tried, a.board.shown], [['glide', 'glide:1'], [0]], 'a match the copy makes after an edit is shown, with its attempt');
  assert.equal(F.canClaim(p.parameters, a.board, 1), false, 'the flip alone is tried again before Can’t');
  const m = byId(4);
  let b = play(m, freshAttempt(m), {type: 'shift', from: [0, 0], to: [1, 0]});
  assert.equal(F.inventory(b.board.cell), F.inventory(m.parameters.cell));
  assert.equal(move(m, b, {type: 'put', c: 0, r: 0, form: A}), null, 'moving Fs only');
  assert.equal(move(m, b, {type: 'shift', from: [1, 0], to: [0, 1]}), null, 'not onto an F');
});

test('Can’t comes after the attempt, and the certificate can be wrong', () => {
  const p = byId(3);
  let a = play(p, freshAttempt(p), {type: 'put', c: 0, r: 0, form: A}, {type: 'put', c: 1, r: 1, form: H});
  assert.equal(F.canClaim(p.parameters, a.board, 1), false, 'no claim before the flip is tried');
  assert.equal(move(p, a, {type: 'cant', goal: 1, pick: [[0, 0], [0, 1]]}), null);
  a = play(p, a, {type: 'flip'});
  assert.equal(F.judgeSpecific(a.board.cell, {type: 'cant', move: 'flip'}, [0, 0], [1, 1]), 'there', 'the flip doesn’t take it there');
  const wrong = play(p, a, {type: 'cant', goal: 1, pick: [[0, 0], [1, 1]]});
  assert.deepEqual(wrong.board.refused, [{goal: 1, pick: [[0, 0], [1, 1]], why: 'there', cell: cellOf('A·/·H')}]);
  assert.match(view(p, wrong), /It doesn’t land there\./);
  assert.equal(move(p, wrong, {type: 'cant', goal: 1, pick: [[0, 0], [0, 1]]}), null, 'the refusal stands');
  // A first tap on a gap is judged too.
  const gap = play(p, a, {type: 'cant', goal: 1, pick: [[1, 0], [1, 1]]});
  assert.equal(gap.board.refused[0].why, 'gap');
  assert.match(view(p, gap), /There’s no F there\./);
  // Undo keeps it; so does changing the border and changing it back.
  let back = undo(wrong);
  back = {...back, board: mech.carry(p, wrong.board, back.board)};
  assert.ok(validBoard(p, back.board) && back.board.refused.length === 1, 'Undo keeps the refusal');
  assert.doesNotMatch(view(p, back), /It doesn’t land there/, 'Undo takes away the words');
  assert.match(view(p, back), /A claim was refused on this border\./, 'and says why Can’t is off');
  const round = play(p, wrong, {type: 'put', c: 1, r: 0, form: V}, {type: 'clear', c: 1, r: 0}, {type: 'flip'}, {type: 'flip'});
  assert.ok(round.board.tried.includes('flip') && F.canClaim(p.parameters, round.board, 1) === false, 'back on the same border, with the flip tried again, Can’t stays off');
  // Restart is the way to clear it.
  const again = {...restart(p, wrong), board: mech.carryOnRestart(p, wrong.board, freshAttempt(p).board)};
  assert.deepEqual(again.board.refused, [], 'Restart clears refusals');
  // Right: the as-drawn F and the gap below it.
  const right = play(p, a, {type: 'slide', by: 1}, {type: 'cant', goal: 1, pick: [[0, 0], [0, 1]]});
  assert.ok(isSolved(p, right.board));
  assert.match(view(p, right), /class="fz-ring bad"/, 'the gap is ringed');
});

test('no half-turn anywhere: one F and the form it becomes', () => {
  const p = byId(6);
  let a = play(p, freshAttempt(p), {type: 'put', c: 0, r: 0, form: A}, {type: 'put', c: 0, r: 1, form: H}, {type: 'flip'}, {type: 'flip'}, {type: 'turn'});
  assert.deepEqual(a.board.shown, [0]);
  assert.equal(F.judgeFamily(a.board.cell, p.parameters.goals[1], [0, 0], V), 'form', 'turned, an A is not flipped across');
  assert.equal(F.judgeFamily(a.board.cell, p.parameters.goals[1], [0, 0], R), 'ok');
  const wrong = play(p, a, {type: 'cant', goal: 1, pick: [[0, 0], V]});
  assert.match(view(p, wrong), /That doesn’t rule out every half-turn\./);
  const b = play(p, a, {type: 'put', c: 1, r: 1, form: R});
  assert.equal(F.judgeFamily(b.board.cell, p.parameters.goals[1], [0, 0], R), 'present', 'with a half-turned F below, the A no longer shows it');
  const present = play(p, b, {type: 'turn'}, {type: 'turn'}, {type: 'cant', goal: 1, pick: [[0, 0], R]});
  assert.match(view(p, present), /That doesn’t rule out every half-turn\./, 'one text whether the F or the form was wrong');
  // Fs in one row: a half-turn round a point of that row's own line can
  // match, so no claim is made there.
  let one = play(p, freshAttempt(p), {type: 'put', c: 0, r: 0, form: A}, {type: 'put', c: 1, r: 0, form: R}, {type: 'turn'});
  assert.ok(one.board.tried.includes('turn') && F.claimTrue(one.board.cell, p.parameters.goals[1]) === false);
  assert.equal(F.canClaim(p.parameters, one.board, 1), false, 'no claim with a row empty');
  assert.equal(move(p, one, {type: 'cant', goal: 1, pick: [[0, 0], R]}), null);
  assert.match(view(p, one), /A border needs an F in each row\./);
});

test('shortest: the nearest F of the form the move needs, as far as the copy went', () => {
  const p = byId(7);
  let a = play(p, freshAttempt(p), {type: 'slide', by: 4});
  const near = play(p, a, {type: 'shortest', goal: 0, pick: [[0, 0], [4, 0]]});
  assert.ok(near.board.done.some(d => d.goal === 0));
  const far = play(p, a, {type: 'shortest', goal: 0, pick: [[0, 0], [1, 0]]});
  assert.equal(far.board.refused[0].why, 'class', 'a flipped-across F can’t be where an A lands');
  assert.match(view(p, far), /It can’t land there\./);
  assert.equal(play(p, a, {type: 'shortest', goal: 0, pick: [[0, 0], [2, 0]]}).board.refused[0].why, 'class', 'nor can a gap');
  // A refused Shortest stays with the copy where it was: away and back, it
  // is off again; the other way, it is on.
  assert.equal(move(p, far, {type: 'shortest', goal: 0, pick: [[0, 0], [4, 0]]}), null);
  const backAgain = play(p, far, {type: 'slide', by: -1}, {type: 'slide', by: 1});
  assert.equal(F.canClaim(p.parameters, backAgain.board, 0), false, 'slid away and back, the refusal stands');
  const moved = play(p, far, {type: 'slide', by: -8});
  assert.ok(moved.board.refused.length === 1 && F.canClaim(p.parameters, moved.board, 0), 'slid the other way, Shortest is on');
  const twice = play(p, moved, {type: 'shortest', goal: 0, pick: [[0, 0], [1, 0]]});
  assert.equal(nextHint(p, twice).type, 'stuck', 'refused both ways: nothing to apply');
  assert.equal(nextHint(p, twice).text, F.STUCK);
  // The glide: half the slide.
  let g = play(p, near, {type: 'flip'}, {type: 'slide', by: -2});
  assert.equal(g.board.copy.u, 2);
  g = play(p, g, {type: 'shortest', goal: 1, pick: [[0, 0], [2, 1]]});
  assert.ok(isSolved(p, g.board));
  const p11 = byId(11), c11 = p11.parameters.cell;
  assert.equal(F.judgeShortest(c11, {type: 'shortest', move: 'slide'}, [0, 0], [2, 0], 6), 'short', 'two As 2 apart, but the slide is 6');
  assert.equal(F.judgeShortest(c11, {type: 'shortest', move: 'slide'}, [4, 0], [-2, 0], 6), 'ok', 'the flipped-across F is alone in its row');
});

test('two crossing flips: tap the point the half-turn goes round', () => {
  const p = byId(10);
  let a = freshAttempt(p);
  for (const [c, r, form] of [[1, 0, V], [2, 0, A], [1, 1, R], [2, 1, H]]) a = play(p, a, {type: 'put', c, r, form});
  assert.equal(move(p, a, {type: 'centre', goal: 2, pick: 4}), null, 'the flips first');
  a = play(p, a, {type: 'flip'}, {type: 'flip'}, {type: 'mirror'});
  assert.deepEqual(a.board.shown, [0, 1]);
  const both = play(p, a, {type: 'flip'});
  assert.doesNotMatch(view(p, both), /turned halfway/, 'the copy flipped both ways is not said to be turned');
  assert.match(view(p, both), /flipped over the middle line and flipped across\. It matches\./);
  mech.reset(p);
  mech.ui(p, {claim: 2});
  const choosing = view(p, a, true);
  assert.equal((choosing.match(/class="fz-cand"/g) || []).length, (choosing.match(/data-fz-point=/g) || []).length, 'every point is drawn as a choice');
  assert.equal((choosing.match(/data-fz-point=/g) || []).length, 15);
  const wrong = play(p, a, {type: 'centre', goal: 2, pick: 3});
  assert.match(view(p, wrong), /That turn doesn’t match\./);
  assert.match(view(p, wrong), /fz-point bad/);
  const right = play(p, a, {type: 'centre', goal: 2, pick: 4});
  assert.ok(isSolved(p, right.board));
  assert.ok(play(p, a, {type: 'centre', goal: 2, pick: 8}).completed, 'another centre, half a cell along, works too');
});

test('hints: quick in CPU time, first hint from the pack, and a solve from fresh', () => {
  for (const p of friezes.puzzles.filter(x => x.parameters.mode === 'puzzle')) {
    let a = freshAttempt(p);
    mech.reset(p);
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    assert.ok(view(p, {...a, hintLevel: 1}).includes(esc(p.hints[0])), `${p.id}: the first hint is the pack’s`);
    for (let k = 0; k < 40 && !isSolved(p, a.board); k++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      assert.equal(h.type, 'move', `${p.id}: a move`);
      if (k === 0) assert.doesNotMatch(h.text, /^Press/, `${p.id}: never “Press …” first`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  assert.equal(mech.noHint(byId('friezes-playground')), true);
});

test('saves: forged claims, attempts and borders are refused', () => {
  const p = byId(9), b = freshAttempt(p).board;
  assert.ok(validBoard(p, b));
  assert.equal(validBoard(p, {...b, done: [{goal: 1, pick: [[0, 0], [0, 1]]}]}), false, 'a Can’t with no attempt');
  assert.equal(validBoard(p, {...b, tried: ['flip'], done: [{goal: 2, pick: [[0, 0], [2, 0]]}]}), false, 'a claim that the 2-place slide fails when it matches');
  assert.equal(validBoard(p, {...b, cell: cellOf('AA··/··H·')}), false, 'an F lost');
  assert.equal(validBoard(p, {...b, last: {goal: 1, ok: true}}), false, 'a claim said right that wasn’t made');
  const q = byId(2), c = freshAttempt(q).board;
  assert.equal(validBoard(q, {...c, copy: at(slide, 2), tried: ['slide', 'slide:2'], done: [{goal: 0, pick: [[0, 0], [2, 0]]}]}), true, 'a right Shortest');
  assert.equal(validBoard(q, {...c, copy: at(slide, 4), tried: ['slide', 'slide:4'], refused: [{goal: 0, pick: [[0, 0], [2, 0]], why: 'nearer', cell: c.cell, copy: at(slide, 4)}], last: null}), false, 'a refusal with the wrong reason');
  assert.equal(validBoard(q, {...c, copy: at(slide, 4), tried: ['slide', 'slide:4'], refused: [{goal: 0, pick: [[0, 0], [4, 0]], why: 'nearer', cell: c.cell, copy: at(slide, 4)}], last: null}), true, 'a refusal judged again to its reason');
  assert.equal(validBoard(q, {...c, done: [{goal: 0, pick: [[0, 0], [2, 0]]}]}), false, 'a Shortest with the copy never moved');
  assert.equal(validBoard(q, {...c, copy: at(slide, 4), tried: ['slide', 'slide:4'], done: [{goal: 0, pick: [[0, 0], [2, 0]]}]}), false, 'a Shortest without the 2-place slide tried');
  const r = byId(3), d = freshAttempt(r).board;
  assert.equal(validBoard(r, {...d, cell: cellOf('A·/·H'), copy: at(flip, 0), tried: ['flip'], shown: [0]}), false, 'a glide shown with only the flip tried');
});

test('render: one board, goal chips with their claims, tools, and no empty containers', () => {
  const p1 = byId(1), v1 = view(p1, freshAttempt(p1));
  assert.match(v1, /data-mechanic-wire="friezes"/);
  assert.doesNotMatch(v1, /fz-goals|fz-tools/, 'one slide to find: no chips, no buttons');
  assert.doesNotMatch(v1, /undefined|NaN/);
  const p3 = byId(3), a3 = freshAttempt(p3), v3 = view(p3, a3);
  assert.match(v3, /class="fz-goal no"/, 'the crossed flip chip');
  assert.match(v3, />Can’t</);
  assert.match(v3, /aria-label="as-drawn F"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="as-drawn F"/, 'the as-drawn F is chosen');
  assert.equal((v3.match(/data-fz-slot=/g) || []).length, 4, 'every place in the cell is a tap target');
  // Claim mode: every place in the window, the copy hidden, the prompt.
  let a = play(p3, a3, {type: 'put', c: 0, r: 0, form: A}, {type: 'put', c: 1, r: 1, form: H}, {type: 'flip'});
  mech.reset(p3);
  mech.ui(p3, {claim: 1});
  const claiming = view(p3, a, true);
  const {from, to} = F.windowOf(2);
  assert.equal((claiming.match(/data-fz-slot=/g) || []).length, 2 * (to - from));
  const order = [...claiming.matchAll(/data-fz-slot="(-?\d+),(\d)"/g)].map(m => `${m[1]},${m[2]}`);
  assert.deepEqual(order.slice(0, 2), [`${from},0`, `${from + 1},0`], 'row by row: the next target after an F is beside it, not below');
  assert.match(claiming, /Tap an F, then where it lands\./);
  assert.match(claiming, /data-fz-copy><\/g>/, 'the copy is hidden while pointing');
  const p10 = byId(10);
  assert.match(view(p10, freshAttempt(p10)), /class="fz-cross"/, 'the crossing line');
  const pg = byId('friezes-playground'), vg = view(pg, freshAttempt(pg));
  assert.match(vg, /aria-label="Repeat every 4 places"/);
  assert.doesNotMatch(vg, /fz-goals/);
});

test('the family: a name, a unique symbol, How to play that opens with the mathematics', () => {
  const symbols = FAMILIES.filter(m => m.family).map(m => m.family.symbol);
  assert.equal(symbols.filter(s => s === 'Ⅎ').length, 1);
  assert.equal(new Set(symbols).size, symbols.length, 'every symbol unique');
  for (const p of friezes.puzzles) {
    assert.match(p.controls, /^A border repeats its framed cell forever both ways\./);
    assert.ok(p.visibleObjective.length < 150);
  }
  assert.deepEqual(friezes.puzzles.slice(1).map(p => p.difficulty_level), ['easy', 'easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard']);
});
