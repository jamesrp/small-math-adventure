// Polygon cuts: the polygons and their lines, drawing and erasing, flips,
// collecting every way, flipping to a card, odd ways home, tours of every
// way, the playground, hints, saves and rendering. The counts and distances
// are checked against independent methods in scripts/validate-cuts.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {polygonOf, diagonalOf, crosses, legalSet, pieces, flipOf, flip, keyOf, fromKey, fanOf, fillings, completions, apexOf, flipMap, distancesTo} from '../dist/families/cuts/polygon.js';
import {HOME_LIMIT, PLAY_SIZES} from '../dist/families/cuts/cuts.js';
import {validateCuts} from '../scripts/validate-cuts.mjs';
import {loadPack} from '../scripts/packs.mjs';

const cuts = JSON.parse(await readFile(new URL('../dist/families/cuts/cuts.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => cuts.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const P5 = polygonOf(5), P6 = polygonOf(6), P8 = polygonOf(8);
const line = (P, name) => P.names.indexOf(name);
const draw = (P, name) => { const [a, b] = P.diagonals[line(P, name)]; return {type: 'draw', a, b}; };
const flipLine = (P, name) => ({type: 'flip', d: line(P, name)});
const keepLine = byId('cuts-01'), five = byId('cuts-02'), round = byId('cuts-03'), fanToFan = byId('cuts-05');
const oddHome = byId('cuts-06'), oneMore = byId('cuts-07'), fourteen = byId('cuts-08'), everyOnce = byId('cuts-11'), ground = byId('cuts-playground');

test('the pack validates: counts match independent methods, hints solve, illegal moves fail', async () => {
  const report = await validateCuts();
  assert.equal(report.cutsPuzzles, 11);
  assert.equal(report.hexagonPairsOneShort, 8);
});

test('polygons: lines between corners that are not neighbours, and when two cross', () => {
  assert.equal(polygonOf(3), null);
  assert.equal(polygonOf(9), null);
  assert.deepEqual(P5.names, ['AC', 'AD', 'BD', 'BE', 'CE']);
  assert.equal(P6.names.length, 9);
  assert.equal(P8.names.length, 20);
  assert.equal(diagonalOf(P6, 0, 1), -1, 'a side is not a line');
  assert.equal(diagonalOf(P6, 5, 0), -1, 'nor is the side FA');
  assert.equal(diagonalOf(P6, 3, 0), line(P6, 'AD'));
  assert.ok(crosses(P6, line(P6, 'AD'), line(P6, 'BE')));
  assert.equal(crosses(P6, line(P6, 'AD'), line(P6, 'AC')), false, 'lines that share a corner don’t cross');
  assert.equal(crosses(P6, line(P6, 'AC'), line(P6, 'DF')), false);
  assert.ok(legalSet(P6, fromKey(P6, 'AC AD AE')));
  assert.equal(legalSet(P6, [line(P6, 'AD'), line(P6, 'BE')].sort()), false);
  assert.equal(fromKey(P6, 'AD BE'), null, 'crossing lines are not a key');
  assert.equal(fromKey(P6, 'AB'), null);
});

test('ways: Catalan counts, n − 3 lines, n − 2 triangles, n − 3 flips', () => {
  assert.deepEqual([4, 5, 6, 7, 8].map(n => fillings(polygonOf(n)).length), [2, 5, 14, 42, 132]);
  for (const n of [4, 5, 6, 7, 8]) {
    const P = polygonOf(n);
    for (const ds of fillings(P)) {
      assert.equal(ds.length, n - 3);
      assert.ok(pieces(P, ds).every(f => f.length === 3));
      assert.equal(pieces(P, ds).length, n - 2);
      assert.equal(flipMap(P).get(keyOf(P, ds)).length, n - 3);
    }
  }
  assert.deepEqual(completions(P5, fromKey(P5, 'AC')).map(ds => keyOf(P5, ds)).sort(), ['AC AD', 'AC CE']);
  assert.equal(completions(P6, fromKey(P6, 'AD')).length, 4);
  assert.deepEqual([1, 2, 3, 4].map(k => fillings(P6).filter(ds => apexOf(P6, ds) === k).length), [5, 2, 2, 5], 'by the triangle on AF');
});

test('flips: the other diagonal of the four-sided piece', () => {
  const ds = fromKey(P6, 'BD BE BF');
  assert.equal(P6.names[flipOf(P6, ds, line(P6, 'BF'))], 'AE');
  assert.equal(keyOf(P6, flip(P6, ds, line(P6, 'BE'))), 'BD BF DF');
  assert.equal(flipOf(P6, ds, line(P6, 'AC')), -1, 'a line not drawn');
  const part = fromKey(P6, 'AD');
  assert.equal(flipOf(P6, part, line(P6, 'AD')), -1, 'beside four-sided pieces, nothing to flip');
  assert.deepEqual(fanOf(P6, 0).map(d => P6.names[d]), ['AC', 'AD', 'AE']);
  const dist = distancesTo(P6, 'AC AD AE');
  for (const ds of fillings(P6)) assert.equal(dist.get(keyOf(P6, ds)), 3 - ds.filter(d => P6.diagonals[d].includes(0)).length, 'the fan rule');
  assert.equal(distancesTo(P8, 'AE BD BE EG EH').get('AC AD DF DG DH'), 5);
});

test('finding every way: draw, a full way joins the row, That’s all checks the list, Undo keeps finds', () => {
  const p = keepLine, m = mechanicFor(p), fresh = freshAttempt(p);
  assert.deepEqual(fresh.board.diags, [line(P5, 'AC')]);
  assert.equal(move(p, fresh, {type: 'erase', d: line(P5, 'AC')}), null, 'the thick line stays');
  assert.equal(move(p, fresh, draw(P5, 'BD')), null, 'BD crosses AC');
  const one = play(p, fresh, draw(P5, 'AD'));
  assert.deepEqual(one.board.found, ['AC AD']);
  const early = play(p, one, {type: 'claim'});
  assert.ok(early.board.missed && !isSolved(p, early.board));
  assert.match(view(p, early), /There’s another\./);
  const back = undo(one), kept = {...back, board: m.carry(p, one.board, back.board)};
  assert.deepEqual(kept.board.found, ['AC AD'], 'Undo keeps the way found');
  const two = play(p, kept, draw(P5, 'CE'), {type: 'claim'});
  assert.ok(isSolved(p, two.board));
  assert.match(view(p, two), /ct-shelf/);
  assert.equal(move(p, two, {type: 'clear'}), null, 'no moves after a solve');
});

test('every way of the pentagon, sorted on the row by the triangle on AE', () => {
  const p = five;
  let a = freshAttempt(p);
  for (const key of ['AC AD', 'AD BD', 'BD BE', 'BE CE', 'AC CE']) {
    a = a.board.diags.length ? play(p, a, {type: 'clear'}) : a;
    a = play(p, a, ...key.split(' ').map(name => draw(P5, name)));
  }
  assert.equal(a.board.found.length, 5);
  const html = view(p, a);
  assert.equal((html.match(/<li class="ct-group">/g) || []).length, 3, 'three groups: B, C and D on side AE');
  assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board));
  assert.equal(nextHint(p, freshAttempt(p)).action.type, 'draw');
});

test('flipping to a card: a flip per tap, the budget, and hints', () => {
  const p = fanToFan, fresh = freshAttempt(p);
  const a = play(p, fresh, flipLine(P6, 'BF'), flipLine(P6, 'BE'), flipLine(P6, 'BD'));
  assert.deepEqual(a.board.path, ['BD BE BF', 'AE BD BE', 'AD AE BD', 'AC AD AE']);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, fresh, draw(P6, 'AC')), null, 'no drawing');
  const wasted = play(p, fresh, flipLine(P6, 'BD'));
  assert.equal(nextHint(p, wasted).type, 'deadend', 'BD → CF moves away from the card');
  const hint = nextHint(p, fresh);
  assert.equal(hint.action.type, 'flip');
  assert.match(view(p, {...fresh, hintLevel: 2}), /ct-hit hinted/);
  // Out of flips.
  const out = play(p, fresh, flipLine(P6, 'BD'), flipLine(P6, 'BE'), flipLine(P6, 'BF'));
  assert.ok(!isSolved(p, out.board));
  const last = fromKey(P6, out.board.path.at(-1));
  assert.ok(last.every(d => move(p, out, {type: 'flip', d}) === null), 'no flip past the budget');
  assert.match(view(p, out), /Flips <strong class="over">3<\/strong> \/ 3/);
});

