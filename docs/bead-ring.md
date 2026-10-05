# The shared bead ring

`dist/bead-ring.js` and `dist/bead-ring.css` do the arithmetic of turning and flipping a ring of beads and draw the ring, a see-through copy of it, and small ring cards. They never know a family's rules. Bead rings ([beads](beads/README.md), Weeks 33 and 34) is the first user: its necklace puzzles and its Hidden turns group both sit on this one board. Any later theme about rings, cycles or symmetries of a polygon can use it too.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## A ring

A ring is a string with one letter per bead: `A`, `B` or `C` (drawn green, gold and blue), or `.` for an unpainted bead. Bead 0 is at the top and beads run clockwise. Families store moves and saves by bead index and letter, never by drawn position.

| Function | Meaning |
|---|---|
| `turn(word, k)` | Moves every bead k places clockwise (bead i goes to i + k) |
| `flip(word, k)` | Turns the ring over about the mirror line that sends bead i to k − i. Even k: the line through bead k/2; odd k: between two beads |
| `motions(n)` | The 2n − 1 motions other than staying still: n − 1 turns and n flips |
| `apply(word, m)` | One motion `{kind: 'turn' \| 'flip', k}` |
| `hiddenMotions(word)` | The motions that carry the ring onto itself; `matchingFlips` counts the flips among them |
| `lopsided(word)` | A full ring that no motion matches (a distinguishing colouring) |
| `period(word)` | The fewest turns that bring the ring back; it divides n |
| `necklace(word)`, `bracelet(word)` | The least readout up to turns, and up to turns and flips; `ringKey(word, flips)` picks one |
| `motionBetween(from, to, flips)` | A motion carrying one ring onto another (turns first), or null |
| `ringClasses(n, colours, test, flips)` | One key for each ring that passes `test`, up to turns (and flips) |
| `clashes(word)`, `windows(word, k)` | Neighbours of one colour (the closing pair counts), and every window of k beads read clockwise |
| `tally`, `coloursUsed`, `complete`, `validWord`, `blank`, `allWords` | Small helpers for counts, checks and brute force |

## The copy

The copy is a see-through ring over the board, like tracing paper. Its position is `{flips, turns}`, starting at `HOME`. `turnCopy(pos, steps)` turns it clockwise as the child sees it, which after an odd number of flips is the opposite direction on the ring; `flipCopy(pos)` turns it over. `copyMotion(n, pos)` is the motion it shows, `copyWord(word, pos)` what it carries, `copyTarget(n, pos, i)` where bead i's copy lands, and `copyAtHome(n, pos)` says it is back where it started. Every position is one of the 2n motions, and the unit tests check this.

The copy's position is view state. A family keeps it with its `ui` and `reset` hooks ([Adding a family](ADDING-A-FAMILY.md)), outside the save, so painting a bead never moves the copy.

## Drawing

`ringBoard(word, opts)` returns one `<div class="br-ring">`:

```js
ringBoard(word, {
  bead: i => ({move, label, cls}), // a bead with a move is a button (data-action="expansion-move")
  copy: pos,                       // the copy's position, or null for no copy
  arcs: [[i, 'clash']],            // mark the string between beads i and i + 1
  clockwise: true,                 // draw the reading direction
  label: 'Ring of 6 beads',        // the ring's accessible name
  cls: 'extra classes'
});
```

- Bead buttons carry `data-focus="br-bead-i"`, so focus survives a re-render, and `data-bead`.
- With a copy away from home, each bead whose copy lands on its own colour gets `match`, and a full ring that matches everywhere gets `br-all`. The CSS shows these only once the ring is `settled`, so marks don't flash before the copy lands. A copy at home is hidden.
- `miniRing(word, {label, cls})` draws a small ring card as an svg; `beadStrip(word)` draws a row of beads for a window.

## Motion

Call these from a family's `wire` hook:

- `animateCopy(root, n, before, after)` slides or flips the copy from its last position to its new one, then marks the ring `settled`. A copy coming home stays in sight until it lands, then fades.
- `showMatch(card, n, motion)` turns a ring card's beads by a motion, to show how a ring the child just made is the same as one already kept.

Both do nothing under `prefers-reduced-motion`.

## Styles

A family's stylesheet starts with `@import url('../../bead-ring.css');` and scopes its own rules under its own classes. Colours are the classes `br-c-A`, `br-c-B`, `br-c-C` and `br-c-empty`, each setting `--fill` and `--edge`, so a family can restyle a colour in one place. The base look follows `dist/boards.css`: Georgia labels, ochre for hints and focus, red dashes for clashes.

## Tests

`tests/bead-ring.test.mjs` checks turns, flips, periods, hidden motions, rings up to symmetry, the copy's positions and the drawing. Each family tests its own rules, and `node scripts/families-browser-smoke.mjs` opens every puzzle and solves it through hints.
