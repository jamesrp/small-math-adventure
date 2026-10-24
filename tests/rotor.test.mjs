// Flip switches: the machine against the worksheet guide's keys, the
// switches set only before the first counter, Send, the rows and wrong
// letters, Can't with its proofs and refusals, finding every order with Keep
// and That's all, Undo's locks, the claim as view state, the playground,
// hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {run, lettersOf, allStarts, ordersFitting, startsFitting, possible, certify, certificates, sideAt, switchName, treeOf} from '../dist/families/rotor/rotor.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/rotor/rotor.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const T = word => word.split('').map(x => x === '_' ? null : x);
const set = (...sides) => sides.map((side, i) => ({type: 'set', node: `s${i}`, side}));
const sends = n => Array.from({length: n}, () => ({type: 'send'}));

test('the machine: the guide’s keys, blocks and returning switches', () => {
  assert.deepEqual(allStarts(2).map(s => lettersOf(2, s, 4).join('')), ['ACBD', 'ADBC', 'BCAD', 'BDAC', 'CADB', 'DACB', 'CBDA', 'DBCA']);
  assert.equal(lettersOf(1, ['L'], 12).join(''), 'ABABABABABAB');
  assert.equal(lettersOf(1, ['R'], 4).join(''), 'BABA');
  assert.equal(lettersOf(3, Array(7).fill('L'), 8).join(''), 'AECGBFDH');
  assert.equal(lettersOf(3, Array(7).fill('R'), 8).join(''), 'HDFBGCEA');
  assert.equal(lettersOf(3, [...'RLLRRRL'], 8).join(''), 'FBGDEAHC');
  for (const d of [1, 2, 3]) for (const s of allStarts(d)) assert.deepEqual(run(d, s, 2 ** d).now, s, 'a block brings every switch back');
  assert.equal(new Set(allStarts(3).map(s => lettersOf(3, s, 8).join(''))).size, 128);
  const trip = run(2, ['L', 'L', 'L'], 2).trips;
  assert.deepEqual(trip, [[0, 1], [0, 2]], 'trips list the switches passed');
});

test('which orders fit, and the proofs that one can’t', () => {
  assert.deepEqual(ordersFitting(2, T('D___')), ['DACB', 'DBCA']);
  assert.deepEqual(ordersFitting(3, T('AE______')), ['AECGBFDH', 'AECHBFDG', 'AEDGBFCH', 'AEDHBFCG']);
  assert.equal(startsFitting(3, T('A_______')).length, 16, 'A first leaves four switches free');
  for (const w of ['ABAB', 'ACBD', 'BDAC', 'CBDA']) assert.ok(possible(w.length === 4 && !w.includes('C') ? 1 : 2, T(w)), w);
  for (const w of ['ABBA', 'ABCD', 'DABC']) assert.ok(!possible(w.includes('C') ? 2 : 1, T(w)), w);
  assert.deepEqual(certificates(2, T('ABCD'))[0], {node: 's0', at: [0, 1]});
  assert.deepEqual(certificates(2, T('DABC')), [{node: 's0', at: [1, 2]}]);
  assert.deepEqual(certificates(3, T('AEBFCGDH'))[0], {node: 's1', at: [0, 2]});
  assert.deepEqual(certificates(3, T('AECFBGDH')).map(c => c.node), ['s2', 's2'], 'only the switch above E to H fails');
  assert.equal(certify(1, T('ABBA'), 0, 0, 3), 'between');
  assert.equal(certify(1, T('ABBA'), 0, 0, 1), 'apart');
  assert.equal(certify(2, T('ABCD'), 2, 0, 1), 'off');
  assert.equal(certify(3, T('AEBFCGDH'), 0, 0, 2), 'between');
  assert.equal(sideAt(3, 1, 3), 'R', 'D is right of the switch above A to D');
  assert.equal(sideAt(3, 2, 3), null);
  assert.equal(switchName(3, 1), 'the switch above A, B, C and D');
  assert.equal(switchName(2, 0), 'the top switch');
  assert.equal(switchName(1, 0), 'the switch');
});

test('switches are set before the first counter, then Send', () => {
  const p = byId('rotor-04');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'send'}), null, 'Send waits for every switch');
  a = play(p, a, {type: 'flip', node: 's0'});
  assert.deepEqual(a.board.start, ['L', null, null], 'an unset switch points left first');
  a = play(p, a, {type: 'flip', node: 's0'});
  assert.equal(a.board.start[0], 'R', 'then flips');
  assert.equal(move(p, a, {type: 'set', node: 's0', side: 'R'}), null, 'pointing it the way it points changes nothing');
  const html = view(p, a);
  assert.match(html, /aria-label="Road from the top switch to the right, the next road"/, 'the chosen road doesn’t offer to point the switch that way');
  assert.match(html, /aria-label="Road from the top switch to the left\. Point the top switch this way"/);
  a = play(p, a, ...set('L', 'L', 'L'), {type: 'send'});
  assert.equal(move(p, a, {type: 'flip', node: 's1'}), null, 'no flips after the first counter');
  assert.equal(move(p, a, {type: 'set', node: 's1', side: 'R'}), null);
  a = play(p, a, ...sends(3));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'send'}), null, 'no fifth counter');
});

