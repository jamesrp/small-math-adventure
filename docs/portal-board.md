# The shared portal board

`dist/portal-board.js` and `dist/portal-board.css` handle surfaces made of unit squares glued edge to edge by translations: a torus, a cylinder, or a few squares glued in an unusual way. The board draws a surface in two views and passes taps, keys and finger slides back to the family as moves:

- **The portal room** shows the squares where the family lays them out. Matching marks show which edges are glued together.
- **The unrolled view** lays copies of the squares out in the plane, so a trip that crosses a seam goes straight on.

The module computes exact lattice positions, steps, lifts and straight shots of any rational slope using only integer and rational arithmetic. It never knows a family's rules.

[Portal rooms](portals/README.md) (Week 41) is the first family to use it. Straight paths on strange surfaces (Week 64), Portal shields (Week 70) and Twists on a cylinder (Week 75) are meant to build on it; see [the plan](plan/decisions.md), Wave 4.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## Surfaces are data

A family describes its surface in the puzzle's `parameters` and turns it into a surface with `surfaceOf`:

```js
import {surfaceOf} from '../../portal-board.js';

const S = surfaceOf({
  squares: {A: [0, 2], B: [1, 2], /* … */ I: [2, 0]}, // where each square is drawn in the room: [column, row], row 0 at the bottom
  right: {A: 'B', B: 'C', C: 'A', /* … */},             // the square across each square's right side (null or missing: a wall)
  up: {A: 'F', D: 'A', /* … */},                        // the square across its top side
  n: 1,                                                 // lattice steps along a square's side (default 1)
  lattice: 'cells'                                      // 'cells' (centres of the n × n small cells, the default) or 'crosses'
});
```

- The only gluing is by translation. A square's left and down neighbours follow from `right` and `up`, so a square is never turned over or rotated. `validSurfaceSpec(spec)` checks the shape of a spec: no two squares drawn in one place, and no two squares glued to the same side of a third.
- `surfaceOf` caches by spec, so calling it in every render costs nothing. The result is `{spec, ids, at, right, up, left, down, glue, n, lattice, box, edges, marks, abelian}`.
- `edges` lists each side of each square as `inner` (glued to the square drawn beside it), `wall` (glued to nothing) or `seam` (glued to a square drawn somewhere else).
- `marks` pairs each run of seam edges with its partner run. A run is consecutive seam edges along one drawn line whose partners lie along one drawn line in the same order. Each pair of runs gets one shape and colour. The shape is drawn halfway along both runs (`along`, in square widths), and every seam edge of the pair takes the colour (`edge.colour`), so matching marks show the translation. There are six shapes and four colours.
- `abelian` is true when going right then up always reaches the same square as going up then right. The torus and the cylinder have this property; Week 64's glued squares do not.

### Worked examples

**Week 41, a 3 × 3 torus.** Nine squares, each glued to its neighbour in the next row or column, wrapping round. `roomFromRows` in the family module builds this spec from rows of letters:

```js
roomFromRows(['ABC', 'DHE', 'FGI'])
// {squares: {A: [0, 2], B: [1, 2], C: [2, 2], D: [0, 1], H: [1, 1], E: [2, 1], F: [0, 0], G: [1, 0], I: [2, 0]},
//  right: {A: 'B', B: 'C', C: 'A', D: 'H', H: 'E', E: 'D', F: 'G', G: 'I', I: 'F'},
//  up:    {A: 'F', B: 'G', C: 'I', D: 'A', H: 'B', E: 'C', F: 'D', G: 'H', I: 'E'}}
```

The room has two runs of seams: the right column against the left column, and the top row against the bottom row. In the unrolled view the room repeats on every square of the lattice 3ℤ × 3ℤ.

**Week 75, a cylinder.** The same, with `wrapY: false`: the top and bottom edges are walls. Here, for example, the cylinder is two squares round and three tall, and `n: 2` with `lattice: 'crosses'` puts strand ends on a finer lattice:

```js
{...roomFromRows(['ab', 'cd', 'ef'], {wrapY: false}), n: 2, lattice: 'crosses'}
```

In the unrolled view, `develop` fills a single horizontal strip, with walls along its top and bottom. A strand's lift crosses the seam every time its `X` changes by a whole room. `lift(...).endCopy[0] / width` is the strand's winding number.

**Week 64, three squares glued in an L.** Square `A` at the corner, `B` to its right, `C` above it. This is the worksheet's printed gluing, where right swaps A and B and up swaps A and C (Week 64 pp. 6–9; the review's `week-64-math.md`):

```js
{squares: {A: [0, 0], B: [1, 0], C: [0, 1]},
 right: {A: 'B', B: 'A', C: 'C'},
 up:    {A: 'C', C: 'A', B: 'B'}}
```

Here the corners do not all close up: going right then up from `A` reaches `B`, but going up then right reaches `C`. `abelian` is false. All twelve corners meet at one cone point.

