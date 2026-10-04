import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deductionMechanics } from '../dist/deduction.js';
import { freshAttempt, move, undo, nextHint, undoToSolvable } from '../dist/engine.js';

const catalog = JSON.parse(await readFile(new URL('../docs/puzzle-expansion/deduction.json', import.meta.url), 'utf8'));
const puzzles = catalog.families.flatMap(family => family.instances.map(p => ({ ...p, mechanic: family.id })));
const byType = type => puzzles.filter(p => p.id.startsWith(`${type}-`));
const puzzle = id => puzzles.find(p => p.id === id);
const { latin, code, nim } = deductionMechanics;
const copy = value => JSON.parse(JSON.stringify(value));
test('Nim bundle help represents every counter in larger piles, including the 8 column', () => {
  const p = puzzle('nim-12'), board = nim.fresh(p);
  const html = nim.help(p, {board});
  assert.match(html, /8-bundle/);
  const rows = [...html.matchAll(/<tr><th scope="row">\d+: (\d+)<\/th>((?:<td>[01]<\/td>)+)<\/tr>/g)];
  assert.equal(rows.length, p.parameters.piles.length);
  for (const row of rows) {
    const bits = [...row[2].matchAll(/<td>([01])<\/td>/g)].map(match => Number(match[1]));
    assert.equal(bits.reduce((sum, bit, i) => sum + bit * [8,4,2,1][i], 0), Number(row[1]));
  }
});
function followHints(handler, p, board = handler.fresh(p)) {
  for (let step = 0; step < 40 && !handler.solved(p, board); step++) {
    const hint = handler.hint(p, board);
    assert.equal(hint.type, 'move', `${p.id}: ${hint.text}`);
    assert.ok(hint.text);
    const original = copy(board);
    const next = handler.move(p, board, hint.action);
    assert.ok(next, `${p.id}: hinted action must be legal`);
    assert.deepEqual(board, original, 'moves do not mutate their input');
    assert.ok(handler.valid(p, next));
    board = next;
  }
  assert.ok(handler.solved(p, board), `${p.id}: hints must eventually complete`);
  assert.equal(handler.hint(p, board).type, 'done');
  return board;
}

test('all 36 deduction instances have valid fresh boards, legal current-state hints, and accessible controls', () => {
  assert.equal(puzzles.length, 36);
  for (const [name, handler] of Object.entries(deductionMechanics)) {
    assert.equal(byType(name).length, 12);
    for (const p of byType(name)) {
      const board = handler.fresh(p);
      assert.ok(handler.valid(p, board));
      assert.equal(handler.solved(p, board), false);
      assert.deepEqual(JSON.parse(JSON.stringify(board)), board);
      const html = handler.render(p, { board });
      assert.match(html, /aria-label|<label/);
      assert.match(html, /data-puzzle-form|data-action="expansion-move"|data-action="mechanic-ui"/);
      followHints(handler, p);
    }
  }
});

test('Latin acceptance checks the mathematical object and fixed clues, not the stored witness', () => {
  for (const p of byType('latin')) {
    let board = latin.fresh(p);
    for (const [cell, value] of p.solution.canonical_grid.flat().entries()) {
      if (!board.cells[cell]) board = latin.move(p, board, { type: 'set', cell, value });
    }
    assert.ok(latin.solved(p, board), p.id);
    const altered = copy(board), fixed = p.parameters.givens.flat().findIndex(Boolean);
    altered.cells[fixed] = 0;
    assert.equal(latin.valid(p, altered), false);
    assert.equal(latin.solved(p, altered), false);
  }
  const p = { parameters: { order: 2, givens: [[0, 0], [0, 0]] }, solution: { canonical_grid: [[1, 2], [2, 1]] } };
  for (const cells of [[1, 2, 2, 1], [2, 1, 1, 2]]) assert.ok(latin.solved(p, { cells, notes: [[], [], [], []] }));
  const conflict = { cells: [1, 1, 2, 2], notes: [[], [], [], []] };
  assert.ok(latin.valid(p, conflict), 'conflicting trials may be saved');
  assert.equal(latin.solved(p, conflict), false);
  assert.equal(latin.hint(p, conflict).type, 'deadend');
});

