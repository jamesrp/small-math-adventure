import { esc, actionButton, selectField, submitButton } from './expansion-controls.js';

// Week 5 entry-clue Latin squares, Week 6 exact-position binary feedback,
// and Week 8 normal-play Nim. Source lineage lives in docs/puzzle-expansion/deduction.md.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => typeof value === 'number' && Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const numbers = n => Array.from({ length: n }, (_, i) => i + 1);
const quietSelect = (name, label, options, value) => selectField(name, '', options, value).replace('<select ', `<select aria-label="${esc(label)}" `);
const hidden = (name, value) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;

function latinValid(p, board) {
  const n = p.parameters.order, givens = p.parameters.givens.flat();
  return object(board) && Array.isArray(board.cells) && board.cells.length === n * n &&
    board.cells.every((value, cell) => integer(value) && value >= 0 && value <= n && (!givens[cell] || givens[cell] === value)) &&
    Array.isArray(board.notes) && board.notes.length === n * n && board.notes.every((notes, cell) =>
      Array.isArray(notes) && notes.length <= n && new Set(notes).size === notes.length &&
      (!board.cells[cell] || notes.length === 0) && notes.every(value => integer(value) && value >= 1 && value <= n));
}
function latinConflicts(n, cells) {
  const conflicts = new Set();
  for (let a = 0; a < cells.length; a++) {
    if (!cells[a]) continue;
    for (let b = a + 1; b < cells.length; b++) {
      if (cells[a] === cells[b] && (Math.floor(a / n) === Math.floor(b / n) || a % n === b % n)) { conflicts.add(a); conflicts.add(b); }
    }
  }
  return conflicts;
}
function latinOptions(n, cells, cell) {
  const row = Math.floor(cell / n), col = cell % n;
  return numbers(n).filter(value => !cells.some((other, at) => other === value && (Math.floor(at / n) === row || at % n === col)));
}
// Search from the player's entries, never from the authored witness. MRV keeps
// the five-by-five challenge boards small, including locally legal dead branches.
function completeLatin(p, original) {
  const n = p.parameters.order, cells = [...original];
  if (latinConflicts(n, cells).size) return null;
  function search() {
    let chosen = -1, options;
    for (let cell = 0; cell < cells.length; cell++) {
      if (cells[cell]) continue;
      const candidates = latinOptions(n, cells, cell);
      if (!candidates.length) return null;
      if (!options || candidates.length < options.length) { chosen = cell; options = candidates; }
    }
    if (chosen < 0) return [...cells];
    for (const value of options) { cells[chosen] = value; const result = search(); if (result) return result; }
    cells[chosen] = 0;
    return null;
  }
  return search();
}
const latin = {
  fresh: p => ({ cells: p.parameters.givens.flat(), notes: Array.from({ length: p.parameters.order ** 2 }, () => []) }),
  valid: latinValid,
  solved(p, board) { return latinValid(p, board) && board.cells.every(Boolean) && !latinConflicts(p.parameters.order, board.cells).size; },
  move(p, board, action) {
    if (!latinValid(p, board) || !object(action) || action.type !== 'set') return null;
    const cell = index(action.cell), value = index(action.value), n = p.parameters.order, mode = action.mode || 'ink';
    if (!integer(cell) || cell < 0 || cell >= n * n || p.parameters.givens.flat()[cell] || !integer(value) || value < 0 || value > n || !['ink', 'pencil'].includes(mode)) return null;
    const next = clone(board);
    if (mode === 'pencil') {
      if (board.cells[cell]) return null;
      next.notes[cell] = value === 0 ? [] : board.notes[cell].includes(value) ? board.notes[cell].filter(v => v !== value) : [...board.notes[cell], value].sort((a, b) => a - b);
    } else { next.cells[cell] = value; next.notes[cell] = []; }
    return JSON.stringify(next) === JSON.stringify(board) ? null : next;
  },
  hint(p, board) {
    if (!latinValid(p, board)) return { type: 'deadend', text: 'This board cannot be read. Restart the orchard.' };
    if (this.solved(p, board)) return { type: 'done' };
    const n = p.parameters.order, conflicts = latinConflicts(n, board.cells);
    if (conflicts.size) return { type: 'deadend', text: 'A symbol repeats in a row or column. Clear a marked entry, or undo your last trial.' };
    const answer = completeLatin(p, board.cells);
    if (!answer) return { type: 'deadend', text: 'These entries cannot lead to a complete orchard, even though no symbol repeats yet. Undo a trial or clear an entry.' };
    const empty = board.cells.flatMap((value, cell) => value ? [] : [cell]);
    let cell = empty.find(at => latinOptions(n, board.cells, at).length === 1), reason = 'Its row and column rule out every other symbol.';
    if (cell === undefined) {
      for (const at of empty) {
        const value = answer[at];
        if ([true, false].some(row => empty.filter(other => row ? Math.floor(other / n) === Math.floor(at / n) : other % n === at % n).filter(other => latinOptions(n, board.cells, other).includes(value)).length === 1)) {
          cell = at; reason = `This is the only possible home for ${value} in its row or column.`; break;
        }
      }
    }
    if (cell === undefined) { cell = empty.sort((a, b) => latinOptions(n, board.cells, a).length - latinOptions(n, board.cells, b).length)[0]; reason = 'This trial can lead to a complete orchard. Keep track of what it forces; you can undo it.'; }
    return { type: 'move', action: { type: 'set', cell, value: answer[cell], mode: 'ink' }, remaining: empty.length,
      text: `Try ${answer[cell]} in row ${Math.floor(cell / n) + 1}, column ${cell % n + 1}. ${reason}` };
  },
  render(p, attempt) {
    const board = attempt.board, n = p.parameters.order, givens = p.parameters.givens.flat(), conflicts = latinConflicts(n, board.cells);
    const first = board.cells.findIndex((value, cell) => !value && !givens[cell]);
    const selected = first < 0 ? givens.findIndex(value => !value) : first;
    return `<div class="deduction-puzzle latin-puzzle">
      <form data-puzzle-form>${hidden('type', 'set')}<fieldset class="latin-picker"><legend class="sr-only">Choose a square</legend><div class="latin-grid" style="--latin-order:${n}">${board.cells.map((value, cell) => {
        const name = `Row ${Math.floor(cell / n) + 1}, column ${cell % n + 1}`, note = board.notes[cell].join(' '), label = `${name}: ${value || 'empty'}${note ? `; pencil marks ${note}` : ''}${conflicts.has(cell) ? '; repeated symbol' : ''}`;
        return givens[cell] ? `<div class="latin-given${conflicts.has(cell) ? ' latin-conflict' : ''}" role="img" aria-label="${esc(label)}; fixed clue">${value}</div>` : `<label class="latin-cell${conflicts.has(cell) ? ' latin-conflict' : ''}"><input type="radio" name="cell" value="${cell}" aria-label="${esc(label)}" ${cell === selected ? 'checked' : ''} required><span class="latin-cell-face"><strong>${value || ''}</strong><small>${esc(note)}</small></span></label>`;
      }).join('')}</div></fieldset><div class="deduction-form-controls">${quietSelect('value', 'Symbol', [{ value: 0, label: 'Clear' }, ...numbers(n)], 1)}${quietSelect('mode', 'Write or pencil', [{ value: 'ink', label: 'Write' }, { value: 'pencil', label: 'Pencil' }], 'ink')}${submitButton('Apply')}</div></form>
      <p class="deduction-feedback" role="status">${conflicts.size ? 'A symbol repeats: check the outlined squares.' : ''}</p></div>`;
  },
  demo: 'Choose an empty square, then write a symbol. Each symbol belongs once in every row and column. Pencil marks let you keep several possibilities; Undo reverses any trial.'
};

