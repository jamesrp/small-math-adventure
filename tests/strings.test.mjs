// Circle strings: pairings, regions and the trap test, laying and cutting
// strings with crossings refused, Can't and its certificate, collecting every
// pairing, neighbours, paths, trees, swaps, taps on contested points, hints,
// Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import * as S from '../dist/families/strings/strings.js';
import {loadPack} from '../scripts/packs.mjs';

const strings = JSON.parse(await readFile(new URL('../dist/families/strings/strings.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => strings.puzzles.find(p => p.id === id);
const M = S.stringsMechanics.strings;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const lay = (...ss) => ss.map(s => ({type: 'lay', s}));
// View state (the picked dot, Can't pressed) starts fresh, as opening a puzzle does.
const view = (p, a, keep = false) => { if (!keep) M.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoCarry = (p, a) => { const back = undo(a); return {...back, board: M.carry(p, a.board, back.board)}; };

test('pairings: Catalan counts, crossings, keys, and pairings that differ only by a turn are different', () => {
  assert.deepEqual([2, 4, 6, 8, 10, 12].map(n => S.pairings(n).length), [1, 2, 5, 14, 42, 132]);
  assert.equal(S.pairings(7).length, 0);
  assert.ok(S.crosses([1, 3], [2, 4]));
  assert.ok(!S.crosses([1, 4], [2, 3]), 'nested strings do not cross');
  assert.ok(!S.crosses([1, 2], [3, 4]));
  assert.equal(S.keyOf([[5, 6], [4, 1], [2, 3]]), '1-4 2-3 5-6');
  const six = S.pairings(6).map(S.keyOf);
  assert.ok(six.includes('1-2 3-4 5-6') && six.includes('1-6 2-3 4-5'), 'a turn of 12|34|56 is a different pairing');
  assert.ok(S.neighbours(8, [1, 8]) && S.neighbours(8, [3, 4]) && !S.neighbours(8, [1, 3]));
});

test('regions: the even test, the trap test, and the child’s own traps', () => {
  assert.equal(S.completions(8, [[1, 4]]).length, 2);
  assert.equal(S.completions(8, [[1, 5]]).length, 0, 'three dots each side');
  assert.equal(S.completions(10, [[1, 6]]).length, 4);
  const r = S.regions(8, [[1, 5]]);
  assert.deepEqual(r.list.map(x => x.free.sort((a, b) => a - b)), [[2, 3, 4], [6, 7, 8]]);
  assert.equal(S.trapCheck(8, [[1, 5]], [[2, 3]], 3).ok, true, 'dot 4 alone, inside three');
  assert.equal(S.trapCheck(8, [[1, 5]], [[2, 3]], 2).why, 'even', 'the part between 2 and 3 holds no dot');
  assert.equal(S.trapCheck(9, [[1, 6]], [[2, 4]], 2).why, 'own', 'four dots inside 1–6: the child trapped dot 3');
  assert.equal(S.trapCheck(7, [], [[2, 3]], 1).ok, true, 'seven dots');
});

test('laying and cutting: crossings and used dots refused, dark strings stay, a tap on a string of yours cuts it', () => {
  const p = byId('strings-02'), q = p.parameters, a = freshAttempt(p);
  assert.deepEqual(S.layProblem(q, a.board, [2, 6]), {why: 'cross', blockers: [[1, 4]]});
  assert.equal(move(p, a, {type: 'lay', s: [2, 6]}), null);
  assert.equal(move(p, a, {type: 'lay', s: [1, 2]}), null, 'a dark dot');
  assert.equal(move(p, a, {type: 'cut', dot: 1}), null, 'a dark string');
  const b = play(p, a, {type: 'lay', s: [5, 6]});
  assert.equal(S.layProblem(q, b.board, [6, 7]).why, 'used');
  assert.deepEqual(S.dotAction(q, b.board, null, 6), {move: {type: 'cut', dot: 6}});
  assert.deepEqual(S.dotAction(q, b.board, null, 2), {ui: {pick: 2}});
  assert.deepEqual(S.dotAction(q, b.board, 2, 2), {ui: {pick: null}});
  assert.deepEqual(S.dotAction(q, b.board, 2, 3), {move: {type: 'lay', s: [2, 3]}});
  assert.deepEqual(S.dotAction(q, b.board, 2, 7), {ui: {tried: {s: [2, 7], why: 'cross', blockers: [[1, 4]]}}}, 'a crossing is shown, not laid');
  assert.equal(S.dotAction(q, b.board, null, 4), null, 'a dark dot does nothing');
  const done = play(p, b, ...lay([2, 3], [7, 8]));
  assert.ok(isSolved(p, done.board));
});

test('Can’t: only after an attempt; a wrong part refused once, kept through Undo; the part tapped outlined; the child’s own trap refused', () => {
  const p = byId('strings-05'), a = freshAttempt(p);
  assert.deepEqual(p.parameters.fixed, [[1, 6], [7, 9]]);
  assert.equal(move(p, a, {type: 'cant', gap: 7}), null, 'Can’t before any string');
  const b = play(p, a, {type: 'lay', s: [2, 3]});
  const wrong = play(p, b, {type: 'cant', gap: 4});
  assert.equal(wrong.board.refused, 4, 'the part with 4 and 5');
  assert.ok(!isSolved(p, wrong.board));
  assert.match(view(p, wrong), /Nothing is trapped there\./);
  assert.equal(move(p, wrong, {type: 'cant', gap: 7}), null, 'one claim per change of the strings');
  const back = undoCarry(p, wrong);
  assert.equal(back.board.refused, 4, 'Undo keeps the refusal');
  assert.equal(move(p, back, {type: 'cant', gap: 7}), null, 'and the lock');
  const moved = play(p, wrong, {type: 'lay', s: [4, 5]});
  assert.equal(moved.board.refused, null, 'a new string unlocks Can’t');
  const right = play(p, b, {type: 'cant', gap: 7});
  assert.ok(isSolved(p, right.board));
  const html = view(p, right);
  assert.match(html, /class="st-trap"/);
  assert.match(html, /class="st-here"/, 'the part tapped is outlined');
  assert.match(html, /Dot 8 can’t join any other dot\. You tapped the part with dot 8\./);
  assert.equal((html.match(/st-dot [a-z]+ ringed/g) || []).length, 1, 'its dot is ringed');
  // Seven dots: the whole circle is trapped; the part tapped is outlined and
  // its five dots ringed.
  const seven = byId('strings-03'), s7 = play(seven, freshAttempt(seven), {type: 'lay', s: [2, 3]}, {type: 'cant', gap: 1});
  const h7 = view(seven, s7);
  assert.match(h7, /There are seven dots, and each string takes two\. You tapped the part with dots 1, 4, 5, 6 and 7\./);
  assert.equal((h7.match(/st-dot [a-z]+ ringed/g) || []).length, 5);
  // The child's own trap is refused with its own words: 2–4 shuts in dot 3,
  // inside a part of the dark strings that can be paired.
  const o = play(p, a, {type: 'lay', s: [2, 4]}, {type: 'cant', gap: 2});
  assert.equal(o.board.refused, 2);
  assert.match(view(p, o), /Your own strings trap it\./);
});

test('pressing Can’t turns the circle’s parts into buttons, unmarked, with focus on the board rather than a part', () => {
  const p = byId('strings-03'), a = play(p, freshAttempt(p), {type: 'lay', s: [2, 3]});
  const off = view(p, a);
  assert.match(off, /data-ui='\{"cant":true\}' data-focus="st-board" aria-pressed="false"/);
  assert.doesNotMatch(off, /data-gap=/);
  M.reset(p);
  M.ui(p, {cant: true});
  const on = view(p, a, true);
  assert.match(on, /mode-regions" viewBox="0 0 100 100" role="group" aria-label="[^"]*" tabindex="-1" data-focus="st-board"/);
  assert.match(on, /data-gap="1"[^>]*data-focus="st-region-1"/);
  assert.equal((on.match(/class="st-region"/g) || []).length, 2, 'both parts look the same: nothing marks the trapped one');
  assert.match(on, /data-focus="st-cant" aria-pressed="true"/);
  assert.doesNotMatch(on, /data-dot=/, 'dots are not controls while Can’t is pressed');
  const fresh = view(p, freshAttempt(p));
  assert.match(fresh, /class="secondary st-button cant"[^>]*disabled/, 'Can’t waits for an attempt');
});

test('a refused Can’t on a board that can be finished says what is true of the part tapped, and holds through Undo', () => {
  const p = byId('strings-02');
  const a = play(p, freshAttempt(p), {type: 'lay', s: [2, 3]}, {type: 'cant', gap: 5});
  assert.equal(a.board.refused, 5);
  assert.match(view(p, a), /<p class="st-told">Nothing is trapped there\.<\/p>/);
  assert.doesNotMatch(view(p, a), /There is a way/, 'the words don’t tell that the board can be finished');
  assert.equal(move(p, a, {type: 'cant', gap: 1}), null, 'no second claim on the same strings');
  const back = undoCarry(p, a);
  assert.equal(back.board.refused, 5);
  assert.match(view(p, back), /Nothing is trapped there\./);
  assert.equal(move(p, back, {type: 'cant', gap: 1}), null, 'nor after Undo');
  const changed = play(p, back, {type: 'lay', s: [5, 6]});
  assert.equal(changed.board.refused, null, 'a new string clears it');
  const own = play(p, freshAttempt(p), {type: 'lay', s: [5, 7]}, {type: 'cant', gap: 5});
  assert.match(view(p, own), /Your own strings trap it\./, '5–7 shuts in dot 6');
});

test('every pairing: each one shelved, found already, there is another, That’s all; Undo keeps the shelf', () => {
  const p = byId('strings-01');
  let a = play(p, freshAttempt(p), ...lay([1, 2], [3, 4], [5, 6]));
  assert.deepEqual(a.board.found, ['1-2 3-4 5-6']);
  const early = play(p, a, {type: 'all'});
  assert.deepEqual(early.board.told, {kind: 'more'});
  assert.match(view(p, early), /There is another\./);
  assert.equal(move(p, early, {type: 'all'}), null, 'That’s all again waits for a new pairing');
  assert.deepEqual(undoCarry(p, early).board.told, {kind: 'more'}, 'Undo keeps it');
  a = play(p, a, {type: 'cut', dot: 1}, {type: 'lay', s: [1, 2]});
  assert.deepEqual(a.board.told, {kind: 'again', key: '1-2 3-4 5-6'});
  assert.match(view(p, a), /Found already\./);
  assert.match(view(p, a), /<li class="again">/);
  const back = undoCarry(p, a);
  assert.deepEqual(back.board.found, ['1-2 3-4 5-6'], 'Undo keeps the shelf');
  for (const k of ['1-2 3-6 4-5', '1-4 2-3 5-6', '1-6 2-3 4-5', '1-6 2-5 3-4']) {
    for (const s of a.board.strings.slice()) a = play(p, a, {type: 'cut', dot: s[0]});
    a = play(p, a, ...lay(...S.fromKey(k)));
  }
  assert.equal(a.board.found.length, 5);
  assert.ok(!isSolved(p, a.board), 'not solved until That’s all');
  const html = view(p, a);
  assert.doesNotMatch(html, /\bof \d|five|\d+ (pairings|found|left)/i, 'no count on the page');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('neighbours: refused like crossings; Can’t needs two strings; just two dots on a side certify it; refusals say why', () => {
  const p = byId('strings-07'), q = p.parameters, a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'lay', s: [4, 5]}), null);
  assert.equal(move(p, a, {type: 'lay', s: [1, 10]}), null, 'round the top');
  assert.deepEqual(S.dotAction(q, a.board, 4, 5), {ui: {tried: {s: [4, 5], why: 'neighbours', blockers: []}}});
  M.reset(p); M.ui(p, {tried: {s: [4, 5], why: 'neighbours', blockers: []}});
  assert.match(view(p, a, true), /Those two are neighbours\./);
  const one = play(p, a, {type: 'lay', s: [1, 4]});
  assert.equal(move(p, one, {type: 'cant', s: [1, 4]}), null, 'one string is not enough, even a stuck one');
  assert.match(view(p, one), /class="secondary st-button cant"[^>]*disabled/);
  // An odd side is the string's own doing.
  const odd = play(p, a, ...lay([1, 3], [4, 9]));
  const no = play(p, odd, {type: 'cant', s: [1, 3]});
  assert.deepEqual(no.board.refused, [1, 3]);
  assert.match(view(p, no), /This string leaves dot 2 on its own\./);
  assert.equal(S.neighbourRefusal(10, [[1, 5], [6, 8]], [1, 5]), 'This string leaves an odd number of dots on one side.');
  const wide = play(p, a, ...lay([1, 6], [7, 9]));
  assert.equal(S.neighbourRefusal(10, wide.board.strings, [1, 6]), 'A string can still go beside it.', 'four free dots inside');
  assert.equal(S.neighbourRefusal(10, [[1, 6], [2, 5], [7, 9]], [1, 6]), 'It has strings on both sides.');
  const two = play(p, a, ...lay([1, 6], [2, 5]));
  const stuck = play(p, two, {type: 'cant', s: [2, 5]});
  assert.ok(isSolved(p, stuck.board), 'dots 3 and 4 are left inside 2–5, and they are neighbours');
  const html = view(p, stuck);
  assert.match(html, /class="st-ghost"/, 'the forced neighbour string is drawn dashed');
  assert.match(html, /Only dots 3 and 4 are left beside the string, and they are neighbours\./);
  assert.equal(move(p, two, {type: 'cant', s: [1, 6]}).board.refused[0], 1, 'the other string is refused');
});

test('paths: the stack rule, the decode board marks steps that go the other way', () => {
  assert.deepEqual(S.pairingOfWord('UUDUDD'), [[1, 6], [2, 3], [4, 5]]);
  assert.equal(S.codeOf(6, [[1, 6], [2, 3], [4, 5]]), 'UUDUDD');
  assert.equal(S.codeOf(6, [[2, 5]]), '.U..D.');
  const p = byId('strings-04'), a = play(p, freshAttempt(p), {type: 'lay', s: [1, 2]});
  const html = view(p, a);
  assert.match(html, /st-step off/, 'step 2 goes down where the path goes up');
  assert.match(html, /Step 2 go the other way\.|Steps? 2 go/);
  const done = play(p, freshAttempt(p), ...lay([2, 3], [4, 5], [1, 6]));
  assert.ok(isSolved(p, done.board));
});

test('trees: grow and prune, the walk over the path, hints name dots by their up step', () => {
  const p = byId('strings-08'), a = freshAttempt(p);
  assert.equal(S.walkOf(S.treeOfParents([0, 1, 1, 1])), 'UUDUDUDD');
  assert.equal(S.walkOf(S.treeOfStrings([[1, 6], [2, 3], [4, 5], [7, 10], [8, 9]])), 'UUDUDDUUDD');
  assert.deepEqual(S.pruned([0, 1, 2, 0, 4], 2), [0, 0, 2], 'taking an edge away takes what hangs below it');
  assert.equal(nextHint(p, a).text, 'Give the root a child.');
  const b = play(p, a, {type: 'grow', at: 0});
  assert.equal(nextHint(p, b).text, 'Give the dot at the top of step 1 a child.');
  const c = play(p, b, {type: 'grow', at: 1}, {type: 'grow', at: 2});
  assert.equal(nextHint(p, c).text, 'Take away the edge walked up at step 3.');
  const done = play(p, b, {type: 'grow', at: 1}, {type: 'grow', at: 1}, {type: 'grow', at: 1});
  assert.ok(isSolved(p, done.board));
  const html = view(p, b);
  assert.match(html, /data-grow="0"/);
  assert.match(html, /data-prune="1"/);
  assert.match(html, /class="st-over/, 'the walk is drawn over the path');
});

test('strings for a tree: your tree is drawn beside the goal, = when they match', () => {
  const p = byId('strings-11'), a = play(p, freshAttempt(p), ...lay([1, 6], [2, 3]));
  assert.match(view(p, a), /<span class="st-vs" aria-hidden="true">≠<\/span>/);
  const done = play(p, a, ...lay([4, 5], [7, 10], [8, 9]));
  assert.ok(isSolved(p, done.board));
});

test('swaps: a corner swaps two steps; the same corner takes it back; only the fewest solves; the certificate after', () => {
  const p = byId('strings-09'), a = freshAttempt(p);
  assert.equal(S.dBeforeU('UDUDUDUD'), 6);
  assert.equal(S.swapDistance('UDUDUDUD', 'UUUUDDDD'), 6);
  assert.equal(S.swapDistance('UUUDDDUDUD', 'UDUDUUUDDD'), 6);
  assert.deepEqual(S.corners('UDUDUDUD').map(c => c.at), [2, 4, 6], 'peaks at height 1 cannot be swapped');
  const b = play(p, a, {type: 'swap', at: 2});
  assert.deepEqual(b.board.route, [2]);
  assert.deepEqual(play(p, b, {type: 'swap', at: 2}).board.route, [], 'the same corner takes it back');
  assert.equal(move(p, a, {type: 'swap', at: 1}), null, 'a peak at height 1');
  assert.equal(move(p, a, {type: 'swap', at: 3}), null, 'a peak at height 1');
  let w = a;
  for (const at of p.solution.route) w = play(p, w, {type: 'swap', at});
  assert.ok(isSolved(p, w.board));
  const html = view(p, w);
  assert.match(html, /st-diamond/);
  assert.match(html, /3 \+ 2 \+ 1 \+ 0 = 6/, 'the D-before-U count, after the solve');
  assert.doesNotMatch(view(p, a), /= 6|st-card/, 'no count before the solve');
  // The target the long way round is not a solve.
  const wasted = play(p, a, {type: 'swap', at: 2}, {type: 'swap', at: 4}, {type: 'swap', at: 2});
  assert.deepEqual(wasted.board.route, [2, 4, 2]);
  assert.deepEqual(nextHint(p, wasted).action, {type: 'swap', at: 2}, 'the hint takes back a wasted swap');
  assert.equal(nextHint(p, wasted).text, 'Swap steps 2 and 3 back.');
  // The target the long way round is not a solve.
  const long = play(p, a, ...[2, 4, 2, 6, 2, 3, 5, 4].map(at => ({type: 'swap', at})));
  assert.equal(S.replay(p.parameters.start, long.board.route), 'UUUUDDDD');
  assert.ok(!isSolved(p, long.board), 'eight swaps is not the fewest');
  assert.match(view(p, long), /Fewer swaps can do it\./);
});

test('taps go to the nearest dot or string, also where targets are close', () => {
  const [x1, y1] = S.dotAt(12, 1), [x2, y2] = S.dotAt(12, 2);
  assert.equal(S.nearestDot(12, [x1 + (x2 - x1) * 0.45, y1 + (y2 - y1) * 0.45]), 1);
  assert.equal(S.nearestDot(12, [x1 + (x2 - x1) * 0.55, y1 + (y2 - y1) * 0.55]), 2);
  assert.equal(S.nearestDot(12, [50, 50]), null, 'the middle is no dot');
  // Two nested strings: 1–6 is the line x = 50 and 2–5 the line x = 72.33.
  const nested = [[1, 6], [2, 5]];
  assert.equal(S.dotAt(10, 2)[0].toFixed(2), S.dotAt(10, 5)[0].toFixed(2));
  assert.deepEqual(S.nearestString(10, nested, [56, 50]), [1, 6]);
  assert.deepEqual(S.nearestString(10, nested, [66.4, 50]), [2, 5]);
  assert.equal(S.nearestString(10, nested, [61, 50]), null, 'a tap far from both takes neither');
  const between = t => S.dotAt(10, 6).map((v, k) => v + (S.dotAt(10, 7)[k] - v) * t);
  assert.deepEqual(S.nearestString(10, [[1, 6], [7, 10]], between(0.3), 9), [1, 6], 'between strings ending at neighbouring dots 6 and 7: the nearer');
  assert.deepEqual(S.nearestString(10, [[1, 6], [7, 10]], between(0.7), 9), [7, 10]);
  // While Can't is pressed: a tap on or around a free dot claims that dot's
  // part; inside the circle, the part under the finger; just outside, the
  // part touching the rim there; far away, nothing.
  const all = [[1, 6], [7, 9], [2, 3]], out = (d, k) => S.dotAt(10, d).map(v => 50 + (v - 50) * k);
  for (const k of [1, 1.12, 1.25, 0.9]) assert.deepEqual(S.partAt(10, all, out(8, k)).free, [8], `dot 8 at ${k}`);
  for (const k of [1, 1.2, 0.88]) assert.deepEqual(S.partAt(10, all, out(10, k)).free, [10], `dot 10 at ${k}`);
  assert.deepEqual([...S.partAt(10, all, out(4, 1.15)).free].sort(), [4, 5], 'outside dot 4');
  assert.deepEqual(S.partAt(10, all, [50, 50]).free.sort(), [4, 5], 'the middle, beside 1–6');
  assert.deepEqual(S.partAt(10, all, [40, 50]).free, [10], 'left of 1–6: the part with 10');
  assert.equal(S.partAt(10, all, [2, 2]), null, 'a corner of the drawing is no part');
});

test('hints: an attempt before Can’t, then the reason alone, with the button marked at level 2; the guide’s one-dot duplicate test is not used', () => {
  const p = byId('strings-03'), a = freshAttempt(p);
  assert.equal(nextHint(p, a).action.type, 'lay');
  const b = play(p, a, nextHint(p, a).action);
  const h = nextHint(p, b);
  assert.equal(h.action.type, 'cant');
  assert.equal(h.text, 'There are seven dots, and each string takes two.');
  assert.ok(S.regionOf(7, b.board.strings, h.dot).gaps.includes(h.action.gap), 'the dot marked lies on the part the hint taps');
  // Level 1 after a move: the reason, not the button.
  const one = view(p, {...b, hintLevel: 1});
  assert.match(one, /There are seven dots, and each string takes two\./);
  assert.doesNotMatch(one, /Press Can’t/);
  assert.doesNotMatch(one, /st-button cant hinted/);
  // Level 2 marks the button; once pressed, it marks the part.
  assert.match(view(p, {...b, hintLevel: 2}), /st-button cant hinted/);
  M.reset(p);
  M.ui(p, {cant: true});
  const pressed = view(p, {...b, hintLevel: 2}, true);
  assert.match(pressed, new RegExp(`class="st-region hinted"[^>]*data-gap="${h.action.gap}"`));
  assert.match(pressed, new RegExp(`class="st-dot free hinted"><circle class="st-ring" cx="${S.dotAt(7, h.dot)[0].toFixed(2).replace(/\.?0+$/, '')}`), 'and a dot of it');
  assert.doesNotMatch(view(p, {...b, hintLevel: 2}), /st-dot [a-z]+ hinted/, 'before Can’t is pressed, only the button');
  assert.doesNotMatch(pressed, /st-button cant hinted/);
  const five = byId('strings-05'), f = play(five, freshAttempt(five), nextHint(five, freshAttempt(five)).action);
  assert.deepEqual(f.board.strings, [[2, 3]]);
  assert.match(nextHint(five, f).text, /^Dot (8|10) can’t join any other dot\.$/);
  assert.equal(nextHint(five, f).dot, Number(nextHint(five, f).text.match(/\d+/)[0]));
  const n = byId('strings-07'), first = nextHint(n, freshAttempt(n));
  assert.equal(first.text, 'Join 1 and 4.');
  const second = nextHint(n, play(n, freshAttempt(n), first.action));
  assert.equal(second.action.type, 'lay', 'a second string before Can’t');
  const after = nextHint(n, play(n, freshAttempt(n), first.action, second.action));
  assert.equal(after.text, 'Dots 2 and 3 are alone on one side of the string from 1 to 4, and they are neighbours.');
  assert.deepEqual(after.action, {type: 'cant', s: [1, 4]});
  const all = byId('strings-01'), full = play(all, freshAttempt(all), ...S.pairings(6).flatMap(w => [...lay(...w), ...w.map(s => ({type: 'cut', dot: s[0]}))]));
  assert.equal(nextHint(all, full).text, 'Every pairing is on the shelf.');
  for (const p of strings.puzzles) assert.doesNotMatch(JSON.stringify(p), /single numbered dot|only the partners/i, p.id);
  assert.match(byId('strings-10').hints.join(' '), /every dot has the same partner/);
});

test('the playground: two to twelve dots, a path and a tree, never solved, no hints', () => {
  const p = byId('strings-playground'), a = freshAttempt(p);
  assert.equal(a.board.n, 6);
  assert.ok(M.noHint(p));
  const b = play(p, a, ...lay([1, 2], [3, 6], [4, 5]));
  assert.ok(!isSolved(p, b.board));
  const html = view(p, b);
  assert.match(html, /Path U D U U D D/);
  assert.match(html, /st-fewer/);
  const c = play(p, b, {type: 'size', n: 4});
  assert.deepEqual(c.board.strings, [[1, 2]]);
  assert.equal(move(p, a, {type: 'size', n: 13}), null);
});

test('forged saves are rejected', () => {
  const p5 = byId('strings-05'), p1 = byId('strings-01'), p7 = byId('strings-07'), p9 = byId('strings-09');
  for (const [p, board, why] of [
    [p5, {strings: [[2, 3]], claimed: 4, refused: null}, 'a claim on a part with no trapped dot'],
    [p5, {strings: [[2, 4]], claimed: 2, refused: null}, 'a claim on the child’s own trap'],
    [p5, {strings: [], claimed: 7, refused: null}, 'a claim before any string'],
    [p5, {strings: [[2, 4], [5, 8]], claimed: null, refused: null}, 'a string across a dark one'],
    [p1, {strings: [[1, 2], [3, 4], [5, 6]], found: ['1-2 3-4 5-6'], told: {kind: 'again', key: '1-2 3-4 5-6', more: 'yes'}, done: false}, 'a repeat lock that is not true'],
    [p7, {strings: [[1, 4]], claimed: [1, 4], refused: null}, 'a claim with one string'],
    [p7, {strings: [[1, 3], [4, 9]], claimed: [1, 3], refused: null}, 'a claim on an odd side'],
    [p1, {strings: [], found: ['1-2 3-4 5-6'], told: null, done: true}, 'That’s all with one found'],
    [p1, {strings: [[1, 2], [3, 4], [5, 6]], found: [], told: null, done: false}, 'a pairing made and not shelved'],
    [p7, {strings: [[1, 2]], claimed: null, refused: null}, 'neighbours'],
    [p9, {route: [1]}, 'a path below the line'],
    [p9, {route: [2, 2]}, 'the same corner twice in a row']
  ]) assert.equal(validBoard(p, board), false, why);
});

test('every puzzle renders; one line of goal; nothing names the answer before the solve', () => {
  for (const p of strings.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /st-puzzle/, p.id);
    assert.match(html, /role="status"/, p.id);
    if (p.parameters.mode !== 'playground') assert.ok(p.visibleObjective.length < 50, p.id);
  }
});

test('dot tap circles reach as far as they can without overlapping a neighbour', () => {
  let seen = 0;
  for (const p of strings.puzzles) {
    const hits = [...view(p, freshAttempt(p)).matchAll(/class="st-dot-hit" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
    seen += hits.length;
    for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) assert.ok(Math.hypot(hits[i][0] - hits[j][0], hits[i][1] - hits[j][1]) >= hits[i][2] + hits[j][2], `${p.id}: dot circles ${i} and ${j} overlap`);
    assert.ok(hits.every(h => h[2] <= 8.5));
  }
  assert.ok(seen > 50);
});
