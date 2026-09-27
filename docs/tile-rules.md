# Tile Garden engine contract

Tile puzzles keep `mechanic: "tile"`, row-major integer `cells`, `cols`, and `rows`. Optional `tileShape` is `"domino"` (the default when omitted) or `"l-tromino"`. Other values are rejected. Each puzzle uses one shape throughout; mixed menus and inventories are unsupported.

Boards and solution witnesses are arrays of cell arrays. A domino contains two side-adjacent cells. An L-tromino contains three distinct corners of a 2×2 block, in any order. All four rotations are legal. Every cell must belong to the region and lie within its dimensions; pieces cannot overlap. Completion accepts every exact cover, independently of the authored witness.

`tileSize`, `validTile`, and `tilePlacements` expose these rules. `move` accepts a complete cell array. `solveTiles(puzzle, board)` returns additional placements preserving existing pieces, `[]` for a complete cover, or `null` for an invalid board or dead end. `nextHint` retains its existing `pair` property, now containing either two or three cells. Removal lifts the entire piece containing the selected cell; undo restores the preceding board.

Content validation checks area divisibility by the selected tile size, solver feasibility, and every witness move through the same rules. Focused engine tests exercise all orientations, invalid geometry, alternate covers, partial states, dead ends, removal, undo, and legacy domino compatibility.

This change supplies engine and validator support only. The shipped puzzle pack and play controls are unchanged; authoring L instances and adapting controls are separate work.

Mathematical context: consulted `plans/week-01-tiling-redesign.md` in the local math-circle project and this repository's `docs/puzzle-expansion/existing-types.md`. The former distinguishes square-grid L-trominoes from triangular pattern blocks and records the deficient-square construction. The requested local `worksheets/` directory was unavailable. Test boards are synthetic verification fixtures, not borrowed worksheet instances or newly authored grade content. No research theorem is needed for the exhaustive exact-cover search.
