# Tile Garden engine contract

Tile puzzles keep `mechanic: "tile"`, row-major integer `cells`, `cols`, and `rows`. Optional `tileShape` is `"domino"` (the default when omitted) or `"l-tromino"`. Other values are rejected. Each puzzle uses one shape throughout; mixed menus and inventories are unsupported.

Boards and solution witnesses are arrays of cell arrays. A domino contains two side-adjacent cells. An L-tromino contains three distinct corners of a 2×2 block, in any order. All four rotations are legal. Every cell must belong to the region and lie within its dimensions; pieces cannot overlap. Completion accepts every exact cover, independently of the authored witness.

`tileSize`, `validTile`, and `tilePlacements` expose these rules. `move` accepts a complete cell array. `solveTiles(puzzle, board)` returns additional placements preserving existing pieces, `[]` for a complete cover, or `null` for an invalid board or dead end. `nextHint` retains its existing `pair` property, now containing either two or three cells. Removal lifts the entire piece containing the selected cell; undo restores the preceding board.

`dist/tile-controls.js` exposes DOM-free input rules for shared tap and stroke controls. `classifyTileCells` returns `extendable`, `complete`, or `blocked` against currently empty legal placements; it does not require the remaining board to be solvable. `tapTileSelection` toggles a selected cell or restarts an incompatible selection at the latest cell. `startTileStroke` and `extendTileStroke` keep distinct cells in entry order and retain a blocked result until release. `tileStrokeTarget` maps viewport coordinates to a grid cell only in its central 60%; gutters return `null`, and leaving the board returns `-1`. The caller supplies rectangles for every grid square, including holes. These helpers do not edit attempts or saves.

Content validation checks area divisibility by the selected tile size, solver feasibility, and every witness move through the same rules. Focused engine tests exercise all orientations, invalid geometry, alternate covers, partial states, dead ends, removal, undo, and legacy domino compatibility.

Dragging across empty cells previews a tile and submits a legal piece through `move` on release. Tapping cells in any order submits a complete piece; Enter and Space on cell buttons do the same. An incompatible tap starts a new selection. Blocked strokes show a dashed preview and submit nothing. Each placed L paints only its three cells, with matching colors and tile numbers. Any occupied cell lifts the entire piece.

Help and read-aloud use the configured shape; solver hints highlight and describe every cell. The shipped pack now includes nine L-only replacements; see [authoring and migration notes](l-gardens.md).

The older `scripts/tile-browser-smoke.mjs` still covers the former controls and needs updating for this interaction before it can serve as browser evidence.

Mathematical context: consulted `plans/week-01-tiling-redesign.md` in the local math-circle project and this repository's `docs/puzzle-expansion/existing-types.md`. The former distinguishes square-grid L-trominoes from triangular pattern blocks and records the deficient-square construction. The requested local `worksheets/` directory was unavailable. Test boards are synthetic verification fixtures, not borrowed worksheet instances or newly authored grade content. No research theorem is needed for the exhaustive exact-cover search.
