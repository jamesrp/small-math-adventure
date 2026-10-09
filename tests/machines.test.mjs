import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView} from '../dist/ui.js';
import {turn, power, loopsOf, orderOf, movedOf, undoOf, andThen, splitsOf, ordersOf, sayMachine, sayArrows, machineMechanics} from '../dist/families/machines/machines.js';
import {validateMachines} from '../scripts/validate-machines.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const machines = await read('../dist/families/machines/machines.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const swap = (a, b) => ({type: 'swap', a, b}), turnOnce = {type: 'turn'}, keep = {type: 'keep'}, claim = {type: 'claim'}, cant = {type: 'cant'};
const turns = k => Array(k).fill(turnOnce);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
// The cups the lower row shows, home by home.
const lowerOf = html => [...html.split('class="mach-lower"')[1].matchAll(/aria-label="Home [A-G]: cup ([A-G])/g)].map(x => x[1]).join('');
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 100; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: answers match a separate simulation, hints solve, illegal moves fail', async () => {
  const report = await validateMachines();
  assert.equal(report.machinesPuzzles, 12);
  assert.deepEqual(report.answers, {'machines-01': 1, 'machines-02': 8, 'machines-03': 6, 'machines-04': 0, 'machines-05': 20, 'machines-06': 1, 'machines-07': 6, 'machines-08': 3, 'machines-09': 0, 'machines-10': 6, 'machines-11': 1, 'machines-12': 1});
});

test('machines: turns, loops, turn counts, undoing and one machine after another', () => {
  // CEABD: A and C swap; B goes to D, D to E, E to B.
  assert.equal(turn('ABCDE', 'CEABD'), 'CEABD', 'from home, one turn gives the lower row');
  assert.equal(turn('CEABD', 'CEABD'), 'ADCEB');
  assert.deepEqual(loopsOf('CEABD'), [[0, 2], [1, 3, 4]]);
  assert.deepEqual([orderOf('CEABD'), orderOf('ABCDE'), orderOf('BACD'), orderOf('BCDA')], [6, 1, 2, 4]);
  assert.equal(power('CEABD', 6), 'ABCDE'); assert.notEqual(power('CEABD', 3), 'ABCDE');
  assert.deepEqual([movedOf('ABCD'), movedOf('BACD'), movedOf('BCAD')], [0, 2, 3]);
  assert.equal(undoOf('CDBA'), 'DCAB'); assert.equal(andThen('CDBA', 'DCAB'), 'ABCD');
  assert.equal(undoOf(andThen('CABD', 'ACDB')), andThen(undoOf('ACDB'), undoOf('CABD')), 'undo B, then A');
  assert.notEqual(andThen('CABD', 'ACDB'), andThen('ACDB', 'CABD'));
  assert.deepEqual([splitsOf(4).length, splitsOf(5).length, splitsOf(7).length], [5, 7, 15]);
  assert.deepEqual(ordersOf(7), [1, 2, 3, 4, 5, 6, 7, 10, 12]);
  assert.equal(sayMachine('CEABD'), 'loops A to C to A and B to D to E to B');
  assert.equal(sayMachine('ABCD'), 'A, B, C and D stay');
  // While a child builds, the board says the arrows, not the loops.
  assert.equal(sayArrows('CEABD'), 'arrows A to C, B to D, C to A, D to E and E to B');
  assert.equal(sayArrows('BACD'), 'arrows A to B and B to A; C and D stay');
  assert.equal(sayArrows('ABC'), 'every cup stays');
});

test('turning a machine: cups glide along arrows, loops take colour as they close, the run stops at home', () => {
  const p = byId('machines-01');
  let a = freshAttempt(p), html = view(p, a);
  assert.match(html, /data-focus="mach-turn" >Turn<\/button>/);
  assert.match(html, /data-focus="mach-home" disabled/, 'nothing to send home yet');
  assert.doesNotMatch(html, /class="mach-arrow loop/, 'no colour before a run');
  assert.equal(lowerOf(html), 'CEABD', 'from home, the lower row is the machine');
  assert.match(html, /aria-label="The machine: arrows A to C, B to D, C to A, D to E and E to B"/);
  assert.equal(move(p, a, swap(0, 1)), null, 'the machine is given');
  assert.equal(lowerOf(view(p, play(p, a, [turnOnce]))), 'ADCEB', 'mid-run, the lower row is where the next turn sends the cups');
  a = play(p, a, turns(2));
  html = view(p, a);
  assert.match(html, /aria-label="Home A: cup A, at home"/);
  assert.equal((html.match(/class="mach-arrow loop loop-0"/g) || []).length, 2, 'A and C are home: their loop takes its colour');
  assert.doesNotMatch(html, /loop-1/, 'B, D and E are not');
  a = play(p, a, [turnOnce]);
  assert.equal((view(p, a).match(/class="mach-arrow loop loop-1"/g) || []).length, 3);
  a = play(p, a, turns(3));
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /Every cup home after <b>6<\/b> turns/);
  assert.equal(lowerOf(view(p, a)), 'CEABD');
});

