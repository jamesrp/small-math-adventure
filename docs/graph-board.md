# The shared graph board

`dist/graph-board.js` and `dist/graph-board.css` draw a map of places joined by links or one-way arrows, make each place and link a control, and pass taps, keys and finger slides back to the family as moves. They never know a family's rules. Routes and roadblocks ([flow](flow/README.md), Week 13), Cheapest networks ([mst](mst/README.md), Week 53), Road detours ([detours](detours/README.md), Week 39), Bracing frames ([braces](braces/README.md), Week 52) and Bridge Courier's Islands group ([islands](islands/README.md), Week 10) use it. Scheduling as colouring (62) can build on the same board. See [the plan](plan/README.md), Wave 2.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## A map

A family describes its map in the puzzle's `parameters` and turns it into a graph with `graphOf`:

```js
import {graphOf, graphBoard, wireGraph} from '../../graph-board.js';

const g = graphOf({
  nodes: {s: [7, 50], A: [50, 14], B: [50, 86], t: [93, 50]}, // [x, y] as % of the board box
  edges: [['s', 'A'], ['A', 't'], ['s', 'B', 3], ['B', 't', 2]], // [u, v], [u, v, weight] or [u, v, weight, bend]
  aspect: 1.7,      // width / height; default 1.4
  directed: true,   // draw every edge as an arrow from u to v
  scale: .85        // shrink dots, arrowheads and tags on a crowded map; default 1
});
```

- Positions are percentages of the board's width and height, as in Chip firing, so a map is easy to author by eye. The board is 100 units wide and `100 / aspect` high.
- Edge `i` is the `i`th entry of `edges`. Families store moves and saves by edge index and node id, never by drawn position, so a map can be redrawn without breaking saves.
- `graphOf` caches by its spec, so calling it in every render costs nothing.
- `validGraphSpec(spec)` checks a spec's shape (positions are number pairs, edges join known nodes, no edge joins a node to itself, a bend is a number). A family's `valid` hook still checks its own board.
- A fourth entry `bend` (board units; `null` weight for none) draws the edge as a quadratic curve whose control point sits `bend` from the straight edge's middle along its normal. The normal points to the right of the direction from `u` to `v` as seen on screen (`[A, B, null, 12]` with A left of B bulges downward), so `[u, v, null, b]` and `[v, u, null, -b]` are the same curve. Two or three edges between one pair, at bends such as `14`, `0` and `-14`, draw as separate roads; Islands draws Königsberg's double bridges this way. A bend of `0` or none is a straight edge, drawn exactly as before.

The result is `{ids, index, pos, edges: [{i, u, v, w, bend?}], directed, aspect, height, k}`.

## Drawing

`graphBoard(g, opts)` returns one `<svg class="gb-board">`. The family says how each node and edge looks, and which ones are controls:

```js
graphBoard(g, {
  cls: 'mst-map',                       // extra classes on the svg, for the family's own CSS
  label: 'Map of places and links',     // the svg's accessible name
  node: id => ({cls, text, label, badge, act}),
  edge: i => ({cls, label, act, tag, bar, strokes}),
  under: '<svg markup below the links>',
  over: '<svg markup above the links, below the dots>',
  slide: true                           // a finger slides from dot to dot here
});
```

| Field | Meaning |
|---|---|
| `act` | `true` makes the node or edge a control: `role="button"`, focusable, with `label` as its accessible name and `data-focus` so focus survives a re-render. Otherwise a node is `role="img"` and an edge is a picture |
| `cls` | Classes on the node's or edge's group (`picked`, `lit`, `shut`, `hinted` and so on). The base CSS styles `hinted` |
| `text` | A node's label inside the dot (HTML-escaped by the family if needed); defaults to the id |
| `badge` | A small dark circle at the dot's upper right, for a count |
| `tag` | A price or weight drawn on the link's midpoint, in a small card |
| `bar` | A mark across the link's midpoint (a roadblock, a cut) |
| `strokes` | Extra classes, each drawn as a thick line over the link (a route's colour, a chosen link, a loop) |

Helpers for the `under` and `over` layers:

- `pathThrough(g, nodes, cls)` draws a polyline through node centres (a leak, a loop, a path being reduced).
- `graphMini(g, {label, edge, cls})` draws a small picture of the map, every link thin and the links `edge(i)` gives a class (such as `on`) drawn over them, for a row of answers already found. It is a picture (`role="img"`), never a control.
- `edgeGeometry(g, e)` gives an edge's ends (pulled back from the dots), midpoint, direction, normal and length, for families that draw their own marks. For a curved edge it also gives the control point `c` and `bend`; `m` is then the curve's midpoint, `d` the chord's direction (also the curve's direction at `m`, where `tag` and `bar` sit), and a point at `t` along it is `(1-t)²a + 2t(1-t)c + t²b`.
- `NODE_R` is the dot radius before `scale`.

Link hit areas are 44 pixels wide whatever the board's size, so a link is easy to tap on a phone (see Tap sizes below). `slide: true` turns off touch scrolling on the whole board (`touch-action: none`), so a finger sliding from dot to dot draws instead of scrolling the page. Browsers ignore `touch-action` on shapes inside an svg, so it cannot be limited to the dots; pass `slide` only while sliding means something (flow passes it in the Routes tool, not the Roadblocks tool).

## Taps, keys and slides

```js
wire(root, p, api) {
  wireGraph(root, {
    node: id => /* an action or null */,
    edge: i => /* an action or null */,
    stroke: true,  // optional: a press on a dot followed by a slide across others
    nearest: false // optional: turn off sending an overlapped tap to the nearest link
  }, api.apply);
}
```

