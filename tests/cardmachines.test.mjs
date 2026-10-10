// Card machines: running rows, the rules and their smallest machines, Test's
// shortest wrong row, splitting pairs and Can't, rows that show fewer circles
// are not enough, hints, Undo, saves, the playground, drawing and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {newFamilies} from '../dist/families.js';
import {cardMechanics, runMachine, machineSays, ruleMachine, fewest, minimise, counterexample, separable, splitter, renamings, ruleSays, layout, machineSVG, describeMachine, pairsOf} from '../dist/families/cardmachines/cardmachines.js';
import {loadPack} from '../scripts/packs.mjs';

const own = JSON.parse(await readFile(new URL('../dist/families/cardmachines/cardmachines.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const hooks = cardMechanics.cardmachine;
const byId = id => own.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) hooks.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const arrows = list => list.map(([from, card, to]) => ({type: 'arrow', from, card, to}));
const keys = (target, index, cards) => [...cards].map(card => ({type: 'key', target, index, card}));
const undoApp = (p, a) => { const b = undo(a); return {...b, board: hooks.carry(p, a.board, b.board)}; };

test('a machine moves the marker one arrow per card; the circle it stops on answers', () => {
  const m = {arrows: [[1, 0], [2, 1], [0, 2]], marks: [true, false, false]};
  assert.deepEqual(runMachine(m, 'RBRR'), [0, 1, 1, 2, 0]);
  assert.equal(machineSays(m, ''), true, 'no cards: circle 1 answers');
  assert.equal(machineSays(m, 'RRB'), false);
  const half = {arrows: [[1, null], [null, 1]], marks: [false, true]};
  assert.deepEqual(runMachine(half, 'RRB'), [0, 1], 'a run stops at an arrow not placed');
  assert.equal(machineSays(half, 'RR'), null);
  assert.match(describeMachine(m), /circle 1 says ✓; R to 2, B stays/);
});

test('each rule’s smallest machine and the fewest circles', () => {
  assert.equal(fewest({kind: 'last', card: 'B'}), 2);
  assert.equal(fewest({kind: 'seen', word: 'R'}), 2);
  assert.equal(fewest({kind: 'mod', m: 3}), 3);
  assert.equal(fewest({kind: 'mod', m: 5}), 5);
  assert.equal(fewest({kind: 'ends', word: 'RB'}), 3);
  assert.equal(fewest({kind: 'seen', word: 'RR'}), 3);
  assert.equal(fewest({kind: 'seen', word: 'RBR'}), 4, 'the return visit’s R B R anywhere');
  assert.equal(fewest({kind: 'even2'}), 4);
  assert.equal(fewest({kind: 'equal'}), Infinity, 'no machine counts reds against blues');
  assert.equal(ruleMachine({kind: 'equal'}), null);
  // Minimising merges circles that act alike and drops ones no row reaches.
  const padded = {arrows: [[1, 0], [0, 2], [2, 2], [3, 3]], marks: [true, false, false, true]};
  assert.deepEqual(minimise({arrows: [[1, 0], [2, 1], [1, 2]], marks: [true, false, false]}), {arrows: [[1, 0], [1, 1]], marks: [true, false]});
  assert.equal(minimise(padded).marks.length, 3, 'circle 4 is never reached');
  assert.equal(renamings({kind: 'mod', m: 4}).length, 6, '(k − 1)! renamings with circle 1 kept');
});

test('Test finds the shortest wrong row, R before B', () => {
  const rule = {kind: 'ends', word: 'RB'};
  const once = {arrows: [[1, 0], [1, 2], [2, 2]], marks: [false, false, true]};
  assert.equal(counterexample(once, rule), 'RBR', 'a machine that keeps ✓ once R B has come; R before B');
  assert.equal(counterexample({arrows: [[1, 0], [1, 2], [1, 2]], marks: [false, false, true]}, rule), 'RBB');
  assert.equal(counterexample({arrows: [[0, 0]], marks: [false]}, rule), 'RB');
  assert.equal(counterexample(ruleMachine(rule), rule), null);
  assert.equal(counterexample({arrows: [[0, 0]], marks: [true]}, {kind: 'mod', m: 2}), 'R');
  assert.equal(counterexample({arrows: [[1, 1], [0, 0]], marks: [false, true]}, {kind: 'last', card: 'B'}), 'R', 'shortest first, R before B');
});

test('pairs: split exactly when they end on different circles of the smallest machine', () => {
  const mod3 = {kind: 'mod', m: 3};
  assert.equal(separable(mod3, 'RB', 'BR'), false);
  assert.equal(separable(mod3, 'BBB', 'RRR'), false);
  assert.equal(splitter(mod3, 'R', 'BRR'), 'R');
  assert.equal(splitter(mod3, 'R', 'RR'), 'R');
  assert.equal(splitter(mod3, '', 'R'), '', 'no cards can be the ending');
  assert.equal(splitter(mod3, 'RB', 'BR'), null);
  const equal = {kind: 'equal'};
  assert.equal(separable(equal, 'RB', 'BR'), false, 'the same count');
  assert.equal(splitter(equal, 'R', 'RRR'), 'B');
  assert.equal(splitter(equal, 'RR', 'RRR'), 'BB');
  assert.equal(ruleSays(equal, 'RRBB'), true);
});

test('build: arrows, marks, Test once per machine, the rows Test showed stay', () => {
  const p = byId('cardmachines-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'test'}), null, 'Test waits for every arrow');
  a = play(p, a, ...arrows([[0, 'R', 0], [0, 'B', 0], [1, 'R', 1], [1, 'B', 1]]));
  a = play(p, a, {type: 'test'});
  assert.deepEqual(a.board.tests, ['B'], 'all × is wrong first on B');
  assert.equal(a.board.checked, true);
  assert.equal(move(p, a, {type: 'test'}), null, 'one Test per machine');
  a = play(p, a, {type: 'mark', circle: 0});
  assert.equal(a.board.checked, false);
  a = play(p, a, {type: 'test'});
  assert.deepEqual(a.board.tests, ['B', ''], 'all ✓ is wrong first on no cards');
  assert.equal(a.board.presses, 2);
  a = play(p, a, {type: 'mark', circle: 0}, ...arrows([[0, 'B', 1], [1, 'R', 0]]), {type: 'mark', circle: 1});
  assert.equal(isSolved(p, a.board), false, 'right, but not tested');
  a = play(p, a, {type: 'test'});
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'mark', circle: 0}), null, 'no moves after a solve');
});