const exactMatches = (bits, guess) => bits.reduce((total, bit, i) => total + (String(bit) === guess[i] ? 1 : 0), 0);
function codeValid(p, board) {
  return object(board) && Array.isArray(board.bits) && board.bits.length === p.parameters.length && board.bits.every(bit => bit === null || bit === 0 || bit === 1) && typeof board.submitted === 'boolean' && (!board.submitted || board.bits.every(bit => bit !== null));
}
function consistentCode(p, bits) { return p.parameters.transcript.every(row => exactMatches(bits, row.guess) === row.matches); }
function codeCandidates(p) {
  return Array.from({ length: 2 ** p.parameters.length }, (_, value) => value.toString(2).padStart(p.parameters.length, '0').split('').map(Number)).filter(bits => consistentCode(p, bits));
}
const code = {
  fresh: p => ({ bits: Array(p.parameters.length).fill(null), submitted: false }),
  valid: codeValid,
  solved: (p, board) => codeValid(p, board) && board.submitted && consistentCode(p, board.bits),
  move(p, board, action) {
    if (!codeValid(p, board) || !object(action)) return null;
    if (action.type === 'submit') return board.bits.some(bit => bit === null) || board.submitted ? null : { bits: [...board.bits], submitted: true };
    const position = index(action.position);
    if (!integer(position) || position < 0 || position >= board.bits.length || !['set', 'toggle'].includes(action.type)) return null;
    const value = action.type === 'toggle' ? board.bits[position] === null ? 0 : 1 - board.bits[position] : index(action.value);
    if (value !== null && value !== 0 && value !== 1 || value === board.bits[position]) return null;
    const bits = [...board.bits]; bits[position] = value;
    return { bits, submitted: false };
  },
  hint(p, board) {
    if (!codeValid(p, board)) return { type: 'deadend', text: 'This code cannot be read. Restart the lanterns.' };
    if (this.solved(p, board)) return { type: 'done' };
    const candidates = codeCandidates(p);
    if (!candidates.length) return { type: 'deadend', text: 'No binary code fits this transcript.' };
    const distance = bits => bits.filter((bit, position) => board.bits[position] !== null && board.bits[position] !== bit).length;
    candidates.sort((a, b) => distance(a) - distance(b));
    const answer = candidates[0], wrong = board.bits.findIndex((bit, position) => bit !== null && bit !== answer[position]);
    const position = wrong < 0 ? board.bits.indexOf(null) : wrong;
    if (position < 0) return { type: 'move', action: { type: 'submit' }, remaining: 1, text: 'Your lanterns fit every recorded score. Submit this code.' };
    return { type: 'move', action: { type: 'set', position, value: answer[position] }, remaining: board.bits.filter((bit, at) => bit !== answer[at]).length + 1,
      text: `${wrong < 0 ? 'A code that fits every recorded score has' : 'Your current choices cannot fit every score. Try'} ${answer[position]} in position ${position + 1}. Count matches in the same positions only.` };
  },
  render(p, attempt) {
    const board = attempt.board;
    return `<div class="deduction-puzzle code-puzzle">
      <table class="code-transcript"><caption class="sr-only">Recorded tests</caption><thead><tr><th scope="col">Test</th><th scope="col">Exact matches</th>${board.submitted ? '<th scope="col">Your code</th>' : ''}</tr></thead><tbody>${p.parameters.transcript.map(row => { const actual = exactMatches(board.bits, row.guess), good = actual === row.matches; return `<tr${board.submitted && !good ? ' class="code-mismatch"' : ''}><th scope="row"><span class="code-word" role="img" aria-label="${esc(row.guess.split('').join(', '))}">${row.guess.split('').map(bit => `<span class="code-bit code-bit-${bit}" aria-hidden="true">${bit}</span>`).join('')}</span></th><td>${row.matches}</td>${board.submitted ? `<td>${actual} ${good ? '✓' : '— recheck'}</td>` : ''}</tr>`; }).join('')}</tbody></table>
      <fieldset class="code-choices"><legend>Your code</legend><div class="code-word">${board.bits.map((bit, position) => actionButton(bit === null ? '?' : String(bit), { type: 'toggle', position }, `data-bit="${bit === null ? 'blank' : bit}" aria-label="Position ${position + 1}: ${bit === null ? 'unset; choose 0' : `${bit}; change to ${1 - bit}`}"`)).join('')}</div></fieldset><div class="deduction-form-controls">${actionButton('Check', { type: 'submit' }, board.bits.includes(null) || board.submitted ? 'disabled' : '')}</div>
      <p class="sr-only" role="status">${board.submitted ? this.solved(p, board) ? '' : 'Some scores do not match yet. Change a lantern and try again.' : ''}</p></div>`;
  },
  demo: 'A recorded test 10 with zero matches means the secret is 01: both positions must change. Set each lantern, then submit a code that fits all the tests.'
};

