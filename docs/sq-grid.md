# The shared square grid

`dist/sq-grid.js` and `dist/sq-grid.css` cut boards from the grid of unit squares. They draw a board as one SVG, make any square, grid line, grid point or piece a control, and pass taps, keys and finger strokes back to the family as moves. They also know the geometry families keep needing on squares: neighbours, the boundary of a set of squares, its pieces and holes, outlines, and shapes up to turns and flips. They never know a family's rules. Garden fences ([fences](fences/README.md), Week 26) is the first user. The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## Coordinates

- A **square** is `[x, y]`: x counts across from the left, y down from the top.
- A **grid point** is `[x, y]`, the top-left corner of square `[x, y]`.
- An **edge** is `[x, y, 0]`, the side from point `[x, y]` to `[x + 1, y]`, or `[x, y, 1]`, the side from `[x, y]` to `[x, y + 1]`. `edgeCells(e)` gives the two squares either side, `edgeEnds(e)` its two points, `sidesOf(square)` its four sides (top, right, bottom, left) and `cornersOf(square)` its four corners.

## A board

```js
import {gridOf, squareBoard, wireSquare, boundaryOf} from '../../sq-grid.js';

const g = gridOf({cols: 5, rows: 5});                         // a whole rectangle
const h = gridOf({cols: 4, rows: 3, cells: [[0, 0], [1, 0]]}); // or some of its squares
```

- Squares are numbered in reading order, top row first. Families store moves and saves by these numbers, never by drawn position, so a board can be redrawn without breaking saves.
- `gridOf` caches by its spec. The result is `{cols, rows, cells, index, at, nbr, pairs, edges, edgeIndex, sides, points, pointIndex, xy, centre, box, draw}`. `nbr[i]` lists the squares sharing a side with square i, `pairs` every such pair once, `sides[k]` the board squares beside edge k (one on the rim), and `at(x, y)` the number of a square or undefined.
- `validGridSpec(spec)` checks a spec's shape. A family's `valid` hook still checks its own board.

## Sets of squares

All take the grid and a list (or Set) of square numbers.

- `boundaryOf(g, set)` lists the edges with a square of the set on exactly one side, holes included; `perimeterOf` is its length. `sharedOf` counts the pairs of the set that share a side, so `perimeterOf = 4n − 2 · sharedOf`.
- `piecesOf(g, set)` splits the set into pieces joined across sides. A corner is not a join.
- `holesOf(g, set)` lists the holes as lists of `[x, y]`: places not in the set that can't reach the outside by stepping across sides. A hole may be off the board's squares, and a gap at a corner does not let the outside in, so two squares that touch at a corner can seal a hole.
- `outlineOf(g, set)` traces the boundary as loops of grid points with the set on their left. Each loop borders one empty region, so a piece with h holes has h + 1 loops; where two squares touch only at a corner, a loop passes through that corner twice. `pathOf` gives the loops as an SVG path (draw it with `fill-rule: evenodd`).

## Shapes

`normalize(cells)` shifts a list of `[x, y]` to start at `[0, 0]` in reading order. `symmetries(cells)` gives its eight turns and flips. `shapeKey(cells)` is the same wherever the shape sits, `freeKey(cells)` the same however it is also turned or flipped, and `cellsOfKey(key)` reads either back. Families compare and store shapes by these keys.

## Drawing

`squareBoard(g, opts)` returns one `<svg class="sg-board">`. The family says how each thing looks and which are controls:

```js
squareBoard(g, {
  cls: 'my-board', label: 'Board',
  cell: i => ({cls, label, act, dot}),          // act: a tap target with aria-label label; dot: a marker
  edge: k => ({cls, label, act}) || null,       // edges to draw; act: a tap target along the edge
  point: k => ({cls, label, act}) || null,      // grid points to draw; act: a tap target
  pieces: [{cells, cls, label, act, key}],      // drawn as one outline each; act: a tap target (data-sg-piece=key)
  under: '<svg above the squares>', over: '<svg above the pieces and edges>',
  stroke: true,                                 // a finger on the board slides instead of scrolling
  picture: true                                 // a small picture with no controls (a shelf item, an icon)
});
```

Every control is focusable and answers Enter and Space. Styles live in `sq-grid.css`; a family's stylesheet imports it and colours squares and edges with its own classes (`sg-cell tile`, `sg-edge fence` in Garden fences).

## Wiring

`wireSquare(root, g, handlers, apply)` turns taps into moves: `handlers.cell(i)`, `handlers.piece(key)`, `handlers.edge(k)` and `handlers.point(k)` each return a move or null. With `handlers.stroke`, pressing on a square and sliding through others collects the squares whose middles the finger crossed, in order; sliding back over the path shortens it. `handlers.preview(cells)` says `'ok'` or `'blocked'` while sliding, or returns `{show, blocked}` to light other squares than the path (Garden fences lights only the square a carried tile would land on), and `handlers.stroke(cells)` returns the move on release. A slide that never leaves its first square is a tap; one that comes back to it does nothing. Taps are read from the pointer's press and release rather than the click, because a phone browser can drop the click after a touch; the click that follows is ignored, and a click with no press before it (as assistive technology sends) still works. `cellAt(g, x, y, core)` finds the square under a drawing position.

## Building on it

- **Week 48 (inside and outside covers).** A shape drawn over the grid in `under`, squares tapped as whole or partial with `cell(i)` classes, and finer squares as a second grid with twice the columns and rows drawn at half the size (`draw` is per grid, so a family can scale the SVG). The bounds are counts of tapped squares.
- **Week 54 (partitions).** Strips of squares as `pieces`, one per part, with edges as tap targets where a strip can be split; `symmetries` and `freeKey` give the swap of rows and columns that conjugates a partition.
- **Other boards.** Hidden pictures (Week 25) and Bracing frames (Week 52) draw their own grids and stay as they are.
