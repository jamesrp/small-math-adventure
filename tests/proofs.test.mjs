import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshAttempt, move, nextHint, isSolved, undo } from '../dist/engine.js';
import { emptyStore, validateStore, loadStore, persistStore } from '../dist/storage.js';
import { libraryView } from '../dist/caravan-ui.js';
import { playView, parentView } from '../dist/ui.js';
import { puzzleObjective } from '../dist/puzzle-copy.js';
import { mechanicFor } from '../dist/expansion.js';
import { starStatus, paintStatus, classifyBoard } from '../dist/proofs.js';
import { validateProofs, seeded, solveStep } from '../scripts/validate-proofs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const main = await read('../dist/puzzles.json'), proofs = await read('../dist/proofs.json');
// The app merges the two packs at load time (dist/main.js).
const pack = { ...main, puzzles: [...main.puzzles, ...proofs.puzzles], sources: [...main.sources, ...proofs.sources] };
const puzzles = pack.puzzles;
const byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({ id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts });
function memory() { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; }
function solve(p, random = seeded(3)) {
  let a = freshAttempt(p, random);
  for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, solveStep(p, a).action, random);
  return a;
}
const view = (p, a, attempts = {}) => playView(p, a, { pack, profile: profile(attempts), selected: null, message: '', encounter: null });

test('the Proofs pack validates: witnesses, refutations, solve chains, honest hints, generators and opponent', async () => {
  const result = await validateProofs();
  assert.equal(result.proofPuzzles, 17);
});

test('Proofs appear as the first group in the Tile gardens and Pebble Duel satchels', () => {
  const html = libraryView(profile({ 'proof-garden-03': { completed: true } }), puzzles);
  assert.equal((html.match(/data-action="open-puzzle"/g) || []).length, puzzles.length);
  for (const p of proofs.puzzles) assert.equal(html.split(`data-id="${p.id}"`).length - 1, 1, p.id);
  const tile = html.slice(html.indexOf('data-view-key="family-tile"'), html.indexOf('data-view-key="family-swap"'));
  assert.ok(tile.indexOf('<h2>Proofs</h2>') >= 0 && tile.indexOf('<h2>Proofs</h2>') < tile.indexOf('<h2>Grades K–1</h2>'));
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  assert.ok(nim.indexOf('<h2>Proofs</h2>') >= 0 && nim.indexOf('<h2>Proofs</h2>') < nim.indexOf('<h2>Easy</h2>'));
  assert.match(html, /Tile gardens, proofs, puzzle 3, completed/);
  assert.equal(html.split('<h2>Proofs</h2>').length - 1, 2);
});

test('every proof puzzle renders fresh, mid-way and solved, with its objective and the right Undo state', () => {
  for (const p of proofs.puzzles) {
    assert.ok(puzzleObjective(p).length > 5, p.id);
    const fresh = freshAttempt(p, seeded(1)), solved = solve(p);
    for (const a of [fresh, solved]) {
      const html = playView(p, a, { pack, profile: profile(), selected: null, message: '', encounter: null });
      assert.match(html, /Puzzle play area/, p.id);
      assert.ok(html.includes(puzzleObjective(p).replace(/’/g, '’')) || html.includes('class="sr-only"'), p.id);
    }
    const mid = move(p, fresh, solveStep(p, fresh).action, seeded(2));
    const html = playView(p, mid, { pack, profile: profile(), selected: null, message: '', encounter: null });
    const undoButton = html.match(/<button[^>]*data-action="undo"[^>]*>/)[0];
    assert.equal(/disabled/.test(undoButton), Boolean(mechanicFor(p).noUndo?.(p)), `${p.id}: Undo availability`);
  }
});

test('an impossible garden never announces itself: no dead-end feedback before a hint', () => {
  for (const p of proofs.puzzles.filter(p => p.mechanic === 'proofgarden')) {
    let a = freshAttempt(p);
    assert.notEqual(nextHint(p, a).type, 'deadend', p.id);
    // Place a domino if one fits; the feedback still must not say "dead end".
    const first = p.parameters.cells.find(c => p.parameters.cells.includes(c + 1) && (c + 1) % p.parameters.cols);
    if (first !== undefined) a = move(p, a, { type: 'place', cells: [first, first + 1] }) || a;
    assert.notEqual(nextHint(p, a).type, 'deadend', p.id);
    const html = playView(p, a, { pack, profile: profile(), selected: null, message: '', encounter: null });
    assert.doesNotMatch(html, /class="feedback deadend"/, p.id);
  }
});

