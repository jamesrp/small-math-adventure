import { validTile } from './engine.js';

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
