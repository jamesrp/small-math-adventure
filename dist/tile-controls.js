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

// The selected square is the elbow, held fixed while the piece rotates clockwise.
export function lOffsets(rotation = 0) {
  let offsets = [[0, 0], [0, 1], [1, 0]];
  for (let turn = 0; turn < rotation % 4; turn++) offsets = offsets.map(([r, c]) => [c, -r]);
  return offsets;
}
export function lPreview(p, board, anchor, rotation = 0) {
  if (!Number.isInteger(anchor)) return { cells: [], valid: false };
  const points = lOffsets(rotation).map(([r, c]) => [Math.floor(anchor / p.cols) + r, anchor % p.cols + c]);
  const cells = points.map(([r, c]) => r >= 0 && r < p.rows && c >= 0 && c < p.cols ? r * p.cols + c : -1);
  return { cells, valid: validTile(p, cells) && !cells.some(cell => board.some(piece => piece.includes(cell))) };
}
export function tileInstructions(p) {
  return p.tileShape === 'l-tromino'
    ? 'Each L-tromino covers three squares. Tap an empty square for its elbow, use Rotate to turn the preview, then Place. All three squares must be empty and inside the garden. Tap any square of a placed tile to lift it.'
    : 'Tap two neighboring empty squares to place a domino. Tap a domino to remove it.';
}
