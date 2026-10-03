import {isExpansion, mechanicFor} from './expansion.js';
// Puzzle rules without DOM or storage. Random choices accept an injectable source.
export const CONTENT_VERSION = 1;
export const BANDS = { k1: { label: 'K–1', name: 'Little discoveries' }, '23': { label: '2–3', name: 'Pattern seekers' }, '45': { label: '4–5', name: 'Big thinkers' } };
export const clone = value => JSON.parse(JSON.stringify(value));
export function adjacent(a, b, cols) {
  return Number.isInteger(a) && Number.isInteger(b) && Math.abs(a % cols - b % cols) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) === 1;
}
// Omitted metadata preserves all legacy domino puzzles and saves.
export function tileSize(puzzle) {
  const shape = puzzle.tileShape === undefined ? 'domino' : puzzle.tileShape;
  return shape === 'domino' ? 2 : shape === 'l-tromino' ? 3 : null;
}
export function validTile(puzzle, cells) {
  const size = tileSize(puzzle);
  if (!size || !Array.isArray(cells) || cells.length !== size || new Set(cells).size !== size) return false;
  if (!cells.every(c => Number.isInteger(c) && c >= 0 && c < puzzle.cols * puzzle.rows && puzzle.cells.includes(c))) return false;
  if (size === 2) return adjacent(cells[0], cells[1], puzzle.cols);
  const xs = cells.map(c => c % puzzle.cols), ys = cells.map(c => Math.floor(c / puzzle.cols));
  return Math.max(...xs) - Math.min(...xs) === 1 && Math.max(...ys) - Math.min(...ys) === 1;
}
// All placements on the region, independent of the currently occupied cells.
export function tilePlacements(puzzle) {
  if (tileSize(puzzle) === 2) return puzzle.cells.flatMap(a => puzzle.cells.filter(b => a < b && validTile(puzzle, [a,b])).map(b => [a,b]));
  if (tileSize(puzzle) !== 3) return [];
  const placements = [];
  for (let y = 0; y < puzzle.rows - 1; y++) for (let x = 0; x < puzzle.cols - 1; x++) {
    const a = y * puzzle.cols + x, square = [a, a + 1, a + puzzle.cols, a + puzzle.cols + 1];
    for (let missing = 0; missing < 4; missing++) {
      const cells = square.filter((_, i) => i !== missing);
      if (validTile(puzzle, cells)) placements.push(cells);
    }
  }
  return placements;
}
export function freshAttempt(puzzle, random = Math.random) {
  return { revision: puzzle.revision || 1, board: isExpansion(puzzle) ? mechanicFor(puzzle).fresh(puzzle, random) : puzzle.mechanic === 'tile' ? [] : [...puzzle.start], history: [], moves: 0, hintLevel: 0, helpUsed: false, completed: false, lastPlayed: Date.now() };
}
export function resumeAttempt(puzzle, attempt, random = Math.random) {
  if (!attempt) return freshAttempt(puzzle, random);
  return isSolved(puzzle, attempt.board) ? restart(puzzle, attempt, random) : attempt;
}
export function validBoard(puzzle, board) {
  if (isExpansion(puzzle)) { try { return mechanicFor(puzzle).valid(puzzle, board) === true; } catch { return false; } }
  if (!['tile','swap'].includes(puzzle.mechanic)) return false;
  if (!Array.isArray(board)) return false;
  if (puzzle.mechanic === 'swap') return board.length === puzzle.start.length && new Set(board).size === board.length && board.every(n => Number.isInteger(n) && puzzle.target.includes(n));
  if (!tileSize(puzzle)) return false;
  const used = new Set();
  for (const pair of board) {
    if (!validTile(puzzle, pair)) return false;
    for (const cell of pair) { if (!puzzle.cells.includes(cell) || used.has(cell)) return false; used.add(cell); }
  }
  return true;
}
export function isSolved(puzzle, board) {
  if (!validBoard(puzzle, board)) return false;
  if (isExpansion(puzzle)) return mechanicFor(puzzle).solved(puzzle, board);
  return puzzle.mechanic === 'tile' ? board.length * tileSize(puzzle) === puzzle.cells.length : board.every((v, i) => v === puzzle.target[i]);
}
export function solveTiles(puzzle, board = []) {
  if (!validBoard(puzzle, board)) return null;
  const occupied = new Set(board.flat());
  const free = new Set(puzzle.cells.filter(c => !occupied.has(c)));
  if (free.size % tileSize(puzzle)) return null;
  const placements = tilePlacements(puzzle);
  const byCell = new Map(puzzle.cells.map(c => [c, placements.filter(piece => piece.includes(c))]));
  const failed = new Set();
  function search() {
    if (!free.size) return [];
    const key = [...free].sort((a,b) => a-b).join(',');
    if (failed.has(key)) return null;
    let options;
    for (const cell of free) {
      const available = byCell.get(cell).filter(piece => piece.every(c => free.has(c)));
      if (!available.length) { failed.add(key); return null; }
      if (!options || available.length < options.length) options = available;
    }
    for (const piece of options) {
      piece.forEach(c => free.delete(c));
      const rest = search();
      piece.forEach(c => free.add(c));
      if (rest) return [[...piece], ...rest];
    }
    failed.add(key); return null;
  }
  return search();
}
const swapGraphs = new Map();
export function swapGraph(puzzle) {
  const graphKey = JSON.stringify([puzzle.target, puzzle.edges]);
  if (swapGraphs.has(graphKey)) return swapGraphs.get(graphKey);
  const key = puzzle.target.join(',');
  const seen = new Map([[key, { distance: 0, next: null }]]);
  const queue = [[...puzzle.target]];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const distance = seen.get(current.join(',')).distance;
    for (const [a,b] of puzzle.edges) {
      const next = [...current]; [next[a], next[b]] = [next[b], next[a]];
      const nextKey = next.join(',');
      if (!seen.has(nextKey)) { seen.set(nextKey, { distance: distance + 1, next: [a,b] }); queue.push(next); }
    }
  }
  swapGraphs.set(graphKey, seen); return seen;
}
export function solveSwaps(puzzle, board = puzzle.start) {
  if (!validBoard(puzzle, board)) return null;
  const graph = swapGraph(puzzle), current = [...board], path = [];
  let node = graph.get(current.join(','));
  if (!node) return null;
  while (node.next) { const [a,b] = node.next; path.push([a,b]); [current[a],current[b]] = [current[b],current[a]]; node = graph.get(current.join(',')); }
  return path;
}
export function nextHint(puzzle, attempt) {
  if (isSolved(puzzle, attempt.board)) return { type: 'done' };
  if (isExpansion(puzzle)) return mechanicFor(puzzle).hint(puzzle, attempt.board);
  const path = puzzle.mechanic === 'tile' ? solveTiles(puzzle, attempt.board) : solveSwaps(puzzle, attempt.board);
  if (!path) return { type: 'deadend', text: 'The remaining cells cannot be covered. Lift a tile or undo.' };
  return { type: 'move', pair: path[0], remaining: path.length };
}
export function move(puzzle, attempt, pair, random = Math.random) {
  if (isExpansion(puzzle)) {
    if (!validBoard(puzzle, attempt.board)) return null;
    const board = mechanicFor(puzzle).move(puzzle, attempt.board, pair, random);
    return board && validBoard(puzzle, board) ? commitBoard(puzzle, attempt, board) : null;
  }
  if (!validBoard(puzzle, attempt.board) || !Array.isArray(pair) || !pair.every(Number.isInteger)) return null;
  const [a,b] = pair, board = clone(attempt.board);
  if (puzzle.mechanic === 'tile') {
    board.push([...pair]);
    if (!validBoard(puzzle, board)) return null;
  } else {
    if (pair.length !== 2) return null;
    if (!puzzle.edges.some(([x,y]) => (x === a && y === b) || (x === b && y === a))) return null;
    [board[a],board[b]] = [board[b],board[a]];
  }
  return commitBoard(puzzle, attempt, board);
}
function commitBoard(puzzle, attempt, board) {
  if (JSON.stringify(board) === JSON.stringify(attempt.board)) return attempt;
  // Puzzles without Undo (Proofs one-check rounds and duels) keep no history.
  const keep = !(isExpansion(puzzle) && mechanicFor(puzzle).noUndo?.(puzzle));
  return { ...attempt, board, moves: attempt.moves + 1, history: keep ? [...attempt.history, { board: clone(attempt.board), moves: attempt.moves }].slice(-120) : [], completed: attempt.completed || isSolved(puzzle, board), lastPlayed: Date.now() };
}
export function removeTile(puzzle, attempt, cell) {
  if (puzzle.mechanic !== 'tile' || !attempt.board.some(pair => pair.includes(cell))) return null;
  return commitBoard(puzzle, attempt, attempt.board.filter(pair => !pair.includes(cell)));
}
export function undo(attempt) {
  if (!attempt.history.length) return attempt;
  const previous = attempt.history.at(-1);
  return { ...attempt, board: clone(previous.board), moves: previous.moves, history: attempt.history.slice(0,-1), lastPlayed: Date.now() };
}
export function restart(puzzle, attempt, random = Math.random) {
  return { ...freshAttempt(puzzle, random), completed: attempt.completed, helpUsed: attempt.helpUsed };
}
export function undoToSolvable(puzzle, attempt) {
  let next = attempt;
  while (nextHint(puzzle, next).type === 'deadend' && next.history.length) next = undo(next);
  return next;
}
