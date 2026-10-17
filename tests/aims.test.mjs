// Mirror Couriers bounce words (dist/families/aims/): exact folding of shots
// in the square, the wide room and the 60° rhombus; corner hits; which words
// a rectangle makes; the puzzles' answers; Launch as the move, with only the
// aim drawn before it; claims after a launch that starts the word, Check with
// its square evidence and letter pairs, and their refusals through Undo; Can't
// and Undo leaving the board live; hints and their speed; the board's markup;
// and the group in the Mirror Couriers library.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {ROOMS, fold, isAim, apply, compose, ID, rectangleWord, roomAims} from '../dist/families/aims/fold.js';
import aimsModule, {answers, certificate, judge, seams, obstruction, step, frameAims, squareShot} from '../dist/families/aims/aims.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack, FAMILIES} from '../scripts/packs.mjs';
import {simulate, lpRectangle, cutting} from '../scripts/validate-aims.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/aims/aims.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, JSON.stringify(action)); return next; };
const undoApp = (p, a) => ({...undo(a), board: mechanicFor(p).carry(p, a.board, undo(a).board)});
const cpu = f => { const t = process.cpuUsage(), out = f(), u = process.cpuUsage(t); return {out, ms: (u.user + u.system) / 1000}; };

test('a square shot spells the walls it crosses, in order', () => {
  // From the centre: D at x = 10, C at y = 10, B at x = 20 (the copy's image of B).
  const r = fold('square', [5, 5], [25, 15]);
  assert.equal(r.word, 'DCB');
  assert.deepEqual(r.crossings.map(c => c.at[0] / c.at[1]), [0.25, 0.5, 0.75]);
  assert.equal(r.corner, null);
  assert.equal(r.inside, true);
  assert.equal(fold('square', [5, 5], [5, -5]).word, 'A', 'straight down crosses A once');
  assert.equal(fold('square', [5, 5], [5, -15]).word, 'AC', 'and then the copy’s image of C');
  assert.equal(fold('square', [5, 5], [5, 5]).word, '', 'a shot that does not move');
  // The worksheet’s Problem 1 table: direction (−2, 3) from the centre gives CBA.
  assert.equal(fold('square', [5, 5], [-7, 23]).word, 'CBA');
});

test('a shot through a corner stops there', () => {
  const r = fold('square', [5, 5], [15, 15]);
  assert.equal(r.corner.at[0] / r.corner.at[1], 0.5);
  assert.equal(r.word, '');
  const hit = fold('square', [1, 1], [21, 21]).corner;
  assert.equal(hit.at[0] / hit.at[1], 9 / 20, 'through (10, 10)');
  const near = fold('square', [5, 5], [17, 15]);
  assert.equal(near.corner, null, 'just under the corner');
  assert.equal(near.word, 'DC');
});

test('the rhombus mirrors are whole-number maps that fix their walls', () => {
  const rh = ROOMS.rhombus;
  for (const w of rh.walls) {
    assert.deepEqual(compose(w.mirror, w.mirror), ID, `${w.letter} twice is nothing`);
    for (const c of [rh.corners[w.from], rh.corners[w.to]]) assert.deepEqual(apply(w.mirror, c), c, `${w.letter} fixes its ends`);
    for (const pt of roomAims('rhombus')) assert.ok(isAim('rhombus', apply(w.mirror, pt)), 'aims go to aims');
  }
  assert.equal(roomAims('rhombus').length, 50, 'one aim in each of the 50 small triangles');
  assert.equal(roomAims('square').length, 25);
  assert.equal(roomAims('wide').length, 25);
});

test('the mechanic agrees with a Euclidean billiard in Q(√3) and with the cutting sequence', () => {
  let n = 0;
  for (const s of roomAims('rhombus').filter((_, i) => i % 7 === 0)) for (const e of frameAims('rhombus', [-48, 50, -18, 18]).filter((_, i) => i % 5 === 0)) {
    const m = fold('rhombus', s, e), r = simulate('rhombus', s, e);
    assert.equal(m.word, r.word, `${s}→${e}`); assert.equal(Boolean(m.corner), Boolean(r.corner)); n++;
  }
  assert.ok(n > 400);
  for (const s of roomAims('square')) for (const e of [[23, 17], [-19, 11], [7, -33], [-5, 35], [15, 15]]) {
    const m = fold('square', s, e), c = cutting(10, 10, s, e), r = simulate('square', s, e);
    assert.equal(m.word, c.word); assert.equal(Boolean(m.corner), c.corner); assert.equal(m.word, r.word);
  }
});