test('wrong letters show red, and the hint says to undo', () => {
  const p = byId('rotor-04');
  let a = play(p, freshAttempt(p), ...set('L', 'L', 'R'), ...sends(2));
  const html = view(p, a);
  assert.match(html, /ro-slot got full wrong">D</, 'D landed where C was wanted');
  const h = nextHint(p, a);
  assert.equal(h.type, 'deadend');
  assert.ok(h.quiet);
  assert.match(h.text, /Undo/);
  assert.ok(!isSolved(p, play(p, a, ...sends(2)).board));
});

test('Can’t: proofs and refusals, each claim answered on its own whether or not the order can be made', () => {
  const p = byId('rotor-05'), m = mechanicFor(p);
  let a = freshAttempt(p);
  assert.match(view(p, a), /ro-cant"[^>]*disabled/, 'Can’t waits for a counter');
  a = play(p, a, ...set('L', 'L', 'L'), {type: 'send'});
  assert.doesNotMatch(view(p, a), /ro-cant"[^>]*disabled/);
  const wrong = play(p, a, {type: 'cant', node: 's1', at: [0, 1]});
  assert.equal(wrong.board.told, 'apart');
  assert.match(view(p, wrong), /Those two go different ways there\./);
  assert.ok(move(p, wrong, {type: 'cant', node: 's0', at: [0, 1]}), 'a wrong proof doesn’t shut Can’t');
  const right = play(p, a, {type: 'cant', node: 's0', at: [1, 0]});
  assert.ok(isSolved(p, right.board));
  assert.deepEqual(right.board.claim, {node: 's0', at: [0, 1]});
  const html = view(p, right);
  assert.match(html, /gb-node sw [lr] claimed/, 'the switch is ringed');
  assert.equal((html.match(/ro-slot want claimed/g) || []).length, 2, 'and the two letters');
  assert.match(html, /ro-claim/, 'with the road they share');
  // On an order some start makes (C B D A), a claim gets its own verdict, the
  // same kinds of line as above, and Can't stays on.
  const q = byId('rotor-07');
  let b = play(q, freshAttempt(q), ...set('L', 'L', 'L'), {type: 'send'});
  const lines = new Set();
  for (let s = 0; s < 3; s++) for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) {
    const c = play(q, b, {type: 'cant', node: `s${s}`, at: [x, y]});
    assert.ok(!isSolved(q, c.board), 'no claim proves an order that can be made');
    assert.equal(c.board.told, certify(2, q.parameters.target, s, x, y));
    lines.add(c.board.told);
    assert.doesNotMatch(view(q, c), /There is a way/);
    assert.doesNotMatch(view(q, c), /ro-cant"[^>]*disabled/, 'Can’t stays on');
  }
  assert.deepEqual([...lines].sort(), ['apart', 'between', 'off'], 'the same three lines as on an impossible order');
  b = play(q, b, {type: 'cant', node: 's0', at: [0, 1]});
  const back = undoPress(q, b, att => view(q, att), view(q, b));
  assert.equal(back.board.told, null, 'Undo takes the line away');
  assert.equal(back.board.sent, 1, 'and only the line');
  // A claim across an open slot is not a proof: its counter might pass the switch.
  assert.equal(certify(1, ['A', null, 'A', null], 0, 0, 2), 'between');
  assert.equal(certify(2, ['D', null, null, null], 0, 0, 1), 'open');
  m.reset(p);
});

test('the claim being tapped is view state, ended by any move or Undo', () => {
  const p = byId('rotor-02'), m = mechanicFor(p);
  let a = play(p, freshAttempt(p), {type: 'flip', node: 's0'}, {type: 'send'});
  m.ui(p, {claiming: true, moves: a.moves});
  let html = view(p, a);
  assert.match(html, /ro-puzzle claiming/);
  assert.equal((html.match(/data-rr-at=/g) || []).length, 4, 'the slots of the order are buttons');
  assert.match(html, /ro-send"[^>]*disabled/, 'no Send while claiming');
  m.ui(p, {node: 's0', moves: a.moves});
  m.ui(p, {at: [1], moves: a.moves});
  html = view(p, a);
  assert.match(html, /gb-node sw r chosen/);
  assert.match(html, /ro-slot want chosen/);
  m.ui(p, {at: [2], moves: a.moves + 1});
  assert.match(view(p, a), /aria-pressed="true"[^>]*>B</, 'a payload from another board is ignored');
  a = play(p, a, {type: 'send'});
  assert.doesNotMatch(view(p, a), /claiming/, 'a move ends it');
  m.ui(p, {claiming: true, moves: a.moves});
  const back = undoPress(p, a, att => view(p, att), view(p, a));
  assert.doesNotMatch(view(p, back), /claiming/, 'Undo ends it');
  m.reset(p);
});

test('find every: Keep, the shelf and That’s all', () => {
  const p = byId('rotor-06');
  let a = play(p, freshAttempt(p), ...set('R', 'L', 'R'), ...sends(4));
  assert.match(view(p, a), /ro-keep"[^>]*>Keep/);
  a = play(p, a, {type: 'keep'});
  assert.equal(a.board.sent, 0);
  assert.match(view(p, a), /ro-kept/);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /ro-all"[^>]*disabled/, 'That’s all stays off');
  a = play(p, a, {type: 'set', node: 's1', side: 'R'}, ...sends(4), {type: 'keep'}, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.doesNotMatch(view(p, a), /There is another/);
});

test('the playground: trees, the cap and Clear; never solved and no Hint', () => {
  const g = byId('rotor-playground'), m = mechanicFor(g);
  let a = freshAttempt(g);
  assert.ok(m.noHint(g));
  assert.match(view(g, a), /ro-tree-button/);
  a = play(g, a, {type: 'tree', depth: 2}, ...set('L', 'R', 'L'), ...sends(8));
  assert.equal(move(g, a, {type: 'send'}), null, 'two blocks');
  assert.deepEqual(a.board.start, ['L', 'R', 'L'], 'the start is kept');
  a = play(g, a, {type: 'clear'});
  assert.equal(a.board.sent, 0);
  assert.ok(move(g, a, {type: 'flip', node: 's0'}), 'after Clear the switches can change');
  assert.ok(!isSolved(g, a.board));
});

test('saves: forged boards are rejected', () => {
  const p = byId('rotor-04');
  assert.ok(validBoard(p, {start: ['L', 'L', 'L'], sent: 2, told: null, claim: null}));
  assert.ok(!validBoard(p, {start: ['L', null, 'L'], sent: 1, told: null, claim: null}), 'a counter with a switch unset');
  assert.ok(validBoard(p, {start: ['L', 'L', 'L'], sent: 2, told: 'apart', claim: null}), 'a refused claim on a possible order');
  assert.ok(!validBoard(p, {start: ['L', 'L', 'L'], sent: 2, told: 'way', claim: null}), 'a line the app doesn’t give');
  assert.ok(!validBoard(p, {start: ['L', 'L', 'L'], sent: 2, told: 'open', claim: null}), 'no slot here is open');
  assert.ok(!validBoard(p, {start: ['L', 'L', 'L'], sent: 2, told: null, claim: {node: 's0', at: [0, 1]}}), 'a claim on a possible order');
  assert.ok(!validBoard(p, null));
  const e = byId('rotor-06');
  assert.ok(!validBoard(e, {start: ['L', 'L', 'L'], sent: 0, kept: ['ACBD'], told: null, done: false}), 'a kept order that doesn’t fit');
  assert.ok(!validBoard(e, {start: ['L', 'L', 'L'], sent: 0, kept: ['DACB'], told: null, done: true}), 'done with one of two');
});

test('the trees fit their boards', () => {
  for (const d of [1, 2, 3]) {
    const {g} = treeOf(d);
    for (const id of g.ids) { const [x, y] = g.pos[id]; assert.ok(x > 0 && x < 100 && y > 0 && y < g.height, `depth ${d}: ${id} inside`); }
    assert.equal(g.edges.length, 2 * (2 ** d - 1));
  }
});

test('every puzzle renders and the hints solve it, never opening with a claim', () => {
  for (const p of pack.puzzles) {
    let a = freshAttempt(p);
    const html = view(p, a);
    assert.match(html, /data-mechanic-wire="rotor"/, p.id);
    assert.match(html, /gb-board/, p.id);
    assert.equal(p.familyTitle, 'Flip switches');
    if (p.band === 'playground') continue;
    assert.ok(!['cant', 'all'].includes(nextHint(p, a).action.type), `${p.id}: no claim first`);
    for (let k = 0; k < 60 && !isSolved(p, a.board); k++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve it`);
  }
});

test('hints answer quickly', () => {
  for (const p of pack.puzzles.filter(p => p.band !== 'playground')) {
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) nextHint(p, freshAttempt(p));
    assert.ok((performance.now() - t0) / 20 < 100, `${p.id}: a hint in under 100 ms`);
  }
});
