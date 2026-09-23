import {isExpansion, mechanicFor} from './expansion.js';
// Pure, deterministic puzzle rules. No DOM, storage, randomness, or scoring.
export const CONTENT_VERSION = 1;
export const BANDS = { k1: { label: 'K–1', name: 'Little discoveries' }, '23': { label: '2–3', name: 'Pattern seekers' }, '45': { label: '4–5', name: 'Big thinkers' } };
export const clone = value => JSON.parse(JSON.stringify(value));
export function adjacent(a, b, cols) {
  return Number.isInteger(a) && Number.isInteger(b) && Math.abs(a % cols - b % cols) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) === 1;
}
export function freshAttempt(puzzle) {
  return { revision: puzzle.revision || 1, board: isExpansion(puzzle) ? mechanicFor(puzzle).fresh(puzzle) : puzzle.mechanic === 'tile' ? [] : [...puzzle.start], history: [], moves: 0, hintLevel: 0, helpUsed: false, completed: false, lastPlayed: Date.now() };
}
export function validBoard(puzzle, board) {
  if (isExpansion(puzzle)) { try { return mechanicFor(puzzle).valid(puzzle, board) === true; } catch { return false; } }
  if (!['tile','swap'].includes(puzzle.mechanic)) return false;
  if (!Array.isArray(board)) return false;
  if (puzzle.mechanic === 'swap') return board.length === puzzle.start.length && new Set(board).size === board.length && board.every(n => Number.isInteger(n) && puzzle.target.includes(n));
  const used = new Set();
  for (const pair of board) {
    if (!Array.isArray(pair) || pair.length !== 2 || !adjacent(pair[0], pair[1], puzzle.cols)) return false;
    for (const cell of pair) { if (!puzzle.cells.includes(cell) || used.has(cell)) return false; used.add(cell); }
  }
  return true;
}
export function isSolved(puzzle, board) {
  if (!validBoard(puzzle, board)) return false;
  if (isExpansion(puzzle)) return mechanicFor(puzzle).solved(puzzle, board);
  return puzzle.mechanic === 'tile' ? board.length * 2 === puzzle.cells.length : board.every((v, i) => v === puzzle.target[i]);
}
export function solveTiles(puzzle, board = []) {
  if (!validBoard(puzzle, board)) return null;
  const free = new Set(puzzle.cells.filter(c => !board.flat().includes(c)));
  const failed = new Set();
  function search() {
    if (!free.size) return [];
    const key = [...free].sort((a,b) => a-b).join(',');
    if (failed.has(key)) return null;
    let chosen, options;
    for (const a of free) {
      const neighbors = [...free].filter(b => adjacent(a, b, puzzle.cols));
      if (!neighbors.length) { failed.add(key); return null; }
      if (!options || neighbors.length < options.length) { chosen = a; options = neighbors; }
    }
    free.delete(chosen);
    for (const b of options) {
      free.delete(b);
      const rest = search();
      free.add(b);
      if (rest) { free.add(chosen); return [[chosen, b], ...rest]; }
    }
    free.add(chosen); failed.add(key); return null;
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
  if (!path) return { type: 'deadend', text: 'One patch has no partner. Try lifting a tile, or undo to a place where the garden can still be covered.' };
  return { type: 'move', pair: path[0], remaining: path.length };
}
export function move(puzzle, attempt, pair) {
  if (isExpansion(puzzle)) {
    if (!validBoard(puzzle, attempt.board)) return null;
    const board = mechanicFor(puzzle).move(puzzle, attempt.board, pair);
    return board && validBoard(puzzle, board) ? commitBoard(puzzle, attempt, board) : null;
  }
  if (!validBoard(puzzle, attempt.board) || !Array.isArray(pair) || pair.length !== 2 || !pair.every(Number.isInteger)) return null;
  const [a,b] = pair, board = clone(attempt.board);
  if (puzzle.mechanic === 'tile') {
    if (!puzzle.cells.includes(a) || !puzzle.cells.includes(b) || !adjacent(a,b,puzzle.cols) || board.flat().includes(a) || board.flat().includes(b)) return null;
    board.push([a,b]);
  } else {
    if (!puzzle.edges.some(([x,y]) => (x === a && y === b) || (x === b && y === a))) return null;
    [board[a],board[b]] = [board[b],board[a]];
  }
  return commitBoard(puzzle, attempt, board);
}
function commitBoard(puzzle, attempt, board) {
  if (JSON.stringify(board) === JSON.stringify(attempt.board)) return attempt;
  return { ...attempt, board, moves: attempt.moves + 1, history: [...attempt.history, { board: clone(attempt.board), moves: attempt.moves }].slice(-120), completed: attempt.completed || isSolved(puzzle, board), lastPlayed: Date.now() };
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
export function restart(puzzle, attempt) {
  return { ...freshAttempt(puzzle), completed: attempt.completed, helpUsed: attempt.helpUsed };
}
export function undoToSolvable(puzzle, attempt) {
  let next = attempt;
  while (nextHint(puzzle, next).type === 'deadend' && next.history.length) next = undo(next);
  return next;
}