test('garden proofs: checks are sound, tools respect the mode, and the Checker tool unlocks after the first paint proof', () => {
  const lonely = byId('proof-garden-01'), corners = byId('proof-garden-03'), big = byId('proof-garden-05'), coverable = byId('proof-garden-04');
  let a = freshAttempt(lonely);
  assert.equal(move(lonely, a, { type: 'star', cells: [0], on: true }), null, 'stars need Prove mode');
  a = move(lonely, a, { type: 'mode', mode: 'prove' });
  assert.equal(move(lonely, a, { type: 'place', cells: [2, 3] }), null, 'no dominoes in Prove mode');
  a = move(lonely, a, { type: 'star', cells: [0], on: true });
  assert.ok(isSolved(lonely, a.board));
  // Two touching stars never prove anything, even with few partners.
  assert.equal(starStatus(corners, [1, 2]).proved, false);
  // Fill blanks completes a half-painted checkerboard.
  let b = move(corners, freshAttempt(corners), { type: 'mode', mode: 'prove' });
  const gold = corners.parameters.cells.filter(c => (Math.floor(c / 4) + c % 4) % 2 === 1);
  b = move(corners, b, { type: 'paint', cells: gold, color: 1 });
  assert.equal(paintStatus(corners, b.board.paint).blank, 6);
  b = move(corners, b, { type: 'fill', color: 2 });
  assert.ok(isSolved(corners, b.board));
  // Equal counts never prove a coverable garden, however it is painted.
  let c = move(coverable, freshAttempt(coverable), { type: 'mode', mode: 'prove' });
  c = move(coverable, c, { type: 'checker', cell: coverable.parameters.cells[0] });
  assert.equal(isSolved(coverable, c.board), false);
  const locked = playView(big, freshAttempt(big), { pack, profile: profile(), selected: null, message: '', encounter: null });
  const proving = move(big, freshAttempt(big), { type: 'mode', mode: 'prove' });
  assert.doesNotMatch(playView(big, proving, { pack, profile: profile(), selected: null, message: '', encounter: null }), /Checker/);
  assert.match(playView(big, proving, { pack, profile: profile({ 'proof-garden-03': { completed: true } }), selected: null, message: '', encounter: null }), /Checker/);
  assert.ok(locked);
});

test('hints on one-check rounds and duels give the authored nudges, never an answer, and are counted for grown-ups', () => {
  for (const p of proofs.puzzles.filter(p => mechanicFor(p).noUndo?.(p))) {
    let a = freshAttempt(p, seeded(4));
    a = move(p, a, solveStep(p, a).action, seeded(4));
    for (let level = 1; level <= 3; level++) {
      const asked = { ...a, hintLevel: level, helpUsed: true }, hint = nextHint(p, asked);
      if (hint.type === 'move') { assert.ok(['next', 'deal', 'new'].includes(hint.action.type), p.id); continue; }
      assert.equal(hint.type, 'note', p.id);
      const html = view(p, asked);
      assert.ok(html.includes(p.hints[level - 1].replace(/’/g, '’')), `${p.id}: hint ${level} shows the authored nudge`);
      assert.doesNotMatch(html, /data-action="apply-hint"/, p.id);
    }
  }
  const sortP = byId('proof-sort-01'), helped = { ...solve(sortP), helpUsed: true };
  const html = parentView({ ...emptyStore(), profiles: [profile({ 'proof-sort-01': helped })], activeProfileId: 'one' }, profile({ 'proof-sort-01': helped }), pack, 'Ready', 'proofs');
  assert.match(html, /1\/17 proofs \(1 with hints\)/);
});

test('Any odd number? starts with the worksheet question, reveals after a check, and asks a different trip next', () => {
  const p = byId('proof-flip-03'), random = seeded(21);
  let a = freshAttempt(p, random);
  assert.deepEqual([a.board.s, a.board.e], [0, 0]);
  a = move(p, a, { type: 'toggle', n: 1 }, random);
  a = move(p, a, { type: 'check' }, random);
  assert.equal(a.board.clean, 0);
  assert.equal(move(p, a, { type: 'toggle', n: 2 }, random), null, 'answers lock after Check');
  const html = view(p, a);
  assert.match(html, /aria-label="2, can be done"/); assert.match(html, /aria-label="1, cannot be done"/);
  assert.match(html, /even numbers only/);
  const next = move(p, a, { type: 'next' }, random);
  assert.notDeepEqual([next.board.s, next.board.e], [0, 0]);
  assert.deepEqual(next.board.chosen, []);
  assert.equal(solve(p).board.clean, 2);
});