test('one more flip: no first flip draws a line of the card', () => {
  const p = oneMore, fresh = freshAttempt(p), card = p.parameters.target.split(' ');
  const firsts = fromKey(P6, p.parameters.start).map(d => play(p, fresh, {type: 'flip', d}).board.path[1].split(' ').find(x => !p.parameters.start.split(' ').includes(x)));
  assert.deepEqual(firsts.sort(), ['AC', 'BE', 'DF']);
  assert.ok(firsts.every(x => !card.includes(x)));
  assert.ok(isSolved(p, play(p, fresh, flipLine(P6, 'CE'), flipLine(P6, 'CF'), flipLine(P6, 'BF'), flipLine(P6, 'DF')).board));
});

test('an odd way home: five flips round a pentagon ring; out and back is even', () => {
  const p = oddHome, fresh = freshAttempt(p);
  const back = play(p, fresh, flipLine(P6, 'AC'), flipLine(P6, 'BD'));
  assert.equal(back.board.path.at(-1), 'AC AD AE');
  assert.ok(!isSolved(p, back.board), 'two flips is even');
  const ring = play(p, fresh, flipLine(P6, 'AC'), flipLine(P6, 'AD'), flipLine(P6, 'BD'), flipLine(P6, 'BE'), flipLine(P6, 'CE'));
  assert.equal(ring.board.path.at(-1), 'AC AD AE');
  assert.ok(isSolved(p, ring.board));
  assert.equal(validBoard(p, {path: [...Array(HOME_LIMIT + 2)].map((_, i) => (i % 2 ? 'AD AE BD' : 'AC AD AE'))}), false, 'a walk past the limit');
});

