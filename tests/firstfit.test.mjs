// Neighbor Lanterns first fit and why not fewer (dist/families/firstfit/firstfit.js):
// the first-fit rule, the most colours an order can use, target and claim
// puzzles, colouring with the fewest colours and proving it, saves and the
// two satchel groups.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {firstFit, mostColors, completeOrder, shows, fewestColors} from '../dist/families/firstfit/firstfit.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/firstfit/firstfit.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const run = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const taps = (p, names) => names.map(name => ({type: 'tap', vertex: p.parameters.vertices.indexOf(name)}));

test('first fit gives each lantern the first colour its lit neighbours lack', () => {
  const q = byId('firstfit-01').parameters;
  assert.deepEqual(firstFit(q, [0, 1, 2, 3]), [1, 2, 1, 2]);
  assert.deepEqual(firstFit(q, [0, 3, 1, 2]), [1, 2, 3, 1]);
  assert.equal(mostColors(q), 3);
  assert.equal(mostColors(byId('firstfit-02').parameters), 2, 'the square never reaches 3');
  assert.equal(mostColors(byId('firstfit-04').parameters), 4);
  assert.equal(completeOrder(byId('firstfit-04').parameters, [], 5), null);
});

test('a target puzzle: the order decides, Again clears, Undo takes back a tap', () => {
  const p = byId('firstfit-01');
  let a = run(p, freshAttempt(p), taps(p, ['A', 'B', 'C', 'D']));
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /This order used 2 colours. The goal is 3./);
  assert.equal(move(p, a, {type: 'tap', vertex: 0}), null, 'a finished order takes no more taps');
  assert.equal(nextHint(p, a).action.type, 'again');
  a = run(p, a, [{type: 'again'}, ...taps(p, ['A', 'D', 'B'])]);
  assert.deepEqual(undo(a).board.order, [0, 3]);
  a = run(p, a, taps(p, ['C']));
  assert.ok(isSolved(p, a.board));
});

test('hints build an order that reaches the target, even from a bad start', () => {
  const p = byId('firstfit-04');
  let a = run(p, freshAttempt(p), taps(p, ['A']));
  assert.equal(nextHint(p, a).action.type, 'again', 'A first takes colour 1 and can never take 4');
  a = freshAttempt(p);
  for (let i = 0; i < 20 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  assert.match(nextHint(p, freshAttempt(p)).text, /Tap . next. It takes colour \d./);
});

test('claims: refused when an order exists, accepted when none does, after one finished order', () => {
  const no = byId('firstfit-05');
  assert.equal(nextHint(no, freshAttempt(no)).type, 'note');
  assert.equal(move(no, freshAttempt(no), {type: 'claim'}), null);
  const done = run(no, freshAttempt(no), no.parameters.vertices.map((_, vertex) => ({type: 'tap', vertex})));
  assert.ok(isSolved(no, move(no, done, {type: 'claim'}).board));
  const yes = byId('firstfit-06');
  const tried = run(yes, freshAttempt(yes), yes.parameters.vertices.map((_, vertex) => ({type: 'tap', vertex})));
  const refused = move(yes, tried, {type: 'claim'});
  assert.equal(refused.board.wrong, true);
  assert.match(mechanicFor(yes).render(yes, refused), /Some order does use 4 colours/);
  assert.ok(isSolved(yes, run(yes, freshAttempt(yes), taps(yes, ['A', 'a', 'B', 'b', 'C', 'c', 'D', 'd'])).board), 'partners in pairs');
});

test('proofs: a clique shows its size, an odd ring in order shows 3', () => {
  const ring = byId('fewest-03').parameters, idx = names => names.map(v => ring.vertices.indexOf(v));
  assert.equal(shows(ring, idx(['A', 'B', 'C', 'D', 'E'])), 3);
  assert.equal(shows(ring, idx(['A', 'C', 'B', 'D', 'E'])), 0, 'not in ring order');
  assert.equal(shows(ring, idx(['A', 'B'])), 2);
  assert.equal(shows(ring, idx(['A', 'C'])), 0);
  const four = byId('fewest-05').parameters;
  assert.equal(shows(four, ['A', 'D', 'F', 'H'].map(v => four.vertices.indexOf(v))), 4);
  assert.equal(fewestColors(four), 4);
  assert.equal(fewestColors(byId('fewest-02').parameters), 2);
});

test('why not fewer: colour, prove, check; a proof must match the colours used', () => {
  const p = byId('fewest-01');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'prove'}), null, 'colour every lantern first');
  // A, B, C, D, E with colours 1, 2, 3, 4, 1: proper but wasteful.
  const paint = (x, colors) => colors.reduce((y, c, vertex) => y.board.colors[vertex] === c ? y : run(p, y.board.selected === c ? y : run(p, y, [{type: 'palette', color: c}]), [{type: 'tap', vertex}]), x);
  a = paint(a, [1, 2, 3, 4, 1]);
  a = run(p, a, [{type: 'prove'}, ...taps(p, ['A', 'B', 'C']), {type: 'check'}]);
  assert.ok(!isSolved(p, a.board), 'the triangle shows 3, but the lanterns use 4');
  assert.match(mechanicFor(p).render(p, a), /at least 3 colours are needed, but your lanterns use 4/);
  assert.equal(nextHint(p, a).action.type, 'recolour');
  a = run(p, a, [{type: 'recolour'}]);
  a = paint(a, [1, 2, 3, 1, 2]);
  a = run(p, a, [{type: 'prove'}, ...taps(p, ['A', 'B', 'C']), {type: 'check'}]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /3 colours, and no fewer/);
});

test('hints alone finish every why-not-fewer puzzle', () => {
  for (const p of pack.puzzles.filter(p => p.mechanic === 'fewest')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 60 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('saves: forged orders, claims and proofs are rejected', () => {
  const p = byId('firstfit-02');
  assert.ok(validBoard(p, {order: [0, 2], tried: 0, claimed: false, wrong: false}));
  assert.equal(validBoard(p, {order: [0, 1, 2, 3], tried: 0, claimed: false, wrong: false}), false, 'a finished order counts as tried');
  assert.equal(validBoard(p, {order: [], tried: 0, claimed: true, wrong: false}), false, 'a claim needs a finished order');
  assert.ok(validBoard(p, {order: [], tried: 1, claimed: true, wrong: false}));
  assert.equal(validBoard(byId('firstfit-06'), {order: [], tried: 1, claimed: true, wrong: false}), false, 'a false claim cannot be saved');
  const f = byId('fewest-01');
  assert.equal(validBoard(f, {colors: [1, 1, 2, 1, 2], selected: 1, proving: true, proof: [], checked: false}), false, 'proving needs a proper colouring');
});

test('the puzzles appear as First fit and Why not fewer groups in Neighbor Lanterns', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const color = html.slice(html.indexOf('data-view-key="family-color"'));
  const family = color.slice(0, color.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>First fit</h2>'));
  assert.ok(family.indexOf('<h2>First fit</h2>') < family.indexOf('<h2>Why not fewer</h2>'));
  assert.equal([...family.matchAll(/data-id="firstfit-/g)].length, 7);
  assert.equal([...family.matchAll(/data-id="fewest-/g)].length, 5);
});
