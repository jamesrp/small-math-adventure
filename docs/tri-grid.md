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

Every control is focusable and answers Enter and Space. Styles live in `tri-grid.css`; a family's stylesheet imports it and colours pieces with its own classes (`rh-face f0` and so on in Rhombus gardens). Every family that uses the grid imports it, so its base rules can load again after an earlier family's rules: scope each family rule under the family's root (`.rh-puzzle .rh-mini`), never a bare class that a base rule also styles.

## Wiring

`wireTri(root, g, handlers, apply)` turns taps into moves: `handlers.cell(i)`, `handlers.piece(key)` and `handlers.point(k)` each return a move or null. With `handlers.stroke`, pressing on a cell and sliding through others collects the cells whose middles the finger crossed; `handlers.preview(cells)` says `'ok'` or `'blocked'` while sliding, and `handlers.stroke(cells)` returns the move on release. A slide that never leaves its first cell is a tap. Taps are read from the pointer's press and release rather than the click, because a phone browser can drop the click after a touch; the click that follows is ignored, and a click with no press before it (as assistive technology sends) still works. `cellAt(g, x, y, core)` finds the cell under a drawing position.

## Boards of any triangles

`dist/tri-mesh.js` draws boards whose triangles are not all the same: a big triangle cut into little ones of any shapes (Week 16's fan). A family gives points in triangle-edge units (y up) and triangles as triples of point numbers:

```js
import {meshOf, meshBoard} from '../../tri-mesh.js';
import {wireTri} from '../../tri-grid.js';

const m = meshOf({points: [[0, 0], [1, 0], [.5, .866], [.5, .289]], cells: [[0, 1, 3], [1, 2, 3], [2, 0, 3]]});
meshBoard(m, {cell, point: k => ({cls, label, act, text}), edge: e => ({cls, label, act}), pipPx: 16});
wireTri(root, m, {point: k => move, edge: e => move, cell: i => move}, apply);
```

- `meshOf` turns every triangle counterclockwise and finds the edges (`[a, b]` with a < b), the one or two triangles beside each edge, which edges are on the outside (`outer`), each triangle's edges opposite its corners in order (`cellEdges`), neighbours, the triangles round each point (`around`), drawing positions and the shortest edge. `validMeshSpec` refuses flat triangles, repeated or missing corners and edges with three triangles.
- `meshBoard` draws inside edges as thin lines and the outline on top of them; `point(k)` may put a letter inside a point (`text`), and `edge(e)` makes an edge a control (`data-tg-edge`) with a wide invisible line to tap. `pipPx` keeps points about that radius on screen, so a small board shows its triangles rather than its dots; points shrink to fit the shortest edge either way. `pipRadius(m, opts)` gives that radius, for a mark that sits beside a point (Rainbow triangles' stars).
- Taps come through tri-grid's `wireTri`, which also answers `handlers.edge(e)`; strokes are for lattice boards only.

## Building on it

- **The Week 1 encore** is three more groups in Rhombus gardens ([blocks](blocks/README.md)): the rhombus duel, fewest blocks and red trapezoids. They lay all four pattern blocks with `placements`, and use `lozenge.js` exact covers for trapezoid fillings.
- **Week 16 (Sperner's lemma)** is [Rainbow triangles](rainbow/README.md). Its boards are meshes, so the fan (each triangle cut in three round a middle point) draws the same way as the plain boards; dots are points with letters, doors are edges, and walks start from outside edges.
- **Week 14 (triangulations)** is [Polygon cuts](cuts/README.md). It draws its polygon as its own SVG, since its lines change with every move, and uses only `wireTri` for taps on corners and lines.
- **Other boards.** The hexagon with sides a, b, c is `hexagon(a, b, c)` in `families/rhombus/rhombus.js`; copy it rather than import it, so a new family does not depend on another family's module.