test('touring every way: no way twice, home at the end, and a stuck route is a dead end', () => {
  const p = round, fresh = freshAttempt(p);
  const one = play(p, fresh, flipLine(P5, 'AC'));
  assert.equal(move(p, one, flipLine(P5, 'BD')), null, 'straight back is a way twice');
  const a = play(p, one, flipLine(P5, 'AD'), flipLine(P5, 'BD'), flipLine(P5, 'BE'), flipLine(P5, 'CE'));
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /ct-trail/);
  const q = everyOnce;
  let b = freshAttempt(q), next;
  const flips = x => fromKey(P6, x.board.path.at(-1)).map(d => move(q, x, {type: 'flip', d})).filter(Boolean);
  while ((next = flips(b)[0]) && !isSolved(q, next.board)) b = next;
  assert.equal(next, undefined, 'taking the first flip each time gets stuck');
  assert.equal(nextHint(q, b).type, 'deadend');
});

test('the playground: five shapes, draw, flip or erase, clear', () => {
  const p = ground, fresh = freshAttempt(p), m = mechanicFor(p);
  assert.deepEqual(PLAY_SIZES, [4, 5, 6, 7, 8]);
  assert.equal(fresh.board.n, 6);
  const a = play(p, fresh, draw(P6, 'AC'), draw(P6, 'AD'), draw(P6, 'AE'));
  assert.deepEqual(play(p, a, flipLine(P6, 'AD')).board.diags.map(d => P6.names[d]), ['AC', 'AE', 'CE']);
  assert.deepEqual(play(p, a, {type: 'erase', d: line(P6, 'AD')}).board.diags.map(d => P6.names[d]), ['AC', 'AE']);
  assert.equal(move(p, play(p, fresh, draw(P6, 'AD')), flipLine(P6, 'AD')), null, 'a line beside four-sided pieces can’t flip');
  const oct = play(p, a, {type: 'size', n: 8});
  assert.deepEqual(oct.board, {n: 8, diags: []});
  assert.match(view(p, oct), /aria-label="Octagon\. No lines"/);
  m.ui(p, {tool: 'erase'});
  assert.match(view(p, a), /aria-label="Line AD\. Erase"/);
  m.reset(p);
  assert.match(view(p, a), /aria-label="Line AD\. Flip"/);
  assert.equal(nextHint(p, a).type, 'done');
});

test('rendering: labelled corners, controls with names, notes that say why a tap did nothing', () => {
  const p = fourteen, m = mechanicFor(p), fresh = freshAttempt(p), html = view(p, fresh);
  assert.match(html, /data-mechanic-wire="cuts"/);
  assert.equal((html.match(/data-tg-point=/g) || []).length, 6, 'every corner is a control');
  assert.match(html, /aria-label="Corner A"/);
  assert.match(html, /Find every way to cut it into triangles\./);
  m.ui(p, {sel: 0});
  assert.match(view(p, fresh), /aria-label="Corner A, chosen"/);
  m.ui(p, {sel: null, refused: line(P6, 'BE'), note: 'cross'});
  assert.match(view(p, fresh), /Lines can’t cross\./);
  assert.match(view(p, fresh), /class="ct-refused"/);
  m.reset(p);
  assert.doesNotMatch(view(p, fresh), /ct-note/);
  const reach = view(byId('cuts-09'), freshAttempt(byId('cuts-09')));
  assert.match(reach, /aria-label="Goal card"/);
  assert.match(reach, /Flips <strong class="">0<\/strong> \/ 3/);
  assert.match(view(oddHome, freshAttempt(oddHome)), /aria-label="Home"/);
  assert.match(view(keepLine, freshAttempt(keepLine)), /class="ct-line kept"/);
});