- A tap, Enter or Space on a control calls `node(id)` or `edge(i)`; a non-null result goes to `api.apply` as a move.
- With `stroke: true`, pressing a dot and sliding sends `node(id)` for the pressed dot and then for each dot entered, one move at a time, so Undo takes a slide back step by step. The click that ends a slide is ignored. Handlers are re-read on every render, so a slide keeps working while the board redraws under the finger.
- A pointer tap on a link checks every link hit area under the finger and goes to the one whose drawn road is nearest, rather than the one drawn last (on by default; `nearest: false` turns it off). The fitted hit areas (below) already split most overlaps; this covers the rest. Keyboard Enter and Space still act on the focused link. A family that lets roads cross over others should also set `pointer-events: none` on its `.gb-line` and `.gb-stroke`, as Islands does, so a road drawn on top never swallows a tap meant for the hit area beneath.
- The board has no modes of its own. A family with tools keeps the chosen tool in view state (`ui` and `reset` hooks, see [Adding a family](ADDING-A-FAMILY.md)) and reads it in its handlers, as flow does with Routes and Roadblocks.

## Tap sizes

The board draws in board units, so on a phone its dots and links shrink with it. `wireGraph` calls `fitGraph(board)`, which uses `dist/hit-fit.js` (shared with the square, triangle and portal boards) to measure the board's rendered scale after each render and whenever the board changes size, and to size the hit areas in screen pixels without changing what is drawn:

- Each tappable dot gets a transparent hit shape (`path.hit-tap`, first child of the `.gb-node`) at least 44 px across where there is room; its old `.gb-reach` circle stops taking taps. Two dots meet halfway; a dot never reaches past a road passing by more than halfway to it, nor past another control on the board, and never shrinks below the reach it had because of one.
- Link hit strokes are 44 px wide. Where two overlap, each is clipped (a `clip-path` in `defs.hit-clips`) to the band where its road is the nearest, so two roads from one dot meet on the line halfway between them and two curves between the same islands meet halfway across.
- A short road between two dots keeps the middle of its length: the dots give up their reach toward it, down to their drawn marks if needed. A dot that would be left under 40 px across along the road may take back up to a quarter of the road showing between the two marks; the road keeps the middle half.
- Labels inside dots drawn under 12 px grow to 12 px, up to 1.25 times the dot's radius.
- A dot's focus ring and hints stay on its drawn marks; keyboard focus and screen-reader names are unchanged.

Where the dots are closer than a tap (two dots 39 px apart, or a switch and an exit 48 px apart with a road between), the hit areas split the room and stay under 44 px; the board would have to be drawn larger.

## Styles

A family's stylesheet starts with `@import url('../../graph-board.css');` and scopes its own rules under its board class (`.flow-map .gb-stroke.r1 {…}`), so the base rules never override it. The base look follows `dist/boards.css`: paper dots with ink outlines, sage links, Georgia labels, ochre for hints and focus, red for bars.

## What the Wave 2 themes need from it

What exists now covers each theme's core move. The notes are proposals, not decisions.

| Week | Theme | Board use | Notes |
|---|---|---|---|
| 13 | Route packing | Arrows; tap or slide along dots to draw routes; tap arrows to close them | Done (flow) |
| 53 | Cheapest networks | Undirected links with `tag` prices; tap a link to buy or return it; `cls` tints places by group; `strokes` show bought links, loops and a cheaper swap; tapping places makes a split; `graphMini` draws found networks | Done ([mst](mst/README.md)) |
| 39 | Path reduction | Each ring is a cycle of dots (two rings share H), so no self-loops are needed. Tap a dot or link next to the pawn, or slide, to step; `strokes` mark roads used one way or both; the trip row below the board is the family's own; tap a turning point there to cancel | Done ([detours](detours/README.md)) |
| 52 | Bracing frames | The hinged grid is the family's own SVG; the board draws only the row-column graph beside it, not interactive, with `cls` tinting dots and links by piece. Links and tints show after a push | Done ([braces](braces/README.md)) |
| 62 | Scheduling as colouring | Dots coloured by `cls`, tapped to cycle a slot; links between clashing neighbours marked with `bar` or a stroke | Wave 1 is adding it as a group in Neighbor Lanterns, which has its own board; moving onto this board is optional |

Known limits, each addable without breaking existing maps: two arrows between the same pair of dots in opposite directions draw on top of each other unless the family gives them a `bend`; a curve is one quadratic, so it can bend around a dot but not loop round a square, and a long bend may cross another road (Islands moves a road's counter off such a crossing); there are no self-loops; there is no dragging of dots, because no family needs to move a map and the plan rules out make-a-puzzle editors until that is decided.

## Tests

`tests/graph-board.test.mjs` checks positions, edge geometry (straight and curved), which controls are marked, tags, bars, strokes and arrowheads. `node scripts/islands-browser-smoke.mjs` taps curved roads at points along them and at contested points inside two roads' 44 px strokes, and checks that the nearer road takes each one. `node scripts/board-taps-browser-smoke.mjs` measures fitted hit sizes on a phone across the shared boards. Each family tests its own rules, and `node scripts/families-browser-smoke.mjs` opens every puzzle and solves it through hints. `node scripts/flow-browser-smoke.mjs` plays flow through real taps, keys, mouse drags and (with `TEST_PHONE=1`) touch slides; a new family on the board should copy its `tap` and `slide` helpers, which tap at a control's centre because a straight vertical or horizontal link has a zero-width box that Playwright treats as hidden.
