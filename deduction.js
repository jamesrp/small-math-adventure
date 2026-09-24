import { esc, actionButton } from './expansion-controls.js';

// Week 5 entry-clue Latin squares, Week 6 exact-position binary feedback,
// and Week 8 normal-play Nim. Source lineage lives in docs/puzzle-expansion/deduction.md.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => typeof value === 'number' && Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const numbers = n => Array.from({ length: n }, (_, i) => i + 1);

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
    if (!integer(cell) || cell < 0 || cell >= n * n || p.parameters.givens.flat()[cell] || !integer(value) || value < 0 || value > n || mode !== 'ink') return null;
    const next = clone(board);
    // Keep the notes field readable for older saves; new moves only mark cells.
    next.cells[cell] = value; next.notes[cell] = [];
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
  render(p, attempt, context = {}) {
    const board = attempt.board, n = p.parameters.order, givens = p.parameters.givens.flat(), conflicts = latinConflicts(n, board.cells);
    const first = board.cells.findIndex((value, cell) => !value && !givens[cell]);
    const selected = integer(context.selected) && !givens[context.selected] ? context.selected : first < 0 ? givens.findIndex(value => !value) : first;
    const solved = this.solved(p, board);
    return `<div class="deduction-puzzle latin-puzzle">
      <div class="latin-grid" role="group" aria-label="Choose a square" style="--latin-order:${n}">${board.cells.map((value, cell) => {
        const label = `Row ${Math.floor(cell / n) + 1}, column ${cell % n + 1}: ${value || 'empty'}${conflicts.has(cell) ? '; repeated symbol' : ''}`;
        return givens[cell] ? `<div class="latin-given${conflicts.has(cell) ? ' latin-conflict' : ''}" role="img" aria-label="${esc(label)}; fixed clue">${value}</div>` : `<button type="button" class="latin-cell${conflicts.has(cell) ? ' latin-conflict' : ''}" data-action="latin-cell" data-cell="${cell}" data-focus="latin-cell-${cell}" aria-label="${esc(label)}" aria-pressed="${cell === selected}" ${solved ? 'disabled' : ''}>${value || ''}</button>`;
      }).join('')}</div><div class="latin-keypad" role="group" aria-label="Mark row ${Math.floor(selected / n) + 1}, column ${selected % n + 1}">${[...numbers(n), 0].map(value => actionButton(value || 'Clear', { type: 'set', cell: selected, value }, `aria-label="${value ? `Mark ${value}` : 'Clear square'}" ${solved || board.cells[selected] === value ? 'disabled' : ''}`)).join('')}</div>
      ${conflicts.size ? '<p class="deduction-feedback" role="status">A symbol repeats: check the outlined squares.</p>' : ''}</div>`;
  },
  demo: 'Tap a square, then a number to mark it. You can also type a number; Delete or Backspace clears the selected square. Each symbol belongs once in every row and column. Dark squares are fixed.'
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
function nimChoice(piles, choice) {
  return object(choice) && integer(choice.pile) && choice.pile >= 1 && choice.pile <= piles.length && integer(choice.remove) && choice.remove >= 1 && choice.remove <= piles[choice.pile - 1];
}
function afterChoice(piles, choice) { return piles.map((size, i) => size - (i === choice.pile - 1 ? choice.remove : 0)); }
function winningMove(piles) {
  const sum = nimSum(piles);
  for (let i = 0; i < piles.length; i++) { const target = piles[i] ^ sum; if (target < piles[i]) return { pile: i + 1, remove: piles[i] - target }; }
  return null;
}
const legalNimMoves = piles => piles.flatMap((size, i) => numbers(size).map(remove => ({ pile: i + 1, remove })));
const nimWinner = board => board.piles.some(Boolean) ? null : board.turns.at(-1)?.player;
// Strictly recognize the former first-move format before migrating a saved attempt.
export function legacyNimBoard(p, board) {
  return object(board) && Object.keys(board).length === 1 && Object.hasOwn(board, 'choice') && (board.choice === null || nimChoice(p.parameters.piles, board.choice));
}
function nimValid(p, board) {
  if (!object(board) || !Array.isArray(board.piles) || board.piles.length !== p.parameters.piles.length || !Array.isArray(board.turns) || board.turns.length > p.parameters.piles.reduce((a, b) => a + b, 0)) return false;
  let piles = [...p.parameters.piles];
  for (const [i, turn] of board.turns.entries()) {
    if (!nimChoice(piles, turn) || turn.player !== (i % 2 ? 'opponent' : 'you')) return false;
    piles = afterChoice(piles, turn);
  }
  return board.piles.every((size, i) => integer(size) && size === piles[i]) && (board.turns.length % 2 === 0 || !piles.some(Boolean));
}
const nim = {
  fresh: p => ({ piles: [...p.parameters.piles], turns: [] }),
  valid: nimValid,
  solved: (p, board) => nimValid(p, board) && nimWinner(board) === 'you',
  // Commit the player's turn and reply together: saves and Undo always land
  // at a player's turn. Inject randomness so strategy tests can cover each reply.
  move(p, board, action, random = Math.random) {
    if (!nimValid(p, board) || nimWinner(board) || !object(action) || action.type !== 'choose') return null;
    const choice = { pile: index(action.pile), remove: index(action.remove) };
    if (!nimChoice(board.piles, choice)) return null;
    let piles = afterChoice(board.piles, choice);
    const turns = [...board.turns, { player: 'you', ...choice }];
    if (piles.some(Boolean)) {
      const options = legalNimMoves(piles), reply = winningMove(piles) || options[Math.floor(random() * options.length)];
      piles = afterChoice(piles, reply);
      turns.push({ player: 'opponent', ...reply });
    }
    return { piles, turns };
  },
  hint(p, board) {
    if (!nimValid(p, board)) return { type: 'deadend', text: 'Restart to restore the piles.' };
    if (this.solved(p, board)) return { type: 'done' };
    if (nimWinner(board)) return { type: 'deadend', text: 'The opponent took the last pebble. Undo or restart to try again.' };
    const best = winningMove(board.piles), choice = best || legalNimMoves(board.piles)[0];
    return { type: 'move', action: { type: 'choose', ...choice },
      text: best ? `Take ${choice.remove} from pile ${choice.pile}, leaving ${afterChoice(board.piles, choice).join(', ')}. Keep returning the opponent to a balanced position.` : `There is no forced win from these piles. Try taking ${choice.remove} from pile ${choice.pile}, or undo your last turn.` };
  },
  render(p, attempt) {
    const board = attempt.board, winner = nimWinner(board), reply = board.turns.at(-1);
    const status = winner === 'you' ? '' : winner === 'opponent' ? 'Opponent wins.' : 'Your turn';
    return `<div class="deduction-puzzle nim-puzzle">
      <div class="nim-status" role="status" tabindex="-1" data-focus="nim-status">${reply?.player === 'opponent' ? `<span>Opponent took ${reply.remove} from pile ${reply.pile}.</span> ` : ''}<strong>${status}</strong></div>
      <div class="nim-piles" aria-label="Remaining piles">${board.piles.map((size, i) => `<section class="nim-pile" aria-label="Pile ${i + 1}, ${size} pebbles"><h3>Pile ${i + 1}</h3><div class="nim-pebbles" aria-hidden="true">${Array.from({ length: size }, () => '<span>●</span>').join('')}</div><strong aria-label="${size} pebbles">${size}</strong><div class="nim-take" role="group" aria-label="Take from pile ${i + 1}"><span>Take</span>${numbers(p.parameters.piles[i]).map(remove => actionButton(String(remove), { type: 'choose', pile: i + 1, remove }, `aria-label="Take ${remove} from pile ${i + 1}" ${winner || remove > size ? 'disabled' : ''}`)).join('')}</div></section>`).join('')}</div>
      </div>`;
  },
  help(p, attempt) {
    const piles = attempt.board.piles;
    const largest = Math.max(...p.parameters.piles), bundles = [];
    for (let size = 2 ** Math.max(2, Math.floor(Math.log2(largest))); size >= 1; size /= 2) bundles.push(size);
    return `<div class="deduction-puzzle"><details class="nim-bundles"><summary>Explore ${bundles.slice(0,-1).join(', ')}, and 1 bundles</summary><p>Each pile can use a bundle size at most once. A balanced position has an even count in every column.</p><table><caption>Remaining piles as bundles</caption><thead><tr><th scope="col">Pile</th>${bundles.map(size => `<th scope="col">${size}-bundle</th>`).join('')}</tr></thead><tbody>${piles.map((size, i) => `<tr><th scope="row">${i + 1}: ${size}</th>${bundles.map(bundle => `<td>${size & bundle ? '1' : '0'}</td>`).join('')}</tr>`).join('')}</tbody></table></details></div>`;
  },
  demo: 'Take any positive number from one pile. The opponent replies automatically. Take the last pebble to win. Undo takes back your move and the opponent’s reply.'
};

export const deductionMechanics = { latin, code, nim };