test('making a machine: a swap starts the run again, Can’t is checked', () => {
  const p = byId('machines-02');
  let a = play(p, freshAttempt(p), [swap(0, 1), turnOnce]);
  assert.equal(a.board.turns, 1);
  a = play(p, a, [swap(0, 2)]);
  assert.deepEqual([a.board.machine, a.board.turns], ['CABD', 0], 'a new machine starts from home');
  const refused = play(p, a, [cant]);
  assert.ok(refused.board.wrong && !isSolved(p, refused.board));
  assert.match(view(p, refused), /Keep looking\./);
  assert.match(view(p, refused), /data-focus="mach-cant" disabled/);
  assert.equal(play(p, refused, [swap(0, 1)]).board.wrong, false);
  a = play(p, a, turns(3));
  assert.ok(isSolved(p, a.board), 'a loop of three comes home in 3 turns');
  // Puzzle 4: no machine moves just one cup. The catalog has nothing under 1.
  const one = byId('machines-04'), done = play(one, freshAttempt(one), [cant]);
  assert.ok(isSolved(one, done.board));
  assert.match(view(one, done), /<h3 class="case-bin-label">1 cup moves<\/h3><ol class="case-list"><\/ol>/);
  // Puzzle 9: five cups can't all move and come home in 2 turns.
  const five = byId('machines-09');
  assert.ok(isSolved(five, play(five, freshAttempt(five), [cant]).board));
  assert.equal(nextHint(five, freshAttempt(five)).action.type, 'cant');
});

test('undoing: turn A, read the row, make your machine, turn it', () => {
  const p = byId('machines-06');
  let a = freshAttempt(p);
  assert.match(view(p, a), />Turn A<\/button>/);
  assert.equal(nextHint(p, a).text, 'Turn A.', 'hints turn A before building');
  a = play(p, a, [turnOnce]);
  assert.match(view(p, a), />Turn your machine<\/button>/);
  assert.match(view(p, a), /aria-label="Home A: cup C"/, 'after A, cup C is on home A');
  assert.equal(lowerOf(view(p, a)), 'CDBA', 'every cup stays: the lower row is where A left them');
  assert.equal(lowerOf(view(p, {...a, board: {...a.board, machine: 'DCAB'}})), 'ABCD', 'the answer brings every cup home');
  assert.equal(nextHint(p, a).text, 'Swap C and A in the lower row.', 'hints name the cups the lower row shows: A lands home');
  a = play(p, a, [turnOnce]);
  assert.match(view(p, a), /Not every cup is home\./);
  assert.equal(move(p, a, turnOnce), null);
  a = play(p, a, [swap(0, 3)]);
  assert.equal(a.board.stage, 1, 'an edit takes back your turn, not A’s');
  for (const x of nextHintChain(p, a)) a = play(p, a, [x]);
  assert.ok(isSolved(p, a.board)); assert.equal(a.board.machine, 'DCAB');
  // Two machines: A, then B, then yours.
  const two = byId('machines-12'), b = play(two, freshAttempt(two), [turnOnce]);
  assert.match(view(two, b), />Turn B<\/button>/);
  assert.equal(solve(two).board.machine, 'DBAC');
});
function nextHintChain(p, a) {
  const out = [];
  for (let i = 0; !isSolved(p, a.board) && i < 20; i++) { const h = nextHint(p, a).action; out.push(h); a = move(p, a, h); }
  return out;
}

