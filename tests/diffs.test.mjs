// Gap rings: the rule, rings before a target, the Can't certificates,
// building and finding every ring, growing a run back and taking rings back,
// the three-tower loop, the Can't flow on the board, Undo, hints, saves and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {diffMechanics, gaps, predecessors, certificate, reasonOf, deepest, movesToZero} from '../dist/families/diffs/diffs.js';
import {loadPack} from '../scripts/packs.mjs';

const diffs = JSON.parse(await readFile(new URL('../dist/families/diffs/diffs.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => diffs.puzzles.find(p => p.id === id);
const M = diffMechanics.diffs;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const sets = ring => ring.map((h, station) => ({type: 'set', station, h}));
// Build a ring on the draft (or old ring), skipping towers already that high.
const build = (p, a, ring) => ring.reduce((b, h, i) => (b.board.draft || b.board.old)[i] === h ? b : play(p, b, {type: 'set', station: i, h}), a);
const view = (p, a, keep = false) => { if (!keep) M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const text = html => html.replace(/<p class="sr-only"[^]*?<\/p>/g, '').replace(/aria-label="[^"]*"/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('the rule: each gap goes to the tower its arrow leaves', () => {
  assert.deepEqual(gaps([1, 4, 2, 0]), [3, 2, 2, 1], 'the worksheet’s example');
  assert.deepEqual(gaps([1, 0, 0]), [1, 0, 1]);
  assert.equal(movesToZero([0, 1, 2, 4]), 7);
  assert.equal(movesToZero([1, 0, 0]), Infinity, 'three towers can go round');
  assert.equal(deepest([0, 0, 0, 0], 4), 7);
  assert.equal(deepest([0, 0, 0, 0], 3), 6);
});

test('rings before a target, and the certificates for none', () => {
  assert.deepEqual(predecessors([3, 2, 2, 1], 4), [[1, 4, 2, 0], [3, 0, 2, 4]]);
  assert.equal(predecessors([1, 1, 1, 1], 2).length, 8);
  assert.deepEqual(predecessors([0, 0, 0, 2], 9), []);
  assert.deepEqual(predecessors([1, 1, 1, 0], 9), []);
  assert.deepEqual(reasonOf([0, 0, 0, 2]), {kind: 'zeros', marks: [0, 1, 2]});
  assert.deepEqual(reasonOf([1, 1, 1, 0]), {kind: 'odd', marks: [0, 1, 2]});
  assert.deepEqual(reasonOf([1, 2, 2, 2]), {kind: 'odd', marks: [0]});
  assert.equal(reasonOf([0, 0, 2, 4]), null, 'no ring makes it, but neither certificate applies');
  assert.equal(certificate([1, 1, 1, 0], [0, 1, 2]), 'odd');
  assert.equal(certificate([1, 1, 1, 0], [0, 1]), null, 'every odd gap must be marked');
  assert.equal(certificate([0, 0, 0, 2], [0, 1, 2]), 'zeros');
  assert.equal(certificate([0, 0, 0, 2], [0, 1]), null);
  assert.equal(certificate([0, 0, 0, 0], [0, 1, 2]), null, 'four zeros come from a flat ring');
  assert.equal(certificate([1, 1, 1, 1], [0, 1]), null, 'an even number of odd gaps is no reason');
});

test('make: building a ring that works solves; a wrong ring does not', () => {
  const p = byId('diffs-05');
  let a = play(p, freshAttempt(p), ...sets([1, 4, 2, 1]));
  assert.ok(!isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'set', station: 3, h: 1}), null, 'the same height is no move');
  a = play(p, a, {type: 'set', station: 3, h: 0});
  assert.ok(isSolved(p, a.board), '(1, 4, 2, 0) makes (3, 2, 2, 1)');
  const b = play(p, freshAttempt(p), {type: 'set', station: 0, h: 2}, {type: 'set', station: 0, h: null});
  assert.deepEqual(b.board.old, [null, null, null, null], 'a tower can be cleared');
});