**Week 70, one square glued to itself.** A single square, its right side glued to its left and its top to its bottom, with shields and shots on the crosses of a 4 × 4 lattice. This is the worksheet's room ℝ²/(4ℤ)², with S at (0, 0), T at (2, 2) and the four shields at the halfway points (1, 1), (1, 3), (3, 1) and (3, 3), all of them crosses:

```js
{squares: {o: [0, 0]}, right: {o: 'o'}, up: {o: 'o'}, n: 4, lattice: 'crosses'}
```

Each pair of opposite sides is its own run, so the room shows two pairs of marks on one square.

## Lattice points and exact positions

A lattice point is `{s, i, j}`: square `s`, with integer lattice coordinates inside it.

- On `cells`, `0 ≤ i, j < n`, and the point is the centre of a small cell, at (i + ½, j + ½).
- On `crosses`, `0 ≤ i, j ≤ n`. A cross on a glued edge is stored in the square to its right or above, so `i = n` or `j = n` only happens beside a wall.
- `canonical(S, pt)` puts a point into this form. `validPoint(S, pt)` checks that a point is already in it.

A **placed** point also has `X, Y`: the plane square it lies in. The room itself is drawn at copy (0, 0), so `copyOf(S, s, X, Y)` is the offset from where the room draws square `s`. On a W × H torus this offset is a multiple of (W, H). `planeKey(S, pt)` gives the point's integer plane coordinates `[X·n + i, Y·n + j]`, and the unrolled view addresses points by them. `place(S, pt, copy)` places a point in a copy.

Positions are rationals: `[numerator, denominator]` pairs in lowest terms with a positive denominator, or plain integers. `Q(n, d)`, `Q.add`, `Q.sub`, `Q.mul`, `Q.div`, `Q.cmp`, `Q.eq`, `Q.lt`, `Q.le`, `Q.min`, `Q.floor`, `Q.isInt` and `Q.valid` do all of the arithmetic exactly. `spot(S, pt)` is a lattice point's position inside its square.

## Steps and lifts

`step(S, placed, [dx, dy])` takes one lattice step, crossing a seam where there is one, or returns null at a wall. `stepsOf('RRU')` and `wordOf(steps)` convert between words and unit steps (y counts up).

`lift(S, start, steps, copy)` unrolls a trip step by step:

```js
lift(S, {s: 'H', i: 0, j: 0}, stepsOf('RRRUUU'))
// {points: [placed points], end, endCopy: [3, 3], copies: [[0, 0], [3, 0], [3, 3]], blocked: -1}
```

`copies` lists the copies the trip visits, in order. `endCopy` is the copy it finishes in. `blocked` is the index of the first step that runs into a wall; the lift stops there.

**How a surface that isn't a torus unrolls.** The lift never consults a fixed tiling. Each step moves from the current square to the square glued on that side, and `X` or `Y` changes by one whenever a step crosses a side. So on Week 64's L, the lift builds the plane square by square along the trip. The same plane position can hold different squares on different trips; the lift is still exact. The unrolled view fills the rest of its window by `develop`: starting from the squares the trip visited (in order), it spreads across glued edges, nearest first. On a torus or a cylinder this gives the one periodic tiling. On the L, two spreads can meet with different squares. The first square placed wins, and the edge between them is a **cut**, drawn like a seam in rose. For a cylinder, `develop` stops at the walls, so the view is a strip.

## Straight shots

`shoot(S, from, [a, b], opts)` traces a straight line of slope b/a from a point (a lattice point, or `{s, x, y}` with rational x, y), through the seams. Options:

- `length`: how many direction vectors to travel, as a rational.
- `targets`: points where the shot stops at the first one it reaches after leaving its start. A target on a glued edge or corner is found from every square that holds it.
- `corners: 'stop'`: stop at any square corner. A shot always stops at a cone point, a corner where the squares round it don't close up (as on the L).
- `limit`: the most squares to cross (default 200).

It returns `{pieces: [{s, X, Y, a: [x, y], b: [x, y]}], end, stop, target, t}`. Each piece lies in one square, in that square's own rational coordinates, so the same pieces draw the shot in the room (`roomXY`) and in the plane (`planeXY` with the piece's `X, Y`). `stop` is `'length'`, `'wall'`, `'corner'`, `'target'` or `'limit'`. `t` is the length travelled. A shot that ends exactly on a side reports its end in the square it came through.

## Trips as words, and their local moves

`tripMove(steps, k)` names the move at the vertex between steps k − 1 and k:

- `'cancel'`: the two steps go straight back along each other; erase both.
- `'slide'`: the two steps are not parallel; swap them, which moves the path across the parallelogram the two steps span.
- `null`: neither.