const nimSum = piles => piles.reduce((sum, pile) => sum ^ pile, 0);
function nimChoice(p, choice) {
  return object(choice) && integer(choice.pile) && choice.pile >= 1 && choice.pile <= p.parameters.piles.length && integer(choice.remove) && choice.remove >= 1 && choice.remove <= p.parameters.piles[choice.pile - 1];
}
function afterChoice(p, choice) { return p.parameters.piles.map((size, i) => size - (i === choice.pile - 1 ? choice.remove : 0)); }
function winningMove(piles) {
  const sum = nimSum(piles);
  for (let i = 0; i < piles.length; i++) { const target = piles[i] ^ sum; if (target < piles[i]) return { pile: i + 1, remove: piles[i] - target }; }
  return null;
}
const nim = {
  fresh: () => ({ choice: null }),
  valid: (p, board) => object(board) && (board.choice === null || nimChoice(p, board.choice)),
  solved(p, board) { return this.valid(p, board) && board.choice !== null && nimSum(afterChoice(p, board.choice)) === 0; },
  move(p, board, action) {
    if (!this.valid(p, board) || !object(action) || action.type !== 'choose') return null;
    const choice = { pile: index(action.pile), remove: index(action.remove) };
    if (!nimChoice(p, choice) || board.choice && board.choice.pile === choice.pile && board.choice.remove === choice.remove) return null;
    return { choice };
  },
  hint(p, board) {
    if (!this.valid(p, board)) return { type: 'deadend', text: 'This choice cannot be read. Restart the piles.' };
    if (this.solved(p, board)) return { type: 'done' };
    const choice = winningMove(p.parameters.piles);
    if (!choice) return { type: 'deadend', text: 'This starting position has no winning first move against best play.' };
    return { type: 'move', action: { type: 'choose', ...choice }, remaining: 1,
      text: `${board.choice ? 'Try again from the starting piles. ' : ''}Remove ${choice.remove} from pile ${choice.pile}, leaving ${afterChoice(p, choice).join(', ')}. Each 4, 2, and 1 bundle then occurs an even number of times.` };
  },
  render(p, attempt) {
    const board = attempt.board, piles = p.parameters.piles, after = board.choice ? afterChoice(p, board.choice) : null, win = this.solved(p, board), reply = after && !win ? winningMove(after) : null;
    return `<div class="deduction-puzzle nim-puzzle">
      <div class="nim-piles" aria-label="Starting piles">${piles.map((size, i) => `<section class="nim-pile" aria-label="Pile ${i + 1}, ${size} pebbles"><h3>Pile ${i + 1}</h3><div class="nim-pebbles" aria-hidden="true">${Array.from({ length: size }, () => '<span>●</span>').join('')}</div><strong aria-label="${size} pebbles">${size}</strong></section>`).join('')}</div>
      <form data-puzzle-form>${hidden('type', 'choose')}<div class="deduction-form-controls">${selectField('pile', 'Pile', piles.map((size, i) => ({ value: i + 1, label: `Pile ${i + 1} (${size})` })), board.choice?.pile || 1)}${selectField('remove', 'Take', numbers(Math.max(...piles)), board.choice?.remove || 1)}${submitButton('Try')}</div></form>
      <div class="deduction-feedback" role="status">${after && !win ? `<p>You took ${board.choice.remove} from pile ${board.choice.pile}, leaving <strong>${after.join(', ')}</strong>.</p>${win ? '' : `<p>The other player can take ${reply.remove} from pile ${reply.pile}, leaving ${after.map((size, i) => size - (i === reply.pile - 1 ? reply.remove : 0)).join(', ')}. Try a different first move.</p>`}` : ''}</div>
      </div>`;
  },
  help(p, attempt) {
    const piles = p.parameters.piles, after = attempt.board.choice ? afterChoice(p, attempt.board.choice) : null;
    return `<div class="deduction-puzzle"><details class="nim-bundles"><summary>Explore 4, 2, and 1 bundles</summary><p>Each pile can use a bundle size at most once. A balanced position has an even count in every column.</p><table><caption>${after ? 'Piles after your move' : 'Starting piles'} as bundles</caption><thead><tr><th scope="col">Pile</th>${[4, 2, 1].map(size => `<th scope="col">${size}-bundle</th>`).join('')}</tr></thead><tbody>${(after || piles).map((size, i) => `<tr><th scope="row">${i + 1}: ${size}</th>${[4, 2, 1].map(bundle => `<td>${size & bundle ? '1' : '0'}</td>`).join('')}</tr>`).join('')}</tbody></table></details></div>`;
  },
  demo: 'From piles 1 and 2, take one pebble from the second pile. Your opponent receives two piles of 1. Whichever pile they take, you take the last pebble from the other pile.'
};

export const deductionMechanics = { latin, code, nim };