test('Can’t: only after a whole ring, with the marks that show why; a refusal holds through Undo', () => {
  const p = byId('diffs-06');
  let a = play(p, freshAttempt(p), ...sets([0, 1, 0]));
  assert.equal(move(p, a, {type: 'cant', marks: [0, 1, 2]}), null, 'Can’t waits for a whole ring');
  a = play(p, a, {type: 'set', station: 3, h: 1});
  const wrong = play(p, a, {type: 'cant', marks: [0, 1]});
  assert.deepEqual(wrong.board.refused, [0, 1]);
  assert.equal(move(p, wrong, {type: 'cant', marks: [0, 1, 2]}), null, 'Can’t waits for a change');
  const back = undo(wrong);
  assert.deepEqual(M.carry(p, wrong.board, back.board).refused, [0, 1], 'Undo keeps the refusal');
  const changed = play(p, wrong, {type: 'set', station: 0, h: 2});
  assert.equal(changed.board.refused, null);
  assert.ok(!isSolved(p, play(p, changed, {type: 'cant', marks: [0, 1, 2]}).board), 'the first three towers are not the reason');
  const right = play(p, changed, {type: 'cant', marks: [1, 2, 3]});
  assert.ok(isSolved(p, right.board));
  const possible = byId('diffs-01'), tried = play(possible, freshAttempt(possible), ...sets([0, 0, 0, 0]));
  assert.ok(!isSolved(possible, play(possible, tried, {type: 'cant', marks: [0]}).board), 'Can’t on a ring that has one is refused');
});

test('the Can’t flow on the board: press, tap the towers, press again', () => {
  const p = byId('diffs-04');
  const a = play(p, freshAttempt(p), ...sets([0, 0, 0, 1]));
  let html = view(p, a);
  assert.match(html, /class="secondary df-cant"[^>]*data-ui='\{"claiming":true\}'/);
  assert.doesNotMatch(html, /df-pick/, 'the target is not tappable before Can’t');
  M.ui(p, {claiming: true});
  html = view(p, a, true);
  assert.equal((html.match(/df-st df-pick/g) || []).length, 4, 'each tower on the right can be marked');
  assert.doesNotMatch(html, /df-pick[^"]*(hinted|marked)/, 'no tower is pointed out before a tap');
  for (const mark of [3, 0, 2]) M.ui(p, {mark});
  html = view(p, a, true);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;marks&quot;:\[0,2,3\]\}"/, 'Can’t now makes the claim');
  // A hint at level 2 marks the Can't button, never the towers to tap.
  const hinted = view(p, {...a, hintLevel: 2});
  assert.match(hinted, /df-cant hinted/);
  assert.doesNotMatch(hinted, /df-pick|df-st[^"]*hinted/);
  assert.doesNotMatch(nextHint(p, a).text, /Can’t/, 'the reason in words, not Press Can’t');
  const done = play(p, a, {type: 'cant', marks: [0, 2, 3]});
  assert.match(view(p, done), /Three 0 gaps make all four towers equal\./);
  assert.match(view(p, done), /df-st s0 claimed/);
  const fresh = view(p, freshAttempt(p));
  assert.match(fresh, /class="secondary df-cant"[^>]*disabled/, 'Can’t is off until a ring is built');
});

test('every: rings found are kept, That’s all is checked, Undo keeps them', () => {
  const p = byId('diffs-07');
  let a = play(p, freshAttempt(p), ...sets([0, 0, 1, 1]));
  assert.deepEqual(a.board.found, ['0,0,1,1']);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new ring');
  a = build(p, a, [1, 1, 2, 2]);
  assert.equal(a.board.told, null);
  const back = undo(a);
  assert.deepEqual(M.carry(p, a.board, back.board).found, ['0,0,1,1', '1,1,2,2']);
  a = play(p, build(p, build(p, a, [1, 1, 0, 0]), [2, 2, 1, 1]), {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.doesNotMatch(view(p, freshAttempt(p)), /\d+ found|\d+ of \d+|df-found/i, 'no count of rings, and no slots');
});

test('grow: rings join the run when their gaps make the newest one; dead ends are taken back', () => {
  const p = byId('diffs-12');
  let a = play(p, freshAttempt(p), ...sets([1, 1, 1, 1]));
  assert.equal(a.board.run.length, 1);
  assert.deepEqual(a.board.draft, [null, null, null, null], 'a new draft starts');
  assert.equal(nextHint(p, a).action.type, 'lift', 'a flat ring of 1s cannot go back six more');
  assert.match(nextHint(p, a).text, /Take it back\./);
  a = play(p, a, {type: 'lift'});
  assert.deepEqual(a.board, {run: [], draft: [1, 1, 1, 1]}, 'the ring comes back to change');
  assert.equal(move(p, a, {type: 'lift'}), null, 'nothing more to take back');
  a = play(p, a, ...sets([2, 2, 2, 2]));
  for (const r of [[0, 2, 0, 2], [0, 0, 2, 2], [1, 1, 1, 3], [0, 1, 2, 3], [1, 1, 2, 4], [0, 1, 2, 4]]) a = build(p, a, r);
  assert.ok(isSolved(p, a.board), 'a run of seven');
  assert.match(view(p, a), /df-run solved/);
  const four = byId('diffs-08');
  const b = play(four, freshAttempt(four), ...sets([1, 1, 1, 1]), ...sets([1, 2, 1, 2]));
  assert.equal(b.board.run.length, 2, '(1, 2, 1, 2) makes (1, 1, 1, 1)');
  assert.deepEqual(nextHint(four, b).action, {type: 'lift'}, 'but nothing under 3 makes (1, 2, 1, 2)');
  assert.match(nextHint(four, b).text, /towers up to 2\. Take it back\./);
});

test('three towers: going back until a ring comes again', () => {
  const p = byId('diffs-09');
  let a = freshAttempt(p);
  assert.deepEqual(a.board.run, [[1, 0, 1]]);
  assert.equal(move(p, a, {type: 'lift'}), null, 'the start stays');
  a = play(p, a, ...sets([1, 0, 0]));
  assert.equal(a.board.run.length, 2);
  assert.equal(nextHint(p, a).action.type, 'lift');
  assert.match(nextHint(p, a).text, /odd number/);
  a = play(p, a, {type: 'lift'}, {type: 'set', station: 0, h: 0}, {type: 'set', station: 1, h: 1}, {type: 'set', station: 2, h: 1});
  a = play(p, a, ...sets([1, 1, 0]), ...sets([1, 0, 1]));
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/df-mini n3 loop/g) || []).length, 2, 'both copies of the repeated ring are ringed');
});

test('hints alone solve every puzzle, and never start with Can’t', () => {
  for (const p of diffs.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p), n = 0;
    assert.notEqual(nextHint(p, a).action?.type, 'cant');
    for (; !isSolved(p, a.board) && n < 200; n++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), `${p.id} solved by hints`);
  }
});