test('rectangle words: each kind takes turns and the order is balanced', () => {
  for (const w of ['', 'A', 'AC', 'ACA', 'DCB', 'ACB', 'ABCD', 'BDB', 'ABDC', 'CBA']) assert.equal(rectangleWord(w), true, w);
  for (const w of ['ABA', 'BAB', 'CDC', 'AA', 'CABA', 'ACDB', 'BDCA', 'CABD', 'DBAC', 'ACBD']) assert.equal(rectangleWord(w), false, w);
  for (const w of ['ACB', 'ACDB', 'ACBD', 'ACBDA', 'ADCBA', 'ABCDAB']) assert.equal(lpRectangle(w), rectangleWord(w), `linear program agrees on ${w}`);
  assert.deepEqual(obstruction('ABA'), [0, 2]);
  assert.deepEqual(obstruction('CABA'), [1, 3]);
  assert.equal(obstruction('ACDB'), null, 'ACDB breaks balance, not turns');
});

test('every puzzle’s answer count, and a witness that solves', () => {
  const counts = {'aims-01': 10, 'aims-02': 20, 'aims-03': 34, 'aims-04': 3, 'aims-05': 0, 'aims-06': 1172, 'aims-07': 20, 'aims-08': 64, 'aims-09': 3, 'aims-10': 0, 'aims-11': 45};
  for (const p of pack.puzzles) {
    assert.equal(answers(p.parameters).length, counts[p.id], p.id);
    let a = freshAttempt(p);
    if (p.solution.possible === false) {
      a = play(p, a, nextHint(p, a).action);
      a = play(p, a, {type: 'claim', walls: p.solution.walls});
    } else {
      a = play(p, a, {type: 'launch', start: p.solution.start, end: p.solution.end});
      if (p.parameters.mode === 'design') a = play(p, a, {type: 'check'});
      if (p.solution.pair) a = play(p, a, {type: 'pair', tiles: p.solution.pair});
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
  assert.deepEqual(pack.puzzles.map(p => p.difficulty_level), ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard']);
});

test('a launch is one move, and Undo takes it back', () => {
  const p = byId('aims-01'), fresh = freshAttempt(p), L = end => ({type: 'launch', start: [5, 5], end});
  const a = play(p, fresh, L([13, 11]));
  assert.equal(a.moves, 1);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(undo(a).board, fresh.board);
  // A corner hit is decided at the launch, and costs one.
  const c = play(p, fresh, L([15, 15]));
  assert.equal(c.moves, 1);
  assert.ok(fold('square', [5, 5], [15, 15]).corner && !isSolved(p, c.board));
  assert.match(mechanicFor(p).render(p, c), /That shot hits a corner\./);
  assert.equal(move(p, c, L([15, 15])), null, 'the same launch again');
  assert.equal(move(p, fresh, {type: 'launch', start: [7, 5], end: [13, 11]}), null, 'a fixed start stays');
  assert.equal(move(p, fresh, {type: 'aim', end: [13, 11]}), null, 'aiming is not a move');
});

test('while aiming only the straight aim is drawn; Launch draws the rest', () => {
  for (const id of ['aims-01', 'aims-03', 'aims-07']) {
    const p = byId(id), m = mechanicFor(p), q = p.parameters, end = p.solution.end;
    m.reset(p);
    const fresh = freshAttempt(p);
    m.render(p, fresh);
    m.ui(p, {aim: {start: q.start, end}});
    const html = m.render(p, fresh);
    assert.match(html, /class="am-aim"/, `${id}: the aim line`);
    assert.match(html, /class="am-end aim"/, `${id}: the snapped end`);
    for (const drawn of ['am-hit', 'am-shot"', 'am-wall crossed', 'am-copy passed', 'am-fold-path']) assert.ok(!html.slice(html.indexOf('data-am-board')).includes(drawn), `${id}: no ${drawn} while aiming`);
    assert.match(html, /aria-label="Not launched"/, `${id}: no word while aiming`);
    if (q.room !== 'rhombus') assert.equal((html.match(/class="am-lab/g) || []).length > 4, true, `${id}: the copies and letters stay`);
    else assert.equal((html.slice(html.indexOf('data-am-board')).match(/class="am-copy/g) || []).length, 1, `${id}: the rhombus room alone`);
    const launch = html.match(/<button[^>]*am-launch[^>]*>/)[0];
    assert.doesNotMatch(launch, /disabled/);
    assert.deepEqual(JSON.parse(launch.match(/data-move='([^']*)'/)[1]), {type: 'launch', start: q.start, end});
    const a = play(p, fresh, {type: 'launch', start: q.start, end}), after = m.render(p, a);
    assert.match(after, /class="am-hit/); assert.match(after, /am-wall crossed/); assert.match(after, /class="am-fold-path"/);
    assert.doesNotMatch(after, /class="am-aim"/);
  }
});

test('Can’t: after a launch that starts the word, the two A walls on one line, one refusal kept through Undo', () => {
  const p = byId('aims-05'), q = p.parameters, fresh = freshAttempt(p), cert = certificate(q).map(s => s.id).sort(), L = end => ({type: 'launch', start: [5, 5], end});
  assert.deepEqual(cert, ['-10,0,0,0', '0,0,10,0'], 'the room’s A wall and the A wall after A, B');
  assert.equal(move(p, fresh, {type: 'claim', walls: cert}), null, 'not on a fresh board');
  const justA = play(p, fresh, L([3, -7]));
  assert.equal(fold('square', [5, 5], [3, -7]).word, 'A');
  assert.equal(move(p, justA, {type: 'claim', walls: cert}), null, 'not before a launch gets as far as A, B');
  assert.match(mechanicFor(p).render(p, justA), /class="secondary am-cant"[^>]*disabled/);
  const shot = play(p, fresh, L([-1, -9]));
  assert.equal(fold('square', [5, 5], [-1, -9]).word, 'AB');
  assert.doesNotMatch(mechanicFor(p).render(p, shot), /class="secondary am-cant"[^>]*disabled/);
  // Two A walls on one line, but not the ones ABA needs: the same refusal.
  const wrong = play(p, shot, {type: 'claim', walls: ['0,0,10,0', '10,0,20,0']});
  assert.deepEqual(wrong.board.refused, {walls: ['0,0,10,0', '10,0,20,0'], why: 'walls', shown: true});
  assert.match(mechanicFor(p).render(p, wrong), /Those two don’t stop ABA\./);
  assert.equal(move(p, wrong, {type: 'claim', walls: cert}), null, 'one claim per launch');
  const back = undoApp(p, wrong);
  assert.equal(back.board.refused.shown, false);
  assert.doesNotMatch(mechanicFor(p).render(p, back), /don’t stop/, 'Undo hides the words');
  assert.equal(move(p, back, {type: 'claim', walls: cert}), null, 'and keeps the lock');
  const line = play(p, shot, {type: 'claim', walls: ['0,0,0,10', '0,0,10,0']});
  assert.equal(line.board.refused.why, 'line');
  assert.match(mechanicFor(p).render(p, line), /Those two don’t stop ABA\./, 'a rectangle refusal does not say which test failed');
  // A new launch clears the refusal; the right pair solves and draws the line.
  const again = play(p, wrong, L([-3, -9]));
  assert.equal(again.board.refused, null);
  const right = play(p, again, {type: 'claim', walls: cert});
  assert.ok(isSolved(p, right.board));
  const html = mechanicFor(p).render(p, right);
  assert.match(html, /class="am-proof"/); assert.equal((html.match(/class="am-proved"/g) || []).length, 2);
  assert.match(html, /Both A walls lie on one line\./);
  // In the rhombus the same two walls are not on one line.
  const r = byId('aims-06'), rq = r.parameters, rs = play(r, freshAttempt(r), {type: 'launch', start: [7, 7], end: [4, -17]});
  assert.equal(fold('rhombus', [7, 7], [4, -17]).word, 'AB');
  const rc = certificate(rq).map(s => s.id).sort();
  assert.equal(judge(rq, rc), 'line');
  assert.match(mechanicFor(r).render(r, play(r, rs, {type: 'claim', walls: rc})), /Not on one line\./);
  const list = seams(rq, rs.board), level = list.filter(s => s.a[1] === s.b[1]);
  const pair = level.flatMap((s, i) => level.slice(i + 1).map(t => [s, t])).find(([s, t]) => judge(rq, [s.id, t.id].sort()) === 'walls');
  if (pair) assert.match(mechanicFor(r).render(r, play(r, rs, {type: 'claim', walls: pair.map(s => s.id).sort()})), /Those two don’t stop ABA\./, 'a collinear rhombus pair');
  assert.ok(list.length >= 8);
});

test('after Can’t and Undo the board still answers taps', () => {
  const p = byId('aims-05'), m = mechanicFor(p), fresh = freshAttempt(p);
  m.reset(p);
  const shot = play(p, fresh, {type: 'launch', start: [5, 5], end: [-1, -9]});
  m.render(p, shot);
  m.ui(p, {claiming: true});
  assert.match(m.render(p, shot), /am-pick/, 'Can’t opens the walls');
  const back = undo(shot);
  let html = m.render(p, back);
  assert.doesNotMatch(html, /am-pick|Tap two walls/, 'Undo closes them');
  m.ui(p, {claiming: true});
  html = m.render(p, back);
  assert.doesNotMatch(html, /am-pick/, 'Can’t can’t open with nothing launched');
  // A stale Can’t (the board changed under it) is dropped too.
  m.render(p, shot); m.ui(p, {claiming: true});
  const other = play(p, shot, {type: 'launch', start: [5, 5], end: [3, -7]});
  assert.doesNotMatch(m.render(p, other), /am-pick/);
  m.ui(p, {aim: {start: [5, 5], end: [-3, -9]}});
  assert.match(m.render(p, other), /class="am-aim"/, 'aiming still works');
});

test('Check: a refusal shows a square shot and stays until the word changes; a right one asks why', () => {
  const p = byId('aims-08'), q = p.parameters, fresh = freshAttempt(p), L = end => ({type: 'launch', start: [7, 7], end});
  assert.equal(move(p, fresh, {type: 'check'}), null, 'nothing to check');
  const [e1, e2] = frameAims('rhombus', q.frame).filter(e => { const r = fold('rhombus', [7, 7], e); return !r.corner && r.inside && r.word === 'A'; });
  const no = play(p, play(p, fresh, L(e1)), {type: 'check'});
  assert.deepEqual(no.board.refused, {word: 'A', why: 'rect', shown: true});
  const html = mechanicFor(p).render(p, no);
  assert.match(html, /A square makes it too\./); assert.match(html, /class="am-mini"[^>]*aria-label="A square shot with the word A"/);
  const sq = squareShot('A');
  assert.equal(simulate('square', sq.start, sq.end).word, 'A');
  const same = play(p, no, L(e2));
  assert.deepEqual(same.board.refused, no.board.refused, 'another shot with the same word');
  assert.equal(move(p, same, {type: 'check'}), null, 'Check stays off for the same word');
  const aa = frameAims('rhombus', q.frame).find(e => fold('rhombus', [7, 7], e).word === 'AD' && !fold('rhombus', [7, 7], e).corner);
  const changed = play(p, same, L(aa));
  assert.equal(changed.board.refused, null);
  assert.ok(move(p, changed, {type: 'check'}), 'a new word opens Check');
  const back = undoApp(p, no);
  assert.equal(back.board.refused.shown, false);
  assert.equal(move(p, back, {type: 'check'}), null);
  // ABAD: a right Check, then the two A’s (not A and D, not B and D).
  const abad = answers(q).find(w => fold('rhombus', w.start, w.end).word === 'ABAD');
  const checked = play(p, play(p, back, L(abad.end)), {type: 'check'});
  assert.ok(checked.board.checked && !isSolved(p, checked.board));
  assert.match(mechanicFor(p).render(p, checked), /Tap the two letters that show why\./);
  assert.equal((mechanicFor(p).render(p, checked).match(/data-am-tile=/g) || []).length, 4);
  mechanicFor(p).ui(p, {aim: {start: [7, 7], end: e1}});
  const aimingHtml = mechanicFor(p).render(p, checked);
  assert.match(aimingHtml, /class="am-aim"/);
  assert.equal((aimingHtml.match(/data-am-tile=/g) || []).length, 4, 'the letters stay while aiming elsewhere');
  const bad = play(p, checked, {type: 'pair', tiles: [1, 3]});
  assert.equal(bad.board.refused.why, 'pair');
  assert.match(mechanicFor(p).render(p, bad), /Those two don’t show why\./);
  assert.equal(move(p, bad, {type: 'pair', tiles: [0, 2]}), null, 'one pair per word');
  const good = play(p, checked, {type: 'pair', tiles: [0, 2]});
  assert.ok(isSolved(p, good.board));
  assert.match(mechanicFor(p).render(p, good), /the two A walls would lie on one line/);
  assert.match(mechanicFor(p).render(p, good), /aria-label="In the square’s copies the two A walls of ABA lie on one line"/);
  // All four walls: ABA is refused for its walls, ACDB is drawn.
  const four = byId('aims-11'), f = freshAttempt(four);
  const notFour = frameAims('rhombus', four.parameters.frame).find(e => { const r = fold('rhombus', [7, 7], e); return !r.corner && r.inside && r.word === 'ABA'; });
  const refused = play(four, play(four, f, {type: 'launch', start: [7, 7], end: notFour}), {type: 'check'});
  assert.equal(refused.board.refused.why, 'four');
  assert.match(mechanicFor(four).render(four, refused), /Use each wall once\./);
  const acdb = play(four, play(four, f, {type: 'launch', start: [7, 7], end: [46, -38]}), {type: 'check'});
  assert.ok(isSolved(four, acdb.board));
  assert.match(mechanicFor(four).render(four, acdb), /A to C is steeper than the diagonal and D to B is flatter\./);
  assert.match(mechanicFor(four).render(four, acdb), /class="am-diag"/);
});

test('hints solve every puzzle, quickly, and never open with Can’t', () => {
  for (const p of pack.puzzles) {
    assert.doesNotMatch(p.hints[0], /Can’t/);
    let a = freshAttempt(p), steps = 0, sawReason = false;
    for (; !isSolved(p, a.board) && steps < 10; steps++) {
      const {out: h, ms} = cpu(() => nextHint(p, a));
      assert.ok(ms < 100, `${p.id}: a quick hint (${ms} ms CPU)`);
      assert.equal(h.type, 'move');
      if (h.action.type === 'claim') { assert.ok(sawReason || /lie on one line/.test(h.text), `${p.id}: the reason comes with the claim`); assert.ok(steps > 0, `${p.id}: Can’t is not the first move`); }
      if (/lie on one line/.test(h.text)) sawReason = true;
      a = play(p, a, h.action);
      const {ms: tap} = cpu(() => mechanicFor(p).render(p, {...a, hintLevel: 2}));
      assert.ok(tap < 100, `${p.id}: a quick redraw (${tap} ms CPU)`);
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('the board markup: no highlighted taps, focusable walls after Can’t, one objective', () => {
  const p = byId('aims-10'), m = mechanicFor(p), fresh = freshAttempt(p);
  let html = m.render(p, fresh);
  assert.match(html, /class="secondary am-cant"[^>]*disabled>Can’t/);
  assert.doesNotMatch(html, /\b\d+ of \d+\b/, 'no counter');
  const a = play(p, fresh, {type: 'launch', start: [10, 5], end: [-2, 25]});
  assert.equal(fold('wide', [10, 5], [-2, 25]).word, 'CAB');
  m.render(p, a);
  m.ui(p, {claiming: true});
  html = m.render(p, a);
  const picks = html.match(/class="am-pick[^"]*"/g) || [];
  assert.equal(picks.length, seams(p.parameters, a.board).length, 'every wall can be tapped');
  assert.ok(picks.every(c => c === 'class="am-pick"'), 'none is marked before it is tapped');
  assert.match(html, /tabindex="0" role="button" data-seam=/);
  assert.match(html, /Tap two walls\./);
  const third = seams(p.parameters, a.board)[3];
  m.ui(p, {pick: third.id});
  assert.equal((m.render(p, a).match(/am-pick picked/g) || []).length, 1);
  assert.match(m.render(p, a), /aria-label="[ABCD] wall of (the room|the copy \d (left|right)( and \d (up|down))?|the copy \d (up|down))"/, 'walls are named by copy');
  m.reset(p);
  assert.doesNotMatch(m.render(p, a), /am-pick/);
  // Remakes show the other room’s shot, and Stretch only after the solve.
  const r = byId('aims-07'), rm = mechanicFor(r);
  assert.match(rm.render(r, freshAttempt(r)), /class="am-given"/);
  assert.doesNotMatch(rm.render(r, freshAttempt(r)), /am-stretch/);
  const solved = play(r, freshAttempt(r), {type: 'launch', start: r.solution.start, end: r.solution.end});
  assert.match(rm.render(r, solved), /data-am-stretch aria-pressed="false"[^>]*>Stretch</);
  assert.match(rm.render(r, solved), /class="am-shot ghost"/, 'the stretched shot is drawn over the child’s');
  for (const q of pack.puzzles) assert.ok(q.visibleObjective.length < 70, `${q.id}: a short objective`);
  // The How to play picture shows the worksheet’s AD example.
  assert.match(m.help(), /its word is AD/);
});

test('arrow keys move to the nearest aim within 45° of the arrow', () => {
  const list = frameAims('square', [-1, 1, -1, 1]);
  assert.deepEqual(step('square', list, [5, 5], [1, 0]), [7, 5]);
  assert.deepEqual(step('square', list, [5, 5], [0, -1]), [5, 3]);
  assert.deepEqual(step('square', list, [29, 5], [1, 0]), null, 'nothing past the window');
  const rh = frameAims('rhombus', [-48, 50, -18, 18]);
  const next = step('rhombus', rh, [7, 7], [1, 0]);
  assert.ok(next && isAim('rhombus', next));
});

test('saves: forged boards and moves after the solve are refused', () => {
  const p = byId('aims-11'), b = freshAttempt(p).board;
  assert.equal(validBoard(p, {...b, end: [46, -38]}), true);
  assert.equal(validBoard(p, {...b, end: [46, -38], checked: true, done: true}), true, 'ACDB, each wall once');
  assert.equal(fold('rhombus', [7, 7], [46, -38]).word, 'ACDB');
  assert.equal(validBoard(p, {...b, end: [46, -38], done: true}), false, 'done with no Check');
  assert.equal(validBoard(p, {...b, end: [4, -5], checked: true, done: true}), false, 'a forged done');
  const d = byId('aims-08'), db = freshAttempt(d).board;
  assert.equal(validBoard(d, {...db, end: [-11, -17], checked: true, done: true, pair: [0, 2]}), true, 'ABAD with its two A’s');
  assert.equal(validBoard(d, {...db, end: [-11, -17], checked: true, done: true, pair: [1, 3]}), false, 'ABAD with B and D');
  const t = byId('aims-05'), tb = freshAttempt(t).board;
  assert.equal(validBoard(t, {...tb, end: [3, -7], claimed: ['0,0,10,0', '10,0,20,0']}), false, 'a forged claim');
  assert.equal(validBoard(t, {...tb, claimed: ['-10,0,0,0', '0,0,10,0']}), false, 'a claim before any shot');
});

test('the puzzles join Mirror Couriers as its Bounce words group', async () => {
  assert.equal(aimsModule.family, undefined, 'no satchel family of its own');
  assert.ok(FAMILIES.some(m => m.id === 'aims'));
  assert.ok(FAMILIES.some(m => m.id === 'orchard'), 'Sight lines is still there');
  const merged = await loadPack();
  assert.equal(merged.puzzles.filter(p => p.mechanic === 'aims').length, 11);
  assert.ok(merged.puzzles.filter(p => p.mechanic === 'billiard').length > 0, 'Mirror Couriers keeps its own puzzles');
  const html = libraryView({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-billiard"'));
  const block = family.slice(0, family.indexOf('</details>'));
  assert.ok(block.indexOf('<h2>Sight lines</h2>') >= 0 && block.indexOf('<h2>Bounce words</h2>') >= 0);
  assert.equal((block.match(/data-id="aims-/g) || []).length, 11);
  assert.match(block, /aria-label="Mirror Couriers, Bounce words, puzzle 1"/);
  for (const p of pack.puzzles) for (const f of ['band', 'libraryFamily', 'group', 'familyTitle', 'mechanic']) assert.ok(p[f], `${p.id}: ${f}`);
});