`tripApply(steps, k)` makes the move, and `tripMoves(steps)` lists every possible move. Neither kind of move changes the ends of the trip, so the lift's end stays where it is. Week 41 shrinks loops this way, and Week 75 can untwist strands this way.

## Drawing

Both views return one `<svg class="pb-board">`. They use lattice units with y up; the SVG flips y.

```js
roomBoard(S, {
  cls, label,                 // extra classes and the accessible name
  point: pt => ({cls, text, textCls, label, act}), // each lattice point; act makes it a button named label
  under, over, top,           // SVG drawn below the points, above them, and above the controls
  slide: true,                // a finger slides from point to point
  picture: true,              // a small picture with no controls (a room button)
  markSize, pad
});
planeBoard(S, {
  cls, label, key,            // key names the view, so a slide can hold its window
  show: [[u, v], …], focus: [u, v], margin, min, max, // what the window must hold (planeWindow)
  anchors: [{s, X, Y}, …],    // squares to place first (a trip's lift), default the room at copy (0, 0)
  point: pt => ({…}),         // pt also has u, v (its plane key) and copy
  square: (s, X, Y, copy) => 'class', // shade a copy
  under, over, top, marks: true, markSize, slide // marks: repeat the seam marks faintly on every copy
});
```

- In the room, seam edges are dashed in their run's colour, and each run carries its mark just outside its middle, clear of trails and labels. Walls are thick ink.
- In the unrolled view, copy outlines are dashed in the colour of the seam they cross, and cuts and walls are drawn. A surface with walls is cropped to the squares placed, so a cylinder shows a strip.
- A cross on a seam appears on both sides of the room, each with its own control; `roomSpots` lists every place it is drawn.
- `planeWindow` picks a square window that holds everything in `show` and the focus with a margin. The window is at least `min` squares across and at most `max`. If everything doesn't fit within `max`, the window centres on the focus. So the view recentres and grows as a trip goes on. While a finger slides on the plane, the window stays where it was, so the square under the finger doesn't move. When the slide ends, the family redraws the view.
- `planeTrail` draws a trip as one line in the plane. `roomTrail` draws it in the room, broken at the seams, with a small dot where it leaves and comes back in.
- `tripLayer(S, start, steps, {vertex})` draws a trip with a chevron on each step, and a control at each vertex where `tripMove` allows a move. Each control sits a little inside the square its slide would cross.
- `arrowPad({dir})` draws four arrow buttons in a cross.

## Wiring

```js
wirePortal(root, {
  point: (view, at) => move,       // a tap, Enter or Space on a point: view 'room' (at "s,i,j") or 'plane' (at "u,v")
  vertex: k => move,               // a tap on a trip vertex
  dir: name => move,               // an arrow button, or an arrow key anywhere in root ('R', 'U', 'L', 'D')
  enter: (view, from, to) => move, // a finger sliding from one point into the next, on a view drawn with slide
  settle: () => {}                 // a slide ended: redraw the plane at its new size
}, api.apply);
```

Taps on points and vertices are read from the pointer's press and release, because a phone browser can drop the click after a touch. The click that follows is ignored, and a click with no press before it (from assistive technology) still works. Arrow buttons answer their own clicks. Every acting point and vertex is a focusable button with an accessible name, and every view and the pad have group names.

## What Weeks 64, 70 and 75 will use

- **Week 64, straight paths on strange surfaces.** The family authors glued squares as specs, like the L above; a "glue the squares" puzzle can let the child choose each `right` and `up`. It needs `shoot` with `targets: [start]` to follow a sloped trip until it returns (or meets a cone corner), the pieces to draw that trip in both views, `lift` and `develop` with cuts for the unrolled view, and `abelian` to tell a torus from a surface with a cone point.
- **Week 70, portal shields.** The one-square torus above, so S, T and the halfway points are all crosses. Shields are taps on points (`point`). A shot from S toward a copy of T is `shoot` with T and the shields as `targets`, and its pieces draw it in both views. The app can search directions [a, b] for a shot that escapes the shields, and draw the four corner-to-centre shots, which share no point, to show that four shields are the fewest.
- **Week 75, twists on a cylinder.** The cylinder spec above, on a fine lattice. Strands are words drawn with `roomTrail` and `planeTrail`; a strand's winding number is its lift's `endCopy[0]` divided by the width. A twist is a change of the gluing offset, or a lap added to a word, and untangling uses `tripMoves`. The strip in the unrolled view is `develop` stopped by walls.

## Limits

- Gluing is by translation only: no flips (a Klein bottle) and no rotations (a cube's net). Supporting those would mean storing a rotation with each glued side.
- A step changes a lattice coordinate by at most one square's width. Longer moves are several steps.
- `develop` resolves a conflict on a non-abelian surface by placing the first square it reaches, so the unrolled view of the L depends on the anchors it is given. Pass the trip's lift as anchors, so the trip itself is always drawn faithfully.
- Only one finger slide is followed at a time.
