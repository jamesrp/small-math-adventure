// Tower cities, a group in Symbol Orchard: towers seen from an end, rows for a
// card and No row after an attempt, cities on the Orchard's board, looking
// along a full line, No city with the line whose tallest has no place, every
// city then one more number, making a puzzle with the app as partner, twin
// cities, hints, Undo, saves, focus and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import towersModule, {towerMechanics, seen, ends, rowsFor, allowedAt, tallestPlaces, placesFor, lineOf, viewsOf, slotOf, slotWords, cities, fitting, clueArray, noPlace, certificates, singlingOut, designSets, secondCity, cluesOf} from '../dist/families/towers/towers.js';
import {loadPack} from '../scripts/packs.mjs';

const towers = JSON.parse(await readFile(new URL('../dist/families/towers/towers.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const M = towerMechanics.towers;
const byId = id => towers.puzzles.find(p => p.id === `towers-${String(id).padStart(2, '0')}`);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const fill = (p, a, key) => [...key].map(Number).reduce((b, v, k) => b.board.cells[k] === v ? b : play(p, b, {type: 'set', cell: k, value: v}), a);
// View state (the chosen square, the line looked along) starts fresh, as opening a puzzle does.
const view = (p, a, keep = false) => { if (!keep) M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoLikeApp = (p, a) => { const u = undo(a); return {...u, board: M.carry(p, a.board, u.board)}; };

test('towers seen from each end are the records; the per-end rule and L + R ≤ n + 1', () => {
  assert.equal(seen([2, 1, 3]), 2);
  assert.deepEqual(ends([1, 4, 3, 2]), [2, 3]);
  assert.deepEqual(rowsFor(3, 2, 1).map(r => r.join('')), ['213']);
  assert.deepEqual(rowsFor(3, 1, 1), [], 'the tallest can’t stand at both ends');
  assert.deepEqual(rowsFor(4, 4, 2), [], '4 + 2 > 5');
  assert.deepEqual(rowsFor(4, 2, 3).map(r => r.join('')).sort(), ['1432', '2431', '3421']);
  assert.equal(allowedAt(4, 1, 0), true, 'a 1 puts the tallest first');
  assert.equal(allowedAt(4, 1, 1), false);
  assert.equal(allowedAt(4, 3, 1), false, 'a 3 needs two towers before the tallest');
  assert.equal(allowedAt(4, 3, 2), true);
  assert.deepEqual(tallestPlaces(4, 2, 3), [1], 'only place 2');
  assert.deepEqual(placesFor(4, 4, 'left'), [4]);
  assert.deepEqual(placesFor(4, 2, 'right'), [1, 2, 3]);
});

test('edge places run clockwise; a city’s numbers; fitting cities; lines with no place', () => {
  assert.deepEqual(lineOf(3, slotOf(3, 'top', 1)), [1, 4, 7], 'looking down column 2');
  assert.deepEqual(lineOf(3, slotOf(3, 'right', 0)), [2, 1, 0], 'looking left along row 1');
  assert.deepEqual(lineOf(3, slotOf(3, 'bottom', 0)), [6, 3, 0]);
  assert.equal(slotWords(4, slotOf(4, 'left', 1)), 'left of row 2');
  assert.equal(cities(3).length, 12);
  assert.equal(cities(4).length, 576);
  const p3 = byId(3), city = [2, 3, 1, 3, 1, 2, 1, 2, 3];
  assert.deepEqual(fitting(3, cluesOf(p3)).map(i => cities(3)[i].join('')), ['231312123']);
  assert.ok(cluesOf(p3).every((k, s) => !k || viewsOf(3, city)[s] === k));
  const top2 = clueArray(3, {top: [2, 2, 2]});
  assert.deepEqual(certificates(3, top2), [slotOf(3, 'left', 0)]);
  assert.equal(noPlace(3, top2, slotOf(3, 'right', 0)), true, 'the same row from the other side');
  assert.equal(noPlace(3, top2, slotOf(3, 'left', 1)), false, 'row 2’s tallest can stand lower down');
});

test('rows: swaps and No row, which waits for an attempt; a wrong No row stays refused across Undo', () => {
  const p = byId(2), fresh = freshAttempt(p);
  assert.deepEqual(fresh.board, {row: [2, 1, 3], said: null, refused: false, tried: false});
  assert.equal(move(p, fresh, {type: 'none'}), null, 'No row waits for a swap');
  assert.match(view(p, fresh), /class="secondary tw-no"[^>]*disabled>No row/);
  const tried = play(p, fresh, {type: 'swap', a: 0, b: 2});
  assert.deepEqual(tried.board.row, [3, 1, 2]);
  const done = play(p, tried, {type: 'none'});
  assert.ok(isSolved(p, done.board));
  assert.equal(move(p, play(p, fresh, {type: 'swap', a: 0, b: 1}, {type: 'swap', a: 0, b: 1}), {type: 'none'})?.board.said, 'no', 'swapping back still counts as an attempt');
  // The reason, drawn under the child's own row: lanes of places, a cross under the 3.
  const html = view(p, done);
  assert.match(html, /tw-proof/);
  assert.equal((html.match(/class="tw-ghost"/g) || []).length, 2, 'one place from each end');
  assert.equal((html.match(/class="tw-miss"/g) || []).length, 1, 'the child’s 3 stands at place 1: the right end’s lane crosses it');
  assert.match(html, /tw-tower tallest/);
  assert.match(html, /Your 3 is at place 1\. Seeing 1 from the left puts the 3 at place 1\. Seeing 1 from the right puts it at place 3\./);

  const q = byId(5), a = play(q, freshAttempt(q), {type: 'swap', a: 0, b: 3});
  const refused = play(q, a, {type: 'none'});
  assert.equal(refused.board.refused, true);
  assert.equal(isSolved(q, refused.board), false);
  assert.equal(move(q, refused, {type: 'none'}), null, 'one refusal');
  assert.match(view(q, refused), /A row fits\./);
  const back = undoLikeApp(q, refused);
  assert.equal(back.board.refused, true, 'Undo takes back moves, not the refusal');
  assert.equal(move(q, back, {type: 'none'}), null);
  const solved = play(q, freshAttempt(q), {type: 'swap', a: 0, b: 1}, {type: 'swap', a: 1, b: 2}, {type: 'swap', a: 2, b: 3});
  assert.deepEqual(solved.board.row, [1, 4, 3, 2]);
  assert.ok(isSolved(q, solved.board));
  assert.equal(move(q, solved, {type: 'swap', a: 0, b: 1}), null, 'nothing after a solve');
});

test('rows: looking from an end lights the towers it sees and greys the hidden ones', () => {
  const p = byId(5), a = freshAttempt(p);
  view(p, a);
  M.ui(p, {look: 'left'});
  const html = view(p, a, true);
  assert.equal((html.match(/tw-tower seen/g) || []).length, 2, '2 then 4 from the left');
  assert.equal((html.match(/tw-tower hidden/g) || []).length, 2);
  assert.match(html, /From the left, 2 seen\./);
  M.ui(p, {lift: 0});
  assert.match(view(p, a, true), /data-move="\{&quot;type&quot;:&quot;swap&quot;,&quot;a&quot;:0,&quot;b&quot;:1\}"/, 'a lifted tower makes the others swap targets');
});

test('cities: heights on the Orchard board, a ring on numbers a full city does not show, looking along full lines only', () => {
  const p = byId(3), fresh = freshAttempt(p);
  let html = view(p, fresh);
  assert.match(html, /latin-puzzle/, 'the Orchard’s board, so typed digits reach the chosen square');
  assert.match(html, /latin-cell tw-cell[^"]*" data-action="mechanic-ui"[^>]*aria-pressed="true"/);
  assert.match(html, /latin-keypad tw-keypad/);
  assert.doesNotMatch(html, /Look along/, 'no sight lines on unfinished lines');
  // A full city that does not fit: the numbers it misses are ringed.
  const wrong = fill(p, fresh, '123231312');
  html = view(p, wrong);
  assert.match(html, /tw-slot clue off/);
  assert.match(html, /An edge number does not fit\./);
  M.ui(p, {look: slotOf(3, 'top', 2)});
  html = view(p, wrong, true);
  assert.match(html, /tw-side/, 'the side view');
  assert.match(html, /Looking above column 3: 3, 1, 2; 1 seen/);
  const right = fill(p, fresh, '231312123');
  assert.ok(isSolved(p, right.board));
});

test('No city: waits for a height, then the line whose tallest has no place; a miss shows where it can stand', () => {
  const p = byId(6), fresh = freshAttempt(p);
  assert.match(view(p, fresh), /tw-no"[^>]*disabled>No city/);
  for (let s = 0; s < 12; s++) assert.equal(move(p, fresh, {type: 'none', slot: s}), null, 'nothing before an attempt');
  const tried = play(p, fresh, {type: 'set', cell: 0, value: 3});
  M.ui(p, {pick: true});
  let html = view(p, tried, true);
  assert.equal((html.match(/pickable/g) || []).length, 12, 'every edge place can be tapped');
  const missed = play(p, tried, {type: 'none', slot: slotOf(3, 'left', 1)});
  assert.equal(missed.board.missed, slotOf(3, 'left', 1));
  html = view(p, missed);
  assert.match(html, /The tallest can stand here\./);
  assert.match(html, /tw-cell[^"]* could/);
  const done = play(p, missed, {type: 'none', slot: slotOf(3, 'left', 0)});
  assert.ok(isSolved(p, done.board));
  html = view(p, done);
  assert.equal((html.match(/ ruled/g) || []).length, 3, 'row 1’s squares are crossed');
  assert.equal((html.match(/ ruling/g) || []).length, 3, 'the three 2s that rule them out');
  assert.match(html, /tw-h">3<\/span>/, 'the child’s 3 stays on the board');
  // A puzzle with a city: refused for good.
  const q = byId(3), r = play(q, play(q, freshAttempt(q), {type: 'set', cell: 0, value: 1}), {type: 'none', slot: 0});
  assert.equal(r.board.refused, true);
  assert.match(view(q, r), /A city fits\./);
  assert.match(view(q, r), /tw-no"[^>]*disabled>No city/);
  assert.equal(undoLikeApp(q, r).board.refused, true);
});

test('every city: kept as built, There is another, That’s all, then one more number', () => {
  const p = byId(7), fresh = freshAttempt(p);
  let a = fill(p, fresh, '312123231');
  assert.deepEqual(a.board.found, ['312123231']);
  let html = view(p, a);
  assert.match(html, /<ol class="tw-found"/);
  assert.doesNotMatch(html, /\b\d+ (of|found|cities|left)\b/i, 'no found-count');
  const early = play(p, a, {type: 'all'});
  assert.equal(early.board.told, 'more');
  assert.match(view(p, early), /There is another\./);
  assert.match(view(p, early), /tw-all"[^>]*disabled/);
  assert.equal(undoLikeApp(p, early).board.told, 'more', 'Undo does not reopen That’s all');
  a = fill(p, early, '321132213');
  assert.equal(a.board.told, null, 'a new city clears There is another');
  a = fill(p, a, '321213132');
  a = play(p, a, {type: 'all'});
  assert.ok(a.board.all && !isSolved(p, a.board));
  html = view(p, a);
  assert.doesNotMatch(html, /latin-puzzle/, 'the grid now shows a found city');
  assert.ok((html.match(/tw-slot open/g) || []).length === 10, 'ten empty edge places');
  assert.equal(move(p, a, {type: 'set', cell: 0, value: 1}), null, 'no building after That’s all');
  const blur = play(p, a, {type: 'extra', slot: slotOf(3, 'top', 1), value: 2});
  assert.equal(isSolved(p, blur.board), false, 'a 2 above column 2 leaves two cities');
  assert.equal((view(p, blur).match(/<li class="dim">/g) || []).length, 1);
  const done = play(p, blur, {type: 'extra', slot: slotOf(3, 'top', 1), value: 3});
  assert.ok(isSolved(p, done.board), '3 above column 2 leaves the first city');
  assert.equal(singlingOut(p).length, 9);
});

test('make a puzzle: numbers shown within the budget, the partner’s second city at once', () => {
  const p = byId(8), fresh = freshAttempt(p);
  let html = view(p, fresh);
  assert.match(html, /tw-beads/);
  assert.match(html, /Also fits/, 'with no numbers every other city fits');
  const one = play(p, fresh, {type: 'toggle', slot: slotOf(3, 'right', 1)});
  const other = secondCity(p, one.board.shown);
  assert.ok(other && viewsOf(3, other)[slotOf(3, 'right', 1)] === 3);
  html = view(p, one);
  assert.match(html, /tw-mc marked/, 'the squares where it differs');
  const two = play(p, one, {type: 'toggle', slot: slotOf(3, 'bottom', 1)});
  assert.ok(isSolved(p, two.board));
  assert.doesNotMatch(view(p, two), /Also fits/);
  const full = play(p, fresh, {type: 'toggle', slot: 0}, {type: 'toggle', slot: 1});
  assert.equal(isSolved(p, full.board), false);
  assert.equal(move(p, full, {type: 'toggle', slot: 2}), null, 'the budget is full');
  assert.match(view(p, full), /disabled/);
  assert.equal(designSets(p).length, 13);
  assert.equal(designSets(byId(11)).length, 8);
});

test('twins: a different city with the same sixteen numbers', () => {
  const p = byId(12), fresh = freshAttempt(p);
  assert.equal(isSolved(p, fresh.board), false, 'the first city itself is not a twin');
  assert.match(view(p, fresh), /tw-ref/);
  const done = fill(p, fresh, '1234241331424321');
  assert.ok(isSolved(p, done.board));
});

test('hints: board moves first, reasons before claims, quick, and they finish every puzzle', () => {
  for (const p of towers.puzzles) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.equal(first.type, 'move', p.id);
    assert.ok(!['none', 'all'].includes(first.action.type), `${p.id}: never a claim first`);
    assert.equal(first.text === 'Press No row.' || first.text === 'Press No city.', false);
    for (; !isSolved(p, a.board) && steps < 60; steps++) {
      const t = performance.now(), h = nextHint(p, a);
      assert.ok(performance.now() - t < 100, `${p.id}: a quick hint`);
      if (h.action.type === 'none') assert.match(h.text, /^(Seeing|Wherever)/, `${p.id}: the reason first`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  assert.equal(nextHint(byId(2), freshAttempt(byId(2))).text, 'Try a row: swap the 2 and the 3.');
  assert.equal(nextHint(byId(6), freshAttempt(byId(6))).text, 'Try a 3 in row 1, column 1.');
});

test('saves: forged boards are rejected', () => {
  const r = byId(2), c = byId(6), e = byId(7), d = byId(8);
  for (const [p, board, why] of [
    [r, {row: [3, 1, 2], said: 'no', refused: false, tried: false}, 'a No row before any swap'],
    [r, {row: [3, 1, 2], said: null, refused: true, tried: true}, 'a refusal where no row fits'],
    [byId(1), {row: [1, 2, 3], said: 'no', refused: false, tried: true}, 'a No row where a row fits'],
    [c, {cells: Array(9).fill(0), line: 9, missed: null, refused: false, tried: false}, 'a No city before any height'],
    [c, {cells: Array(9).fill(0), line: 10, missed: null, refused: false, tried: true}, 'a line with room for its tallest'],
    [e, {cells: Array(9).fill(0), found: ['123231312'], told: null, all: false, extra: null}, 'a found city that does not fit'],
    [e, {cells: Array(9).fill(0), found: [], told: null, all: true, extra: null}, 'That’s all with nothing found'],
    [d, {shown: [0, 1, 2]}, 'past the budget']
  ]) assert.equal(validBoard(p, board), false, why);
});

test('the group sits in Symbol Orchard; focus never lands on No row, No city or That’s all', () => {
  const orchard = pack.puzzles.filter(p => (p.libraryFamily || p.mechanic) === 'latin');
  assert.ok(orchard.some(p => p.mechanic === 'latin' && !p.group), 'the Orchard keeps its own puzzles');
  assert.equal(orchard.filter(p => p.mechanic === 'towers').length, 12);
  assert.ok(towers.puzzles.every(p => p.group === 'Towers' && p.familyTitle === 'Symbol Orchard' && p.band === 'all'));
  assert.doesNotMatch(towersModule.focus, /tw-no|tw-all/);
  for (const p of towers.puzzles) assert.doesNotMatch(view(p, freshAttempt(p)), /data-focus="tw-(no|all)"[^>]*autofocus/);
});