test('Undo keeps the rows Test showed and the count of presses', () => {
  const p = byId('cardmachines-03');
  let a = play(p, freshAttempt(p), ...arrows([[0, 'R', 0], [0, 'B', 0], [1, 'R', 1], [1, 'B', 1]]), {type: 'test'});
  assert.deepEqual(a.board.tests, ['']);
  const back = undoApp(p, a);
  assert.deepEqual(back.board.tests, [''], 'the row stays');
  assert.equal(back.board.presses, 1);
  assert.equal(back.board.checked, false, 'the machine waits for Test again');
  assert.ok(validBoard(p, back.board));
  const again = play(p, back, {type: 'test'});
  assert.deepEqual(again.board.tests, [''], 'the same row is not shown twice');
  assert.equal(again.board.presses, 2);
});

test('split: one shared ending per pair, or Can’t; a wrong Can’t is refused until the ending changes', () => {
  const p = byId('cardmachines-06');
  let a = freshAttempt(p);
  a = play(p, a, {type: 'cant', pair: 0});
  assert.deepEqual(a.board.refused, [true, false, false, false]);
  assert.equal(move(p, a, {type: 'cant', pair: 0}), null);
  assert.match(view(p, a, true), /Keep looking\./);
  a = play(p, a, ...keys('end', 0, 'R'));
  assert.equal(a.board.refused[0], false);
  a = play(p, a, ...keys('end', 1, 'RB'), {type: 'cant', pair: 1});
  assert.equal(a.board.cant[1], true);
  assert.equal(a.board.ends[1], '', 'a right Can’t clears the ending');
  assert.equal(move(p, a, {type: 'key', target: 'end', index: 1, card: 'R'}), null);
  const html = view(p, a, true);
  assert.match(html, /cm-proof/, 'the certificate: the rule’s machine');
  assert.match(html, /Both rows end on circle 2 of this machine/, 'R B and B R both end with one red over');
  a = play(p, a, {type: 'cant', pair: 2}, ...keys('end', 3, 'R'));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, play(p, freshAttempt(p), ...keys('end', 0, 'R')), {type: 'cant', pair: 0}), null, 'no Can’t once the ending splits');
});