test('Latin marks replace and clear entries; old notes remain readable but cannot be added', () => {
  const p = puzzle('latin-06'), fresh = latin.fresh(p), legacy = copy(fresh);
  legacy.notes[0] = [1, 5];
  assert.ok(latin.valid(p, legacy));
  assert.equal(latin.move(p, fresh, { type: 'set', cell: 0, value: 1, mode: 'pencil' }), null);
  const written = latin.move(p, legacy, { type: 'set', cell: '0', value: '5' });
  assert.equal(written.cells[0], 5);
  assert.deepEqual(written.notes[0], []);
  assert.deepEqual(legacy.notes[0], [1, 5]);
  const changed = latin.move(p, written, { type: 'set', cell: 0, value: 1 });
  assert.equal(changed.cells[0], 1);
  const cleared = latin.move(p, changed, { type: 'set', cell: 0, value: 0 });
  assert.deepEqual(cleared, fresh);
  followHints(latin, p, written);
});

test('Latin hints recognize both immediate conflicts and locally legal dead branches', () => {
  const p = puzzle('latin-06');
  const repeated = latin.move(p, latin.fresh(p), { type: 'set', cell: 0, value: 3 });
  assert.ok(latin.valid(p, repeated));
  assert.match(latin.render(p, { board: repeated }), /latin-conflict/);
  assert.match(latin.hint(p, repeated).text, /repeats/);
  const dead = latin.move(p, latin.fresh(p), { type: 'set', cell: 0, value: 1 });
  assert.ok(latin.valid(p, dead));
  assert.equal(latin.hint(p, dead).type, 'deadend');
  assert.match(latin.hint(p, dead).text, /no symbol repeats yet/);
  const recovered = latin.move(p, dead, { type: 'set', cell: 0, value: 0 });
  followHints(latin, p, recovered);
  const p4 = puzzle('latin-04');
  const hint = latin.hint(p4, latin.fresh(p4));
  assert.equal(hint.action.cell, 0);
  assert.equal(hint.action.value, 2);
  assert.match(hint.text, /only possible home/);
});

test('Latin rejects malformed saves and illegal entries while allowing reversible mistakes', () => {
  const p = puzzle('latin-01'), fresh = latin.fresh(p);
  for (const board of [null, [], {}, { cells: [1, 0, 0, 0] }, { ...fresh, cells: [1, 0, 0] }, { ...fresh, cells: [1, 0, 0, '2'] }, { ...fresh, cells: [1, 0, 0, 3] }, { ...fresh, notes: [[], [], [], [1, 1]] }, { ...fresh, notes: [[1], [], [], []] }, { ...fresh, notes: [[], [], [], [0]] }]) {
    assert.equal(latin.valid(p, board), false);
    assert.equal(latin.solved(p, board), false);
  }
  for (const action of [null, {}, { type: 'set', cell: 0, value: 2 }, { type: 'set', cell: 4, value: 1 }, { type: 'set', cell: 1, value: 3 }, { type: 'set', cell: 1, value: -1 }, { type: 'set', cell: 1, value: true }, { type: 'set', cell: '1e0', value: 2 }, { type: 'set', cell: 1, value: 2, mode: 'other' }]) assert.equal(latin.move(p, fresh, action), null);
  assert.ok(latin.move(p, fresh, { type: 'set', cell: 1, value: 1 }), 'conflicting trial is editable, not silently refused');
});

test('code acceptance exhaustively checks every binary word against exact-position transcript scores', () => {
  for (const p of byType('code')) {
    let count = 0;
    for (let value = 0; value < 2 ** p.parameters.length; value++) {
      const word = value.toString(2).padStart(p.parameters.length, '0'), bits = word.split('').map(Number);
      const expected = p.parameters.transcript.every(({ guess, matches }) => [...guess].filter((bit, at) => bit === word[at]).length === matches);
      assert.equal(code.solved(p, { bits, submitted: true }), expected, `${p.id}: ${word}`);
      assert.equal(code.solved(p, { bits, submitted: false }), false, 'naming a code requires submission');
      if (expected) count++;
    }
    assert.equal(count, 1, p.id);
    let board = code.fresh(p);
    for (const [position, digit] of [...p.solution.code].entries()) board = code.move(p, board, { type: 'set', position: String(position), value: digit });
    assert.equal(code.solved(p, board), false);
    board = code.move(p, board, { type: 'submit' });
    assert.ok(code.solved(p, board));
    const html = code.render(p, { board });
    assert.doesNotMatch(html, /class="code-mismatch"/);
    assert.match(html, /✓<\/td>/);
  }
  const p = { parameters: { length: 2, transcript: [{ guess: '00', matches: 1 }] }, solution: { code: '01' } };
  assert.ok(code.solved(p, { bits: [1, 0], submitted: true }), 'accept another code when the transcript allows it');
});

