# The shared graph board

`dist/graph-board.js` and `dist/graph-board.css` draw a map of places joined by links or one-way arrows, make each place and link a control, and pass taps, keys and finger slides back to the family as moves. They never know a family's rules. Routes and roadblocks ([flow](flow/README.md), Week 13) and Cheapest networks ([mst](mst/README.md), Week 53) use it. The plan's other graph themes can build on the same board: path reduction (39), bracing frames (52) and scheduling as colouring (62). See [the plan](plan/README.md), Wave 2.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## A map

A family describes its map in the puzzle's `parameters` and turns it into a graph with `graphOf`:

```js
import {graphOf, graphBoard, wireGraph} from '../../graph-board.js';

const g = graphOf({
  nodes: {s: [7, 50], A: [50, 14], B: [50, 86], t: [93, 50]}, // [x, y] as % of the board box
  edges: [['s', 'A'], ['A', 't'], ['s', 'B', 3], ['B', 't', 2]], // [u, v] or [u, v, weight]
  aspect: 1.7,      // width / height; default 1.4
  directed: true,   // draw every edge as an arrow from u to v
  scale: .85        // shrink dots, arrowheads and tags on a crowded map; default 1
});
```

- Positions are percentages of the board's width and height, as in Chip firing, so a map is easy to author by eye. The board is 100 units wide and `100 / aspect` high.
- Edge `i` is the `i`th entry of `edges`. Families store moves and saves by edge index and node id, never by drawn position, so a map can be redrawn without breaking saves.
- `graphOf` caches by its spec, so calling it in every render costs nothing.
- `validGraphSpec(spec)` checks a spec's shape (positions are number pairs, edges join known nodes, no edge joins a node to itself). A family's `valid` hook still checks its own board.

The result is `{ids, index, pos, edges: [{i, u, v, w}], directed, aspect, height, k}`.

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
- `edgeGeometry(g, e)` gives an edge's ends (pulled back from the dots), midpoint, direction, normal and length, for families that draw their own marks.
- `NODE_R` is the dot radius before `scale`.

Link hit areas are 30 pixels wide whatever the board's size, so a link is easy to tap on a phone. `slide: true` turns off touch scrolling on the whole board (`touch-action: none`), so a finger sliding from dot to dot draws instead of scrolling the page. Browsers ignore `touch-action` on shapes inside an svg, so it cannot be limited to the dots; pass `slide` only while sliding means something (flow passes it in the Routes tool, not the Roadblocks tool).

## Taps, keys and slides

```js
wire(root, p, api) {
  wireGraph(root, {
    node: id => /* an action or null */,
    edge: i => /* an action or null */,
    stroke: true   // optional: a press on a dot followed by a slide across others
  }, api.apply);
}
```

- A tap, Enter or Space on a control calls `node(id)` or `edge(i)`; a non-null result goes to `api.apply` as a move.
- With `stroke: true`, pressing a dot and sliding sends `node(id)` for the pressed dot and then for each dot entered, one move at a time, so Undo takes a slide back step by step. The click that ends a slide is ignored. Handlers are re-read on every render, so a slide keeps working while the board redraws under the finger.
- The board has no modes of its own. A family with tools keeps the chosen tool in view state (`ui` and `reset` hooks, see [Adding a family](ADDING-A-FAMILY.md)) and reads it in its handlers, as flow does with Routes and Roadblocks.

## Styles

A family's stylesheet starts with `@import url('../../graph-board.css');` and scopes its own rules under its board class (`.flow-map .gb-stroke.r1 {…}`), so the base rules never override it. The base look follows `dist/boards.css`: paper dots with ink outlines, sage links, Georgia labels, ochre for hints and focus, red for bars.

## What the Wave 2 themes need from it

What exists now covers each theme's core move. The notes are proposals, not decisions.

| Week | Theme | Board use | Notes |
|---|---|---|---|
| 13 | Route packing | Arrows; tap or slide along dots to draw routes; tap arrows to close them | Done (flow) |
| 53 | Cheapest networks | Undirected links with `tag` prices; tap a link to buy or return it; `cls` tints places by group; `strokes` show bought links, loops and a cheaper swap; tapping places makes a split; `graphMini` draws found networks | Done ([mst](mst/README.md)) |
| 39 | Path reduction | Lay steps by tapping links or sliding along dots; the step word shows beside the board; tap a back-and-forth pair to cancel it | Two rings drawn as one place with two loops would need self-loop edges, which the board rejects now. Drawing each ring as a cycle of dots needs no change |
| 52 | Bracing frames | The hinged grid is not a node-link map, but its row-column graph is: rows and columns as dots, a brace as a link. The grid itself would be the family's own drawing in `under` | The board's part is the row-column graph shown beside the grid, lit when connected |
| 62 | Scheduling as colouring | Dots coloured by `cls`, tapped to cycle a slot; links between clashing neighbours marked with `bar` or a stroke | Wave 1 is adding it as a group in Neighbor Lanterns, which has its own board; moving onto this board is optional |

Known limits, each addable without breaking existing maps: two arrows between the same pair of dots in opposite directions draw on top of each other (a per-edge `bend` would curve them); there are no self-loops; there is no dragging of dots, because no family needs to move a map and the plan rules out make-a-puzzle editors until that is decided.

## Tests

`tests/graph-board.test.mjs` checks positions, edge geometry, which controls are marked, tags, bars, strokes and arrowheads. Each family tests its own rules, and `node scripts/families-browser-smoke.mjs` opens every puzzle and solves it through hints. `node scripts/flow-browser-smoke.mjs` plays flow through real taps, keys, mouse drags and (with `TEST_PHONE=1`) touch slides; a new family on the board should copy its `tap` and `slide` helpers, which tap at a control's centre because a straight vertical or horizontal link has a zero-width box that Playwright treats as hidden.