test('split with the machine drawn: markers show where both rows of the chosen pair end', () => {
  const p = byId('cardmachines-04');
  const html = view(p, freshAttempt(p));
  assert.equal((html.match(/class="cm-marker l[12]"/g) || []).length, 2);
  assert.doesNotMatch(html, /data-chip=/, 'the drawn machine cannot be changed');
  assert.doesNotMatch(html, /cm-task/, 'the objective already says the task');
  const a = play(p, freshAttempt(p), {type: 'cant', pair: 2}, {type: 'cant', pair: 3});
  assert.doesNotMatch(view(p, a, true), /cm-proof/, 'the machine on the board is the certificate');
});

test('fewest: rows wait for a machine that passes; every pair split solves', () => {
  const p = byId('cardmachines-10');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'key', target: 'row', index: 1, card: 'R'}), null, 'rows wait');
  assert.doesNotMatch(view(p, a), /cm-rows/);
  a = play(p, a, ...arrows([[0, 'R', 1], [0, 'B', 0], [1, 'R', 2], [1, 'B', 0], [2, 'R', 2], [2, 'B', 2]]), {type: 'mark', circle: 2}, {type: 'test'});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(move(p, a, {type: 'mark', circle: 0}), null, 'the machine is locked once it passes');
  let html = view(p, a, true);
  assert.match(html, /Show 2 circles are not enough\./);
  assert.match(html, /cm-rows/);
  a = play(p, a, ...keys('row', 1, 'R'), ...keys('row', 2, 'RR'));
  assert.equal(isSolved(p, a.board), false, 'rows 1 and 2 still need their ending');
  a = play(p, a, ...keys('end', 0, 'R'));
  assert.ok(isSolved(p, a.board));
  html = view(p, a, true);
  assert.match(html, /cm-puzzle solved/);
});

test('fewest with no machine to build: the rows start at once', () => {
  for (const id of ['cardmachines-08', 'cardmachines-12']) {
    const p = byId(id), html = view(p, freshAttempt(p));
    assert.match(html, /cm-rows/, id);
    assert.doesNotMatch(html, /cm-machine/, `${id}: no machine`);
    assert.doesNotMatch(html, /cm-task/, `${id}: the objective already says the task`);
    assert.equal((html.match(/class="cm-pair[ "]/g) || []).length, pairsOf(p.parameters.rows).length, `${id}: a block per pair`);
  }
  const p = byId('cardmachines-12');
  let a = play(p, freshAttempt(p), ...keys('row', 1, 'R'), ...keys('row', 2, 'RR'), ...keys('row', 3, 'RRR'));
  pairsOf(4).forEach(([i], n) => { a = play(p, a, ...keys('end', n, 'B'.repeat(i))); });
  assert.ok(isSolved(p, a.board), 'i blues split i reds from j reds');
});