test('every machine: Keep, an early That’s all, loading a kept machine, the catalog after', () => {
  const p = byId('machines-07');
  let a = play(p, freshAttempt(p), [keep, swap(0, 1), keep]);
  assert.deepEqual(a.board.kept, ['ABC', 'BAC']);
  assert.equal(move(p, a, keep), null, 'kept once');
  const early = play(p, a, [claim]);
  assert.match(view(p, early), /There’s another\./);
  a = play(p, a, [{type: 'load', machine: 'ABC'}]);
  assert.equal(a.board.machine, 'ABC');
  const done = solve(p), html = view(p, done);
  assert.match(html, /aria-label="Every machine"/);
  assert.match(html, /<h3 class="case-bin-label">3 turns<\/h3>/);
  // Puzzle 8: a machine that must pass a test is kept only after its run.
  const self = byId('machines-08');
  let b = play(self, freshAttempt(self), [swap(0, 1), swap(2, 3)]);
  assert.match(view(self, b), /data-focus="mach-keep" disabled/);
  b = play(self, b, [...turns(2), keep]);
  assert.deepEqual(b.board.kept, ['BADC']);
  assert.match(view(self, solve(self)), /4 cups move/);
});

test('turn counts: Keep after a run, one machine per count, That’s the most refused until 12', () => {
  const p = byId('machines-11');
  let a = play(p, freshAttempt(p), [swap(0, 1), swap(2, 3), swap(2, 4)]);
  assert.equal(orderOf(a.board.machine), 6);
  assert.match(view(p, a), /data-focus="mach-keep" disabled/);
  a = play(p, a, [...turns(6), keep]);
  assert.match(view(p, a), /<b class="mach-kept-turns">6 turns<\/b>/);
  const early = play(p, a, [claim]);
  assert.match(view(p, early), /A slower machine exists\./);
  assert.match(view(p, a), />That’s the most<\/button>/);
  const done = solve(p);
  assert.ok(done.board.kept.some(m => orderOf(m) === 12));
  assert.match(view(p, done), /<h3 class="case-bin-label">12 turns<\/h3>/);
  const all = byId('machines-10'), five = solve(all);
  assert.deepEqual(five.board.kept.map(orderOf).sort(), [1, 2, 3, 4, 5, 6]);
});

test('the playground: three to seven cups, any machine, never solved', () => {
  const pg = byId('machines-playground');
  let a = freshAttempt(pg);
  assert.match(view(pg, a), /aria-label="7 cups"/);
  a = play(pg, a, [{type: 'cups', cups: 7}, swap(0, 6), turnOnce]);
  assert.equal(a.board.turns, 1);
  assert.match(view(pg, a), /cup-color-6/, 'a seventh cup');
  a = move(pg, a, {type: 'mix'}, () => 0.5);
  assert.notEqual(a.board.machine, 'ABCDEFG');
  a = play(pg, a, [{type: 'straight'}]);
  assert.deepEqual(a.board, {cups: 7, machine: 'ABCDEFG', turns: 0});
  assert.ok(!isSolved(pg, a.board)); assert.equal(nextHint(pg, a).type, 'done');
  assert.ok(machineMechanics.machine.noHint(pg));
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('machines-05'), a = solve(p);
  const run = play(byId('machines-01'), freshAttempt(byId('machines-01')), turns(4));
  const refused = play(byId('machines-03'), freshAttempt(byId('machines-03')), [cant]);
  const chain = play(byId('machines-12'), freshAttempt(byId('machines-12')), [turnOnce, swap(0, 1)]);
  const shelf = play(byId('machines-10'), freshAttempt(byId('machines-10')), [turnOnce, keep, swap(0, 1), turnOnce, turnOnce, keep, claim]);
  const pg = byId('machines-playground'), toy = play(pg, freshAttempt(pg), [swap(1, 2), turnOnce]);
  const saved = {[p.id]: a, 'machines-01': run, 'machines-03': refused, 'machines-12': chain, 'machines-10': shelf, [pg.id]: toy};
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile(saved)]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of Object.entries(saved)) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.ok(shelf.board.missed);
  assert.equal(undo(refused).board.wrong, false);
  const forged = {...store, profiles: [profile({'machines-01': {...run, board: {...run.board, turns: 9}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'a run longer than the machine’s');
});

test('the satchel lists Shuffle machines in Cup swaps, with its playground', () => {
  assert.equal(machines.puzzles.length, 13);
  const html = libraryView(profile({'machines-02': {completed: true}}), puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-swap"'));
  assert.match(family, /<h2>Shuffle machines<\/h2>/);
  assert.match(family, /data-id="machines-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(family.includes(`data-id="machines-${String(n).padStart(2, '0')}"`));
  assert.match(family, /Cup swaps, Shuffle machines, puzzle 2, completed/);
});