test('code hints recover erroneous entries and rejected submissions, and every clue stays visible', () => {
  for (const p of byType('code')) {
    const bits = [...p.solution.code].map(bit => 1 - Number(bit));
    const wrong = { bits, submitted: true };
    assert.ok(code.valid(p, wrong));
    assert.equal(code.solved(p, wrong), false);
    const html = code.render(p, { board: wrong });
    assert.match(html, /code-mismatch/);
    assert.equal((html.match(/scope="row"/g) || []).length, p.parameters.transcript.length);
    followHints(code, p, wrong);
  }
  const p = puzzle('code-01');
  assert.equal(code.move(p, code.fresh(p), { type: 'submit' }), null);
  const initial = code.fresh(p), zero = code.move(p, initial, { type: 'toggle', position: 0 });
  assert.deepEqual(initial.bits, [null, null]);
  assert.deepEqual(zero.bits, [0, null]);
  assert.deepEqual(code.move(p, zero, { type: 'toggle', position: 0 }).bits, [1, null]);
  const submitted = { bits: [0, 1], submitted: true };
  assert.equal(code.move(p, submitted, { type: 'toggle', position: 1 }).submitted, false);
});

test('code rejects malformed saves and invalid positions, alphabet values, and incomplete submissions', () => {
  const p = puzzle('code-02'), fresh = code.fresh(p);
  for (const board of [null, [], {}, { bits: [0, 1, 0] }, { bits: [0, 1], submitted: false }, { bits: [0, 1, 2], submitted: true }, { bits: ['0', 1, 0], submitted: true }, { bits: [null, 1, 0], submitted: true }, { bits: [0, 1, 0], submitted: 'yes' }]) {
    assert.equal(code.valid(p, board), false);
    assert.equal(code.solved(p, board), false);
  }
  for (const action of [null, {}, { type: 'set', position: -1, value: 1 }, { type: 'set', position: 3, value: 1 }, { type: 'set', position: 0, value: 2 }, { type: 'set', position: 0, value: true }, { type: 'set', position: '0.0', value: 1 }, { type: 'submit' }]) assert.equal(code.move(p, fresh, action), null);
});

// Independent game-tree oracle: no XOR and no authored list used here.
const gameCache = new Map();
function winningPosition(piles) {
  const key = [...piles].sort((a, b) => a - b).join(',');
  if (gameCache.has(key)) return gameCache.get(key);
  for (let pile = 0; pile < piles.length; pile++) {
    for (let remove = 1; remove <= piles[pile]; remove++) {
      const after = [...piles]; after[pile] -= remove;
      if (!winningPosition(after)) { gameCache.set(key, true); return true; }
    }
  }
  gameCache.set(key, false); return false;
}

test('Nim opponent punishes every losing opening and every winning opening can be played to completion', () => {
  for (const p of byType('nim')) {
    let winners = 0;
    for (let pile = 1; pile <= p.parameters.piles.length; pile++) {
      for (let remove = 1; remove <= p.parameters.piles[pile - 1]; remove++) {
        const after = p.parameters.piles.map((size, i) => size - (i === pile - 1 ? remove : 0));
        const winningOpening = !winningPosition(after);
        if (winningOpening) winners++;
        for (const sample of [0, 0.35, 0.999]) {
          const fresh = nim.fresh(p), board = nim.move(p, fresh, { type: 'choose', pile, remove }, () => sample);
          assert.ok(nim.valid(p, board));
          assert.deepEqual(fresh, { piles: p.parameters.piles, turns: [] });
          assert.equal(nim.solved(p, board), !after.some(Boolean), 'a good opening alone does not complete the puzzle');
          if (winningOpening) followHints(nim, p, board);
          else assert.equal(winningPosition(board.piles), false, 'opponent returns a losing position');
        }
      }
    }
    assert.equal(winners, p.solution.all_winning_moves.length, p.id);
  }
});

test('Nim random fallback covers all legal replies and is unused when a winning reply exists', () => {
  const p = puzzle('nim-02');
  const replies = new Set();
  for (const random of [0, .25, .5, .75]) {
    const board = nim.move(p, nim.fresh(p), { type: 'choose', pile: 2, remove: 3 }, () => random);
    replies.add(JSON.stringify(board.turns[1]));
  }
  assert.equal(replies.size, 4, 'balanced 2,2 has four legal replies');
  const board = nim.move(p, nim.fresh(p), { type: 'choose', pile: 2, remove: 4 }, () => { throw Error('no random reply needed'); });
  assert.deepEqual(board.piles, [1, 1]);
});