test('one check per round: answers lock after Check, and Undo is unavailable', () => {
  const sortP = byId('proof-sort-01'), random = seeded(9);
  let a = freshAttempt(sortP, random);
  for (let i = 0; i < 6; i++) a = move(sortP, a, { type: 'answer', i, value: true }, random);
  a = move(sortP, a, { type: 'check' }, random);
  assert.equal(move(sortP, a, { type: 'answer', i: 0, value: false }, random), null);
  assert.equal(mechanicFor(sortP).noUndo(sortP), true);
  const right = a.board.boards.every((h, i) => classifyBoard(h).ok === a.board.answers[i]);
  assert.equal(a.board.clean, right ? 1 : 0);
  const next = move(sortP, a, { type: 'next' }, random);
  assert.equal(next.board.checked, false); assert.equal(next.board.clean, a.board.clean);
});

test('duel: only wins from a new start count toward the streak', () => {
  const p = byId('proof-duel-01'), random = seeded(5);
  let a = freshAttempt(p, random);
  // Lose on purpose: choose the wrong side, then play the first legal move.
  const losingChoice = a.board.piles[0] === a.board.piles[1] ? 'you' : 'opponent';
  a = move(p, a, { type: 'choose', first: losingChoice }, random);
  while (a.board.piles.some(Boolean)) { const i = a.board.piles.findIndex(Boolean); a = move(p, a, { type: 'take', pile: i + 1, remove: 1 }, random); }
  assert.equal(a.board.streak, 0);
  a = move(p, a, { type: 'again' }, random);
  assert.equal(a.board.fresh, false);
  for (let i = 0; i < 40 && (a.board.first === null || a.board.piles.some(Boolean)); i++) a = move(p, a, solveStep(p, a).action, random);
  assert.equal(a.board.turns.at(-1).player, 'you');
  assert.equal(a.board.streak, 0, 'a win from Same start again does not count');
  assert.equal(move(p, a, { type: 'again' }, random), null, 'Same start again is only for losses');
  a = move(p, a, { type: 'new' }, random);
  assert.equal(a.board.fresh, true);
});

test('proof attempts, their histories and completion round-trip through real saves', () => {
  const store = emptyStore(); store.activeProfileId = 'one'; store.profiles = [profile()];
  for (const p of proofs.puzzles) {
    const random = seeded(p.number + 11);
    let a = freshAttempt(p, random);
    for (let i = 0; i < 3 && !isSolved(p, a.board); i++) a = move(p, a, solveStep(p, a).action, random);
    store.profiles[0].attempts[p.id] = a;
  }
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  assert.deepEqual(loadStore(storage, puzzles).store, store);
  const solved = solve(byId('proof-garden-02'));
  store.profiles[0].attempts['proof-garden-02'] = solved;
  assert.doesNotThrow(() => validateStore(store, puzzles));
  assert.equal(validateStore(store, puzzles).profiles[0].attempts['proof-garden-02'].completed, true);
  const back = undo(solved);
  assert.equal(isSolved(byId('proof-garden-02'), back.board), false);
});

test('the grown-up area lists proof notes and counts', () => {
  const html = parentView({ ...emptyStore(), profiles: [profile()], activeProfileId: 'one' }, profile(), pack, 'Ready', 'proofs');
  assert.match(html, /<option value="proofs" selected>Proofs<\/option>/);
  for (const p of proofs.puzzles) assert.ok(html.includes(`data-view-key="notes-${p.id}"`), p.id);
  assert.match(html, /0\/17 proofs \(0 with hints\)/);
});

test('choices that are not moves reset on Restart and when a puzzle is opened again', () => {
  const p = byId('proof-duel-02'), random = seeded(8);
  let a = move(p, freshAttempt(p, random), { type: 'choose', first: 'you' }, random);
  mechanicFor(p).ui(p, { pick: { pile: 1, from: 0 } });
  assert.match(view(p, a), /duel-pebble lift/);
  mechanicFor(p).reset(p);
  assert.doesNotMatch(view(p, a), /duel-pebble lift/);
  const g = byId('proof-garden-04');
  mechanicFor(g).ui(g, { sel: g.parameters.cells[0] });
  assert.match(view(g, freshAttempt(g)), /pg-cell selected/);
  mechanicFor(g).reset(g);
  assert.doesNotMatch(view(g, freshAttempt(g)), /pg-cell selected/);
});

test('a solved garden accepts no further moves', () => {
  const p = byId('proof-garden-01');
  let a = move(p, freshAttempt(p), { type: 'mode', mode: 'prove' });
  a = move(p, a, { type: 'star', cells: [0], on: true });
  assert.ok(isSolved(p, a.board));
  for (const action of [{ type: 'mode', mode: 'cover' }, { type: 'wipe' }, { type: 'star', cells: [0], on: false }]) assert.equal(move(p, a, action), null, JSON.stringify(action));
});
