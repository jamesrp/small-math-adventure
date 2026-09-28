import { tilePlacements, tileSize, validTile } from './engine.js';

// Input rules are independent of the current controls and of saved attempts.
// A partial piece only needs to fit one empty placement; the rest of the
// garden need not remain tileable.
export function classifyTileCells(p, board, cells) {
  if (!Array.isArray(cells) || !Array.isArray(board) || !tileSize(p) ||
      cells.length > tileSize(p) || new Set(cells).size !== cells.length) return 'blocked';
  const occupied = new Set(board.flat());
  if (cells.some(cell => !Number.isInteger(cell) || !p.cells.includes(cell) || occupied.has(cell))) return 'blocked';
  if (cells.length === tileSize(p)) return validTile(p, cells) ? 'complete' : 'blocked';
  return tilePlacements(p).some(piece => cells.every(cell => piece.includes(cell)) &&
    piece.every(cell => !occupied.has(cell))) ? 'extendable' : 'blocked';
}

export function tapTileSelection(p, board, selected, cell) {
  const previous = Array.isArray(selected) ? selected : [];
  const cells = previous.includes(cell)
    ? previous.filter(value => value !== cell)
    : [...previous, cell];
  const status = classifyTileCells(p, board, cells);
  if (status !== 'blocked') return { cells, status };
  const restarted = [cell];
  return { cells: restarted, status: classifyTileCells(p, board, restarted) };
}

export function startTileStroke(p, board, cell) {
  const cells = [cell];
  return { cells, status: classifyTileCells(p, board, cells) };
}

// null means a grid gutter. -1 means outside the board. Repeated cells do
// nothing, even when revisited after another cell. A blocked stroke stays so.
export function extendTileStroke(p, board, stroke, cell) {
  if (cell === null || stroke.cells.includes(cell)) return stroke;
  const cells = cell === -1 ? [...stroke.cells] : [...stroke.cells, cell];
  const status = stroke.status === 'blocked' || cell === -1
    ? 'blocked' : classifyTileCells(p, board, cells);
  return { cells, status };
}

// Releasing can confirm a previewed piece, but cannot silently add a new cell.
// A stationary press stays a tap even when its lone cell is not extendable.
export function tileReleaseAction(stroke, multi, departed, hit, insideStart) {
  if (departed || hit === -1 || (hit !== null && !stroke.cells.includes(hit))) return null;
  if (multi) return stroke.status === 'complete' ? { type: 'place', cells: stroke.cells } : null;
  return insideStart ? { type: 'tap', cell: stroke.cells[0] } : null;
}

// Rectangles are viewport coordinates for every grid square, including holes.
// Only the central 60% of a square enters a stroke; ordinary gutters are neutral.
export function tileStrokeTarget(boardRect, cellRects, x, y) {
  if (x < boardRect.left || x > boardRect.right || y < boardRect.top || y > boardRect.bottom) return -1;
  for (const { cell, rect } of cellRects) {
    const insetX = rect.width * .2, insetY = rect.height * .2;
    if (x >= rect.left + insetX && x <= rect.right - insetX &&
        y >= rect.top + insetY && y <= rect.bottom - insetY) return cell;
  }
  return null;
}

export function tileInstructions(p) {
  return p.tileShape === 'l-tromino'
    ? 'Drag across three empty squares forming an L, or tap those squares in any order. Tap a placed tile to lift it.'
    : 'Drag across two neighboring empty squares, or tap them in either order. Tap a placed domino to lift it.';
}
