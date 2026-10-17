// Staircases, a group in Memory robot: corners, walks and turns in a strip;
// spans, windows and the fewest turns; taps, cuts, drags and arrow keys;
// Fewest, which waits for the flag, judges the windows on the last tap and
// records a refusal that holds through Undo until the walk changes; exact
// lengths, the kept path and a second one; hints (CPU-timed), Undo, saves,
// rendering, styles, How to play and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {FAMILIES} from '../dist/families.js';
import stairsModule, {stairMechanics, allowed, trace, turnsOf, piecesOf, spans, joinable, certifies, need, fewest, windowSets, ways, waysFrom, walkTo, dragTo, reach, boardSvg, stripPolygon, atFlag} from '../dist/families/stairs/stairs.js';
import {loadPack} from '../scripts/packs.mjs';

const stairs = JSON.parse(await readFile(new URL('../dist/families/stairs/stairs.json', import.meta.url), 'utf8'));
const css = await readFile(new URL('../dist/families/stairs/stairs.css', import.meta.url), 'utf8');
const pack = await loadPack();
const M = stairMechanics.stairs;
const byId = n => stairs.puzzles.find(p => p.number === n);
const corner = (q, walk) => trace(q, walk).at(-1);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
// Plays a walk one straight piece at a time, as taps on the dots.
const walkOn = (p, a, word) => piecesOf(p.parameters, word).reduce((b, [, , to]) => play(p, b, {type: 'go', to}), a);
const view = (p, a, keep = false) => { if (!keep) M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoLikeApp = (p, a) => { const u = undo(a); return {...u, board: M.carry(p, a.board, u.board)}; };

test('corners in the strip, walks and turns', () => {
  const q = byId(1).parameters;
  assert.deepEqual(q, {mode: 'turns', a: 6, b: 3, D: 9});
  assert.equal(allowed(q, 3, 0), true, '|0 − 9| = 9: on the edge, which counts as inside');
  assert.equal(allowed(q, 4, 0), false);
  assert.equal(allowed(q, 0, 2), false);
  assert.equal(allowed(q, 6, 3), true);
  assert.equal(allowed(q, 1.5, 0), false);
  assert.deepEqual(trace(q, 'EEENNNEEE').at(-1), [6, 3]);
  assert.equal(trace(q, 'EEEE'), null, 'off the strip');
  assert.equal(trace(q, 'EW'), null, 'no left steps in a staircase');
  assert.equal(trace(q, 'S'), null);
  assert.equal(turnsOf('EEENNNEEE'), 2);
  assert.equal(turnsOf('ENENENENE'), 8);
  assert.deepEqual(piecesOf(q, 'EEENNNEEE').map(([d, a, b]) => `${d}${a}-${b}`), ['E0,0-3,0', 'N3,0-3,3', 'E3,3-6,3']);
  const e = byId(6).parameters;
  assert.ok(trace(e, 'EEEENWNEN'), 'left steps in an exact puzzle');
  assert.equal(trace(e, 'EEEENWE'), null, 'never straight back along the street just walked');
  assert.equal(trace(e, 'EWE'), null);
});

test('spans, windows and the fewest turns: 2k − 2 for the most windows k', () => {
  const q = byId(1).parameters;
  assert.deepEqual(spans(q), [[0, 3], [0, 5], [1, 6], [3, 6]]);
  assert.equal(joinable(q, 0, 4), true, 'the second street holds 0 to 5 across');
  assert.equal(joinable(q, 0, 5), false, 'no street holds both the first and the last column');
  assert.equal(certifies(q, [0, 5]), true);
  assert.equal(certifies(q, [5, 0]), false, 'in order');
  assert.equal(certifies(q, [0, 0]), false);
  assert.equal(certifies(q, [0, 6]), false, 'there is no seventh column');
  assert.deepEqual([need(2), need(3), need(4), need(8)], [2, 3, 3, 5]);
  for (const p of stairs.puzzles.filter(x => x.parameters.mode === 'turns')) {
    const q = p.parameters, t = fewest(q), k = need(t);
    assert.equal(t, p.solution.fewest);
    assert.equal(t, 2 * k - 2, `${p.id}: windows meet the fewest turns`);
    assert.equal(windowSets(q, k).length, p.solution.windowSets);
    assert.equal(windowSets(q, k + 1).length, 0, `${p.id}: no more windows than that`);
    assert.ok(stripPolygon(q).length >= 4);
  }
  // Puzzle 5 is the worksheet's: 8 turns, and the guide's staircase.
  const big = byId(5).parameters;
  assert.equal(fewest(big), 8);
  assert.equal(turnsOf('EENNNEEEENNNEEEENNNEEEENNNEE'), 8);
  assert.ok(atFlag(big, 'EENNNEEEENNNEEEENNNEEEENNNEE'));
});

test('taps: straight to a dot, back to a corner of the trail; drags and arrow steps', () => {
  const p = byId(2), q = p.parameters, fresh = freshAttempt(p);
  assert.deepEqual(fresh.board, {walk: '', windows: null, refused: null, told: false});
  assert.deepEqual(reach(q, '').map(([d, c]) => d + c), ['E1,0', 'E2,0', 'N0,1'], 'the dots one straight piece reaches');
  assert.equal(walkTo(q, '', [2, 0]), 'EE');
  assert.equal(walkTo(q, '', [3, 0]), null, 'off the strip');
  assert.equal(walkTo(q, '', [1, 1]), null, 'not in a straight line');
  assert.equal(walkTo(q, 'EE', [2, 0]), null, 'the robot is already there');
  assert.equal(walkTo(q, 'EENN', [2, 0]), 'EE', 'a corner of the trail takes the walk back');
  assert.equal(walkTo(q, 'EENN', [0, 0]), '');
  assert.equal(walkTo(q, 'EENN', [1, 2]), null, 'no left steps in a staircase');
  let a = play(p, fresh, {type: 'go', to: [2, 0]}, {type: 'go', to: [2, 3]});
  assert.equal(a.board.walk, 'EENNN');
  a = play(p, a, {type: 'go', to: [2, 1]});
  assert.equal(a.board.walk, 'EEN', 'cut back');
  assert.equal(move(p, a, {type: 'go', to: [2, 1]}), null, 'tapping the robot is no move');
  assert.equal(play(p, a, {type: 'walk', walk: 'EENN'}).board.walk, 'EENN', 'a drag or an arrow key');
  assert.equal(move(p, a, {type: 'walk', walk: 'EEN'}), null, 'a drag that changes nothing is no move');
  // A drag follows the finger: the longer way first, back over the trail.
  assert.equal(dragTo(q, '', [2, 2]), 'ENEN', 'a tie goes right first, then the longer way');
  assert.equal(dragTo(q, 'EENN', [2, 1]), 'EEN');
  assert.equal(dragTo(q, 'EE', [4, 0]), 'EE', 'stops at the strip');
  assert.equal(dragTo(q, 'EE', null), 'EE');
  const e = byId(6).parameters;
  assert.equal(dragTo(e, 'EEEEN', [2, 1]), 'EEEENWW');
  assert.equal(walkTo(e, 'EEEEN', [1, 1]), 'EEEENWWW');
  assert.equal(walkTo(e, 'EEEENWWW', [4, 1]), 'EEEEN', 'a corner of the trail, not a step back');
});

test('Fewest waits for the flag; the windows are judged on the last tap; a refusal is recorded and holds until the walk changes', () => {
  const p = byId(2), q = p.parameters, fresh = freshAttempt(p);
  assert.match(view(p, fresh), /<button[^>]*st-fewest[^>]*disabled>Fewest<\/button>/, 'off before the flag');
  assert.equal(move(p, fresh, {type: 'fewest', windows: [0, 4, 8]}), null, 'no claim on a fresh board');
  const many = walkOn(p, fresh, 'ENENEENNEENENEE');
  assert.ok(atFlag(q, many.board.walk));
  assert.equal(turnsOf(many.board.walk), 10);
  assert.doesNotMatch(view(p, many), /st-fewest[^>]*disabled/, 'on at the flag');
  // Ten turns need six windows; there are never more than three, so every claim is refused.
  for (const set of windowSets(q, 3)) assert.equal(move(p, many, {type: 'fewest', windows: set}), null, 'one window for each slot');
  assert.equal(windowSets(q, need(10)).length, 0);
  assert.equal(move(p, many, {type: 'fewest', windows: [0, 2, 4, 6, 7, 8]}).board.refused.length, 6);
  // The claim: Fewest shows the columns, none marked; nothing tells which work.
  const good = walkOn(p, fresh, p.solution.staircase);
  M.reset(p);
  M.ui(p, {claim: 'toggle'});
  let html = view(p, good, true);
  assert.equal((html.match(/class="st-column"/g) || []).length, 9, 'every column a control, none marked');
  assert.equal((html.match(/st-window-(on|hint|told)/g) || []).length, 0);
  assert.equal((html.match(/<li class="" aria-hidden="true"><\/li>/g) || []).length, 3, 'three empty slots');
  assert.doesNotMatch(html, /class="st-go/, 'no dots while choosing windows');
  M.ui(p, {mark: 0}); M.ui(p, {mark: 1});
  html = view(p, good, true);
  assert.equal((html.match(/st-column on/g) || []).length, 2);
  assert.equal((html.match(/class="st-window-on"/g) || []).length, 2);
  M.ui(p, {mark: 1});
  assert.equal((view(p, good, true).match(/st-column on/g) || []).length, 1, 'a second tap unmarks');
  // A wrong set is a move: one line, the columns outlined, Fewest off.
  const refused = play(p, good, {type: 'fewest', windows: [0, 1, 8]});
  assert.deepEqual(refused.board, {walk: p.solution.staircase, windows: null, refused: [0, 1, 8], told: true});
  html = view(p, refused, true);
  assert.match(html, /<p class="st-note" role="status">A flat piece can cross two of these\.<\/p>/);
  assert.equal((html.match(/st-window-told/g) || []).length, 3);
  assert.match(html, /<button[^>]*st-fewest[^>]*disabled>Fewest<\/button>/, 'Fewest is off after a refusal');
  assert.doesNotMatch(html, /class="st-column/);
  assert.doesNotMatch(M.render(p, refused).replace(/<p class="sr-only"[\s\S]*?<\/p>/g, '').replace(/<[^>]*>/g, ' '), /turn/i, 'the refusal never judges the staircase');
  M.ui(p, {claim: 'toggle'});
  assert.doesNotMatch(view(p, refused, true), /st-claiming/, 'no claim while the refusal stands');
  M.reset(p);
  for (const set of [[0, 4, 8], [0, 1, 2]]) assert.equal(move(p, refused, {type: 'fewest', windows: set}), null, 'no second claim on the same walk');
  // A change of walk ends it; back on the flag, the right set solves.
  const away = play(p, refused, {type: 'go', to: [7, 6]});
  assert.equal(away.board.refused, null);
  const again = play(p, away, {type: 'go', to: [9, 6]});
  assert.equal(again.board.walk, p.solution.staircase);
  assert.doesNotMatch(view(p, again), /st-fewest[^>]*disabled|A flat piece/);
  const done = play(p, again, {type: 'fewest', windows: [0, 4, 8]});
  assert.ok(isSolved(p, done.board));
  html = view(p, done, true);
  assert.equal((html.match(/st-window-on proved/g) || []).length, 3);
  assert.equal((html.match(/class="st-flat"/g) || []).length, 3);
  assert.doesNotMatch(html, /st-fewest|st-column/);
  assert.equal(move(p, done, {type: 'go', to: [0, 0]}), null, 'nothing after a solve');
  // Of all sets of three columns claimed once, only the real windows solve.
  let pass = 0, of = 0;
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) for (let k = j + 1; k < 9; k++) { of++; if (isSolved(p, move(p, good, {type: 'fewest', windows: [i, j, k]}).board)) pass++; }
  assert.deepEqual([pass, of], [1, 84]);
  assert.equal(move(p, good, {type: 'fewest', windows: [0, 4]}), null, 'one window for each slot');
  assert.equal(move(p, good, {type: 'fewest', windows: [8, 4, 0]}), null, 'in order');
  M.reset(p);
});

test('exact length: the first path on the last box is kept, the same path again is not a solve, a different one is', () => {
  const p = byId(6), q = p.parameters, fresh = freshAttempt(p);
  assert.deepEqual(fresh.board, {walk: '', kept: ''});
  assert.equal(ways(q), 28);
  let html = view(p, fresh);
  assert.equal((html.match(/class="st-slot"/g) || []).length, 9, 'a box for every step');
  assert.doesNotMatch(html, /st-fewest/);
  assert.doesNotMatch(M.render(p, fresh).replace(/<p class="sr-only"[\s\S]*?<\/p>/g, '').replace(/<[^>]*>/g, ' '), /\d|steps|length/i, 'no length readout');
  const early = walkOn(p, fresh, 'EEEENNN');
  assert.ok(atFlag(q, early.board.walk) && !isSolved(p, early.board), 'the flag before the last box is not a solve');
  assert.equal(early.board.kept, '');
  assert.equal(move(p, early, {type: 'go', to: [3, 3]}).board.walk, 'EEEENNNW', 'the robot can go on past the flag');
  const first = walkOn(p, fresh, 'EEEENNWNE');
  assert.deepEqual(first.board, {walk: '', kept: 'EEEENNWNE'}, 'kept at once, and the robot starts again');
  html = view(p, first);
  assert.match(html, /class="st-ghost"/);
  assert.equal((html.match(/class="st-played"/g) || []).length, 0);
  const same = walkOn(p, first, 'EEEENNWNE');
  assert.ok(!isSolved(p, same.board));
  assert.match(view(p, same), /That’s the same path\./);
  assert.deepEqual(reach(q, same.board.walk), [], 'the boxes are full');
  assert.doesNotMatch(M.render(p, same), /class="st-go/);
  const second = walkOn(p, first, 'EEEENWNEN');
  assert.ok(isSolved(p, second.board));
  assert.match(view(p, second), /st-puzzle solved/);
  assert.equal(move(p, first, {type: 'walk', walk: 'EEEENNWNEN'}), null, 'never past the last box');
  assert.equal(waysFrom(q, 'EEEENNWNE'), 1);
  // Puzzle 8 has four paths of 27 steps; puzzle 9's strip allows 23 at most.
  assert.equal(ways(byId(8).parameters), 4);
  assert.equal(ways(byId(9).parameters), 9);
  assert.equal(ways({...byId(9).parameters, steps: 25}), 0);
});

test('hints alone solve every puzzle, fresh and after wrong moves, quickly and without "Press Fewest" first', () => {
  for (const p of stairs.puzzles) {
    const q = p.parameters;
    const starts = [freshAttempt(p)];
    if (q.mode === 'turns') {
      const zig = (() => { let w = ''; for (let i = 0; i < 40 && !atFlag(q, w); i++) { const c = 'EN'[i % 2]; w = trace(q, w + c) ? w + c : w + 'EN'[(i + 1) % 2]; } return w; })();
      starts.push(walkOn(p, freshAttempt(p), zig));
      // After a refused claim on the fewest staircase, the hint changes the walk first.
      const refused = play(p, walkOn(p, freshAttempt(p), p.solution.staircase), {type: 'fewest', windows: Array.from({length: p.solution.flatPieces}, (_, c) => c)});
      assert.equal(nextHint(p, refused).action.type, 'go');
      assert.match(nextHint(p, refused).text, /^Take the trail back to/);
      starts.push(refused);
    } else {
      // Right as far as the strip allows, then up: the flag well before the last box.
      let w = '';
      while (!atFlag(q, w) && w.length < 40) w += trace(q, w + 'E') ? 'E' : 'N';
      starts.push(walkOn(p, freshAttempt(p), w));
    }
    for (const start of starts) {
      M.reset(p);
      let a = start, steps = 0;
      const first = nextHint(p, a);
      assert.equal(first.type, 'move');
      if (start === starts[0]) assert.notEqual(first.action.type, 'fewest', `${p.id}: the first hint is never the claim`);
      for (; !isSolved(p, a.board) && steps < 80; steps++) {
        const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
        assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
        assert.equal(h.type, 'move');
        assert.ok(h.text.length < 160);
        if (h.action.type === 'fewest') assert.match(h.text, /^Press Fewest and tap columns [0-9, and]+, counting from the left: no flat piece can cross two of them\.$/, 'the reason comes with the claim');
        a = play(p, a, h.action);
      }
      assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
    }
  }
  assert.equal(nextHint(byId(2), freshAttempt(byId(2))).text, 'Go right to 2 across.');
  assert.equal(nextHint(byId(1), freshAttempt(byId(1))).text, 'Go right to 3 across.');
  // After a staircase with too many turns, the hint takes the trail back first.
  const p = byId(2), a = walkOn(p, freshAttempt(p), 'ENENEENNEENENEE');
  assert.match(nextHint(p, a).text, /^Take the trail back to \d+ across, \d+ up\.$/);
  // The windows a hint names include the ones already tapped, when they can.
  const p4 = byId(4), at = walkOn(p4, freshAttempt(p4), p4.solution.staircase);
  M.reset(p4); M.ui(p4, {claim: 'toggle'}); M.ui(p4, {mark: 11});
  assert.ok(nextHint(p4, at).action.windows.includes(11));
  M.reset(p4);
  // The first hint the child sees is the authored one.
  assert.match(view(byId(1), {...freshAttempt(byId(1)), hintLevel: 1}), /How far along the bottom street can the robot go before it leaves the strip\?/);
});

test('hint marks: a dot to go to, a corner to go back to, or the windows, only from the second level', () => {
  const p = byId(2), fresh = freshAttempt(p);
  assert.doesNotMatch(view(p, {...fresh, hintLevel: 1}), /st-go hinted/);
  assert.match(view(p, {...fresh, hintLevel: 2}), /class="st-go hinted"[^>]*data-go="2,0"/);
  const wrong = walkOn(p, fresh, 'ENENEENNEENENEE');
  assert.match(view(p, {...wrong, hintLevel: 2}), /class="st-back-hint"/);
  const at = walkOn(p, fresh, p.solution.staircase);
  assert.match(view(p, {...at, hintLevel: 2}), /st-fewest hinted/);
  M.ui(p, {claim: 'toggle'});
  assert.equal((view(p, {...at, hintLevel: 2}, true).match(/st-window-hint/g) || []).length, 3);
  M.reset(p);
});

test('Undo takes back moves, always changes the board, leaves Fewest, and keeps a refusal while the walk is the same', () => {
  const p = byId(3), fresh = freshAttempt(p), w = p.solution.staircase;
  const a = walkOn(p, fresh, w);
  M.ui(p, {claim: 'toggle'}); M.ui(p, {mark: 0});
  const back = undoLikeApp(p, a);
  assert.notEqual(back.board.walk, a.board.walk);
  assert.doesNotMatch(view(p, back, true), /st-claiming|st-column/, 'Undo leaves the claim');
  for (let b = a; b.history.length; b = undo(b)) assert.notDeepEqual(undo(b).board, b.board, 'every Undo changes the board');
  // Undo after a refusal: the line and outline go, the refusal stays, Fewest stays off.
  const refused = play(p, a, {type: 'fewest', windows: [0, 1, 11]});
  const kept = undoLikeApp(p, refused);
  assert.deepEqual(kept.board, {walk: w, windows: null, refused: [0, 1, 11], told: false});
  assert.notDeepEqual(kept.board, refused.board, 'the Undo changes the board');
  const html = view(p, kept);
  assert.doesNotMatch(html, /A flat piece|st-window-told/);
  assert.match(html, /<button[^>]*st-fewest[^>]*disabled>Fewest<\/button>/);
  assert.equal(move(p, kept, {type: 'fewest', windows: [0, 5, 11]}), null, 'Undo is no way round the refusal');
  // The next Undo takes back a piece, and the refusal ends with the walk.
  const piece = undoLikeApp(p, kept);
  assert.notEqual(piece.board.walk, w);
  assert.equal(piece.board.refused, null);
  const e = byId(6), done = walkOn(e, freshAttempt(e), 'EEEENNWNE');
  assert.deepEqual(undoLikeApp(e, done).board, {walk: 'EEEENNWN', kept: ''}, 'Undo after a keep takes back the last piece');
});

test('saves are checked, including forged solves and forged refusals', () => {
  const p = byId(2), w = p.solution.staircase, B = (walk, windows = null, refused = null, told = false) => ({walk, windows, refused, told});
  assert.ok(validBoard(p, B(w, [0, 4, 8])));
  assert.ok(validBoard(p, B('EE')));
  assert.ok(validBoard(p, B(w, null, [0, 1, 8], true)));
  assert.ok(validBoard(p, B(w, null, [0, 1, 8], false)), 'a refusal after Undo');
  for (const [board, why] of [
    [B(w, [0, 4, 7]), 'windows a flat piece joins'],
    [B('EE', [0, 4, 8]), 'a claim away from the flag'],
    [B('ENENEENNEENENEE', [0, 4, 8]), 'too few windows for that many turns'],
    [{...B(w, [0, 4, 8]), done: true}, 'a forged done'],
    [{walk: w, windows: [0, 4, 8]}, 'missing the refusal fields'],
    [B(w, null, [0, 4, 8], true), 'a right set recorded as refused'],
    [B(w, [0, 4, 8], [0, 1, 8], true), 'a solve and a refusal'],
    [B(w, null, [0, 1], true), 'a refusal of the wrong size'],
    [B(w, null, [8, 1, 0], true), 'a refusal out of order'],
    [B('EE', null, [0, 1, 8], true), 'a refusal away from the flag'],
    [B(w, null, null, true), 'a refusal line with no refusal'],
    [B(w, null, [0, 1, 8], 'yes'), 'a refusal line that is not true or false'],
    [B('EEE'), 'off the strip'],
    [B('EW'), 'a left step in a staircase'],
    [B(5), 'not a walk'],
    [null, 'nothing']
  ]) assert.equal(validBoard(p, board), false, why);
  const e = byId(6);
  assert.ok(validBoard(e, {walk: 'EEEENWNEN', kept: 'EEEENNWNE'}));
  assert.ok(isSolved(e, {walk: 'EEEENWNEN', kept: 'EEEENNWNE'}));
  for (const [board, why] of [
    [{walk: 'EEEENNWNE', kept: ''}, 'a finished path not kept'],
    [{walk: '', kept: 'EEEENNN'}, 'a kept path short of the last box'],
    [{walk: 'EEEENWNEN', kept: 'EEEENWNEN', done: true}, 'a forged done'],
    [{walk: 'EEEENWNENE', kept: 'EEEENNWNE'}, 'past the last box'],
    [{walk: 'EWE', kept: ''}, 'straight back'],
    [B(''), 'the other kind of puzzle']
  ]) assert.equal(validBoard(e, board), false, why);
  assert.equal(isSolved(e, {walk: 'EEEENNWNE', kept: 'EEEENNWNE'}), false);
});

test('rendering: scoped styles, the board size, How to play, objectives and the satchel', () => {
  // Every style rule is scoped under the group's root.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '').replace(/@media[^{]+\{/g, '').split('}').map(r => r.split('{')[0].trim()).filter(Boolean);
  assert.ok(rules.length > 30);
  for (const r of rules) for (const s of r.split(',')) assert.match(s.trim(), /^\[data-mechanic-wire="stairs"\]/, s);
  for (const p of stairs.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /<div class="st-puzzle" data-mechanic-wire="stairs">/);
    assert.match(html, /svg tabindex="-1" data-focus="st-board"/);
    assert.ok(p.controls.startsWith(p.parameters.mode === 'turns' ? 'A staircase goes only right and up' : 'Each step is one block'), 'How to play opens with the mathematics');
    assert.ok(p.visibleObjective.length <= 40);
    assert.doesNotMatch(p.title + p.hints[0] + p.controls, /\b(two|three|four|five|2|3|4|5|6|8) (turns|windows|flat pieces)\b/i, `${p.id}: no answer in the title, How to play or first hint`);
    const help = M.help(p);
    assert.match(help, /<figure class="st-help" data-mechanic-wire="stairs">/);
    assert.match(help, /class="sg-board st-board st-mini"/);
    assert.doesNotMatch(help, /data-go|data-window|tabindex/, 'the picture is not a control');
  }
  // The board picture: one block per street, the robot and flag drawn once.
  const svg = boardSvg(byId(5).parameters, {walk: '', live: true});
  assert.equal((svg.match(/class="st-robot"/g) || []).length, 1);
  assert.equal((svg.match(/class="st-flag"/g) || []).length, 1);
  assert.match(svg, /aria-label="Go right to 2 across"/);
  assert.match(svg, /aria-label="Go up to 1 up"/);
  // The group sits in Memory robot, below its levels; the robot keeps its own.
  const robot = pack.puzzles.filter(p => (p.libraryFamily || p.mechanic) === 'robot');
  assert.equal(robot.filter(p => p.mechanic === 'robot').length, 13, 'twelve puzzles and the playground');
  assert.equal(robot.filter(p => p.mechanic === 'stairs').length, 9);
  assert.ok(stairs.puzzles.every(p => p.group === 'Staircases' && p.familyTitle === 'Memory robot' && p.band === 'all' && p.id.startsWith('stairs-')));
  assert.equal(stairsModule.family, undefined, 'a group adds no family');
  assert.equal(FAMILIES.filter(m => Object.keys(m.mechanics).includes('stairs')).length, 1);
  const page = libraryView({attempts: {}}, pack.puzzles);
  const at = page.slice(page.indexOf('data-view-key="family-robot"'));
  const section = at.slice(0, at.indexOf('data-view-key="family-', 10));
  assert.ok(section.indexOf('<h2>Staircases</h2>') > section.indexOf('data-id="robot-12"'));
  for (let i = 1; i <= 9; i++) assert.match(section, new RegExp(`data-id="stairs-0${i}"`));
  // Focus after a move lands on the board's own controls, never on Fewest.
  assert.doesNotMatch(stairsModule.focus, /fewest/);
  for (const p of stairs.puzzles) assert.doesNotMatch(view(p, freshAttempt(p)), /autofocus/);
});