test('saves are checked', () => {
  const p = byId('diffs-12');
  assert.ok(validBoard(p, {run: [[2, 2, 2, 2]], draft: [0, null, null, null]}));
  assert.equal(validBoard(p, {run: [[1, 2, 2, 2]], draft: [null, null, null, null]}), false, 'a first ring that does not make zero');
  assert.equal(validBoard(p, {run: [[5, 5, 5, 5]], draft: [null, null, null, null]}), false, 'a tower over the cap');
  const e = byId('diffs-07');
  assert.equal(validBoard(e, {old: [0, 0, 1, 1], found: [], told: null, done: false}), false, 'a ring that works is kept at once');
  const c = byId('diffs-04');
  assert.equal(validBoard(c, {old: [0, 0, 0, 0], claim: [0, 1], refused: null}), false, 'a claim without the reason');
});

test('the board: rings, gaps on the arrows, few words', () => {
  const p = byId('diffs-05');
  const a = play(p, freshAttempt(p), ...sets([1, 4, 2]));
  const html = view(p, a);
  assert.match(html, /df-gap">3</, 'the gap from A to B');
  assert.match(html, /df-gap">2</, 'the gap from B to C');
  assert.match(html, /df-gap unset"></, 'no gap until both towers are built');
  assert.equal((html.match(/data-mechanic-wire="diffs"/g) || []).length, 1);
  const board = html.slice(html.lastIndexOf('<div', html.indexOf('df-board')));
  assert.equal(text(board.slice(0, board.indexOf('play-sidebar'))).replace(/\b[A-D]\b|\d|→|↓|←|↑|Can’t/g, '').trim().length < 40, true, 'the board shows letters, numbers and Can’t only');
  const g = byId('diffs-11');
  assert.equal((view(g, freshAttempt(g)).match(/class="slot"/g) || []).length, 6, 'six slots for a run of six');
});