test('Nim plays from remaining piles, records a loss, rejects invalid saves and stops at game over', () => {
  const p = puzzle('nim-02'), fresh = nim.fresh(p);
  const round = nim.move(p, fresh, { type: 'choose', pile: '2', remove: '4' });
  assert.deepEqual(round.piles, [1, 1]);
  assert.equal(nim.move(p, round, { type: 'choose', pile: 2, remove: 3 }), null);
  const lost = nim.move(p, round, { type: 'choose', pile: 1, remove: 1 });
  assert.deepEqual(lost.piles, [0, 0]);
  assert.equal(nim.solved(p, lost), false);
  assert.equal(nim.hint(p, lost).type, 'deadend');
  assert.match(nim.render(p, { board: lost }), /Opponent took the last pebble/);
  assert.match(nim.render(p, { board: lost }, { encounter: { speaker: 'plume' } }), /Plume took the last pebble/);
  assert.equal(nim.move(p, lost, { type: 'choose', pile: 1, remove: 1 }), null);
  const won = followHints(nim, p);
  assert.equal(nim.move(p, won, { type: 'choose', pile: 1, remove: 1 }), null);
  for (const board of [null, [], {}, { choice: null }, { ...fresh, piles: [1, 1] }, { ...round, piles: [1, '1'] }, { ...round, turns: [...round.turns, { player: 'you', pile: 2, remove: 1 }] }, { ...round, turns: [{ player: 'opponent', pile: 2, remove: 4 }, round.turns[1]] }, { ...lost, turns: [...lost.turns, { player: 'you', pile: 1, remove: 1 }] }]) {
    assert.equal(nim.valid(p, board), false);
    assert.equal(nim.solved(p, board), false);
  }
  for (const action of [null, {}, { type: 'choose', pile: 3, remove: 1 }, { type: 'choose', pile: 1, remove: 3 }, { type: 'choose', pile: 1, remove: 0 }, { type: 'choose', pile: 1, remove: 0.5 }, { type: 'choose', pile: true, remove: 1 }, { type: 'choose', pile: 2, remove: '3e0' }]) assert.equal(nim.move(p, fresh, action), null);
});

test('shared undo restores marks, code submissions, and whole Nim rounds', () => {
  const cases = [
    ['latin-06', [{ type: 'set', cell: 0, value: 1 }, { type: 'set', cell: 0, value: 5 }, { type: 'set', cell: 0, value: 0 }]],
    ['code-01', [{ type: 'set', position: 0, value: 1 }, { type: 'set', position: 1, value: 0 }, { type: 'submit' }, { type: 'set', position: 0, value: 0 }]],
    ['nim-02', [{ type: 'choose', pile: 2, remove: 4 }, { type: 'choose', pile: 1, remove: 1 }]]
  ];
  for (const [id, actions] of cases) {
    const p = puzzle(id), states = [freshAttempt(p)];
    for (const action of actions) { const previous = states.at(-1), next = move(p, previous, action); assert.ok(next); assert.deepEqual(undo(next).board, previous.board); assert.equal(undo(next).moves, previous.moves); states.push(next); }
    let undone = states.at(-1);
    for (let i = actions.length - 1; i >= 0; i--) { undone = undo(undone); assert.deepEqual(undone.board, states[i].board); }
  }
  const p = puzzle('latin-06'), dead = move(p, freshAttempt(p), { type: 'set', cell: 0, value: 1 });
  assert.equal(nextHint(p, dead).type, 'deadend');
  const recovered = undoToSolvable(p, dead);
  assert.deepEqual(recovered.board, latin.fresh(p));
  assert.equal(nextHint(p, recovered).type, 'move');
});

test('Nim pebbles lift from the top of a pile and Take makes exactly that move', () => {
  const p = puzzle('nim-02'), board = nim.fresh(p);
  assert.doesNotMatch(nim.render(p, { board }), /Take \d/);
  nim.ui(p, { pick: { pile: 2, from: 1 } });
  const html = nim.render(p, { board });
  assert.match(html, /Take 4/); assert.match(html, /&quot;remove&quot;:4/); assert.match(html, /aria-pressed="true"/);
  nim.ui(p, { pick: null }); assert.doesNotMatch(nim.render(p, { board }), /Take \d/);
  nim.ui(p, { pick: { pile: 2, from: 1 } }); nim.reset(p); assert.doesNotMatch(nim.render(p, { board }), /Take \d/);
  // A pick left over from a larger pile is dropped when the pile shrinks.
  nim.ui(p, { pick: { pile: 1, from: 1 } });
  assert.doesNotMatch(nim.render(p, { board: nim.move(p, board, { type: 'choose', pile: 1, remove: 1 }, () => 0) }), /Take \d/);
});