test('hints: the first is the authored one; live hints name moves, highlight them, and solve', () => {
  for (const p of own.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const html = view(p, {...a, hintLevel: 2});
    assert.match(html, /hinted/, `${p.id}: the board shows the hinted control`);
    while (!isSolved(p, a.board) && steps++ < 60) { const h = nextHint(p, a); assert.equal(h.type, 'move', p.id); a = play(p, a, h.action); }
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve`);
  }
  const p = byId('cardmachines-11');
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Send circle 1’s R arrow to circle 2.');
  let a = freshAttempt(p);
  for (let n = 0; n < 2; n++) a = play(p, a, nextHint(p, a).action);
  assert.equal(nextHint(p, a).text, 'Send circle 2’s R arrow to circle 1.', 'B goes up and down the square, not across it');
  assert.deepEqual(a.board.arrows[0], [1, 3]);
  const s = byId('cardmachines-04');
  assert.equal(nextHint(s, freshAttempt(s)).text, 'R and R R: add R after both.', 'pair 1 is split already with no cards');
  const f = byId('cardmachines-08');
  assert.equal(nextHint(f, freshAttempt(f)).text, 'Add R to row 2.');
});

test('rendering: chips and circles are controls while building; Test lists rows newest first', () => {
  const p = byId('cardmachines-07');
  let a = freshAttempt(p), html = view(p, a);
  assert.equal((html.match(/data-chip="/g) || []).length, 6, 'an R and a B chip per circle');
  assert.equal((html.match(/data-circle="/g) || []).length, 3);
  assert.match(html, /<button[^>]*cm-test-button[^>]*disabled/, 'Test waits for every arrow');
  assert.doesNotMatch(html, /Name|Date/);
  a = play(p, a, ...arrows([[0, 'R', 1], [0, 'B', 0], [1, 'R', 1], [1, 'B', 2], [2, 'R', 2], [2, 'B', 2]]), {type: 'mark', circle: 2}, {type: 'test'});
  html = view(p, a, true);
  assert.deepEqual(a.board.tests, ['RBR']);
  assert.match(html, /R B R: should be ×, this machine says ✓/);
  assert.match(html, /cm-marker trace/, 'the shown row’s end on the machine');
  assert.match(html, /cm-used/, 'its arrows glow');
  a = play(p, a, {type: 'arrow', from: 2, card: 'R', to: 1}, {type: 'test'});
  assert.deepEqual(a.board.tests, ['RBR', 'RBB']);
  html = view(p, a, true);
  assert.ok(html.indexOf('aria-label="R B B') < html.indexOf('aria-label="R B R'), 'newest first');
  assert.match(html, /aria-label="R B R: should be ×"/, 'an old row this machine now gets right');
  hooks.ui(p, {arm: {from: 0, card: 'R'}});
  assert.match(view(p, a, true), /cm-chip r armed/);
  assert.match(view(p, a, true), /Send R from circle 1 here/, 'circles become targets');
  a = play(p, a, {type: 'arrow', from: 0, card: 'R', to: 1});
  assert.doesNotMatch(view(p, a, true), /armed/, 'placing an arrow puts the chip down');
});

test('drawing: circles, chips and loops stay inside the picture for every small machine', () => {
  for (let k = 1; k <= 5; k++) {
    const L = layout(k);
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) assert.ok(Math.hypot(L.at[i][0] - L.at[j][0], L.at[i][1] - L.at[j][1]) > 4 * L.r, `${k}: circles apart`);
    assert.ok(L.at.every(([x, y]) => x - L.r > 0 && x + L.r < 100 && y - L.r > 0 && y + L.r < L.h), `${k}: circles inside`);
  }
  const inside = (svg, k) => {
    const h = layout(k).h;
    for (const [, x, y] of svg.matchAll(/class="cm-chip [^"]*" transform="translate\(([-\d.]+),([-\d.]+)\)"/g)) assert.ok(x >= -1 && x <= 101 && y >= -1 && y <= h + 1, `chip at ${x},${y} inside`);
  };
  for (let k = 1; k <= 3; k++) {
    const n = k ** (2 * k);
    for (let code = 0; code < n; code++) {
      const arrows = Array.from({length: k}, (_, s) => [Math.floor(code / k ** (2 * s)) % k, Math.floor(code / k ** (2 * s + 1)) % k]);
      inside(machineSVG({arrows, marks: Array(k).fill(false)}, {edit: true}), k);
    }
  }
  inside(machineSVG({arrows: [[0, 0], [1, 1], [2, 2], [3, 3]], marks: [true, false, false, false]}, {edit: true}), 4);
  inside(machineSVG({arrows: [[1, 4], [2, 0], [3, 1], [4, 2], [0, 3]], marks: Array(5).fill(true)}, {edit: true}), 5);
});

test('forged saves are rejected', () => {
  const p = byId('cardmachines-05'), b = freshAttempt(p).board;
  const wrong = {...b, arrows: [[0, 0], [1, 1], [2, 2]]};
  assert.equal(validBoard(p, {...wrong, checked: true, presses: 1}), false, 'a wrong machine tested with no row shown');
  assert.ok(validBoard(p, {...wrong, checked: true, presses: 1, tests: ['']}));
  assert.equal(validBoard(p, {...b, checked: true, presses: 1}), false, 'a Test of arrows not placed');
  assert.equal(validBoard(p, {...b, tests: ['R'], presses: 0}), false, 'more rows than presses');
  const s = byId('cardmachines-06'), sb = freshAttempt(s).board;
  assert.equal(validBoard(s, {...sb, cant: [true, false, false, false]}), false, 'Can’t on rows that split');
  assert.equal(validBoard(s, {...sb, refused: [false, true, false, false]}), false, 'a refusal where none is due');
  const f = byId('cardmachines-09'), fb = freshAttempt(f).board;
  assert.equal(validBoard(f, {...fb, rows: ['', 'R', '', '']}), false, 'rows before the machine passes');
});

test('the playground: circles from 1 to 5, Mix, a row on the bench, never solved, no Hint', () => {
  const p = own.puzzles.find(x => x.band === 'playground');
  assert.equal(hooks.noHint(p), true);
  let a = play(p, freshAttempt(p), {type: 'circles', n: 3});
  assert.deepEqual(a.board.arrows[2], [2, 2], 'a new circle starts with both arrows looping');
  a = play(p, a, {type: 'arrow', from: 0, card: 'R', to: 2}, {type: 'circles', n: 2});
  assert.deepEqual(a.board.arrows[0], [0, 0], 'an arrow into a removed circle loops back');
  a = play(p, a, {type: 'key', target: 'bench', card: 'R'}, {type: 'key', target: 'bench', card: 'B'});
  assert.equal(a.board.row, 'RB');
  let html = view(p, a);
  assert.match(html, /Row: R B, the machine says/);
  assert.match(html, /cm-marker trace/);
  assert.doesNotMatch(html, /cm-test-button/, 'no Test in the playground');
  const random = (() => { let n = 0; return () => [0.1, 0.7, 0.4, 0.9, 0.2, 0.6][n++ % 6]; })();
  a = play(p, a, {type: 'circles', n: 3});
  const mixed = move(p, a, {type: 'mix'}, random);
  assert.ok(mixed && validBoard(p, mixed.board));
  assert.equal(isSolved(p, mixed.board), false);
  assert.equal(nextHint(p, mixed).type, 'done');
  html = view(p, mixed);
  assert.match(html, /aria-label="Fewer circles"/);
  assert.doesNotMatch(html, /◯/, 'no circle count beside the machine that shows it');
});

test('the satchel lists Card machines; every puzzle renders with no Name or Date and at most one objective sentence', () => {
  assert.ok(newFamilies().some(f => f.id === 'cardmachines' && f.symbol === '◎'));
  for (const p of own.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /cm-puzzle/, p.id);
    assert.doesNotMatch(html, /Name:|Date:/, p.id);
    assert.ok((p.visibleObjective.match(/[.!?](\s|$)/g) || []).length <= 1, `${p.id}: one sentence`);
    assert.match(html, /role="status"/, `${p.id}: a status line for screen readers`);
  }
});
