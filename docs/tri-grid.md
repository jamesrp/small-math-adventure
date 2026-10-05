# The shared triangle grid

`dist/tri-grid.js` and `dist/tri-grid.css` cut boards from the grid of unit triangles that pattern blocks fit. They draw a board as one SVG, make any triangle, piece or grid point a control, and pass taps, keys and finger strokes back to the family as moves. They never know a family's rules. Rhombus gardens ([rhombus](rhombus/README.md), Week 1) is the first user. The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## Coordinates

- A **grid point** is `[u, v]`: u steps along a horizontal edge, v along the edge leaning up and to the right. It is drawn at (u + v/2, √3/2 · v).
- A **cell** is `[u, v, 0]`, the up triangle with corners `[u, v]`, `[u+1, v]`, `[u, v+1]`, or `[u, v, 1]`, the down triangle with corners `[u+1, v]`, `[u+1, v+1]`, `[u, v+1]`. Two cells that share a side always point opposite ways.
- `corners(cell)`, `touching(cell)` (the three cells across its sides), `cellOf(points)`, `turnPoint` (a sixth of a turn about `[0, 0]`) and `mirrorPoint` (the mirror in u = v) are exported for families that need their own geometry.

## A board

A puzzle describes its board in `parameters`:

```js
import {gridOf, placements, triBoard, wireTri} from '../../tri-grid.js';

const g = gridOf({outline: [[0, 0], [3, 0], [0, 3]]});   // a polygon along grid lines
const h = gridOf({cells: [[0, 0, 0], [0, 0, 1]], turn: true}); // or a list of cells; turn draws it a quarter turn round
```

- Cells are numbered in reading order, top row first. Families store moves and saves by these numbers, never by drawn position, so a board can be redrawn without breaking saves.
- `gridOf` caches by its spec. The result is `{cells, index, nbr, pairs, points, pointIndex, around, xy, centre, box, turn, up, draw}`. `nbr[i]` lists the cells sharing a side with cell i; `pairs` lists every such pair once; `around[k]` lists the cells round point k (six for an inner point); `xy` and `centre` are drawing positions.
- `validGridSpec(spec)` checks a spec's shape. A family's `valid` hook still checks its own board.
- `placements(g, shape, mirror)` lists every place a piece fits, as sorted cell numbers, over every turn (and, with `mirror`, every reflection). `SHAPES` holds the pattern blocks: `triangle`, `rhombus`, `trapezoid`, `chevron` and `hexagon`. Add a shape there, as cells near `[0, 0]`, for a new piece.
- `outlineOf(g, cells)` traces the boundary of any set of cells as loops of grid points. `cellPoints`, `piecePoints` and `insetPoints` give SVG point lists.

## Drawing

`triBoard(g, opts)` returns one `<svg class="tg-board">`. The family says how each thing looks and which are controls:

```js
triBoard(g, {
  cls: 'my-board', label: 'Board',
  cell: i => ({cls, label, act, dot}),          // act: a tap target with aria-label label; dot: a marker
  pieces: [{cells, cls, label, act, key}],      // drawn as one outline each; act: a tap target (data-tg-piece=key)
  point: k => ({cls, label, act}) || null,      // grid points to draw; act: a tap target
  under: '<svg below the pieces>', over: '<svg above them>',
  stroke: true                                  // a finger on the board draws instead of scrolling
});
```

Every control is focusable and answers Enter and Space. Styles live in `tri-grid.css`; a family's stylesheet imports it and colours pieces with its own classes (`rh-face f0` and so on in Rhombus gardens).

## Wiring

`wireTri(root, g, handlers, apply)` turns taps into moves: `handlers.cell(i)`, `handlers.piece(key)` and `handlers.point(k)` each return a move or null. With `handlers.stroke`, pressing on a cell and sliding through others collects the cells whose middles the finger crossed; `handlers.preview(cells)` says `'ok'` or `'blocked'` while sliding, and `handlers.stroke(cells)` returns the move on release. A slide that never leaves its first cell is a tap. `cellAt(g, x, y, core)` finds the cell under a drawing position.

## Building on it

- **The Week 1 encore** (red trapezoids, the two-player placement game, fewest-piece fills). These belong in Rhombus gardens as new groups: `placements(g, 'trapezoid')` gives the places, `lozenge.js` exact covers work for any shape, and the game needs only a move that places a rhombus for each side.
- **Week 16 (Sperner's lemma).** Colour grid points instead of laying pieces: draw every point with `point(k)` as a control, show colours with point classes, and mark finished triangles with `cell(i).cls`. `around` gives the cells round a point and `corners` the points of a cell, which is all the lemma's count needs.
- **Week 14 (triangulations).** Not on this grid, but the same questions about flip maps. `flipDistances` in `families/rhombus/lozenge.js` shows the pattern: hold each state compactly, search the flip map once per start, and keep the distances.
- **Other boards.** The hexagon with sides a, b, c is `hexagon(a, b, c)` in `families/rhombus/rhombus.js`; copy it rather than import it, so a new family does not depend on another family's module.
