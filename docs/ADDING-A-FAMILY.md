# Adding a family

A new puzzle family, or a new group of puzzles inside an existing family, touches only its own files and one line in [`dist/families.js`](../dist/families.js). The app, the satchel, the offline copy, the build and the tests find everything else from that line. [Chip firing](chips/README.md) is the worked example: before the seam it touched ten shared files, and now it lives in `dist/families/chips/`.

## Before you start

1. **Claim the item** on [WORKBOARD.md](../WORKBOARD.md) and push the claim to `main` (see `AGENTS.md`).
2. **Read the theme's review card** in the worksheets repository under `plans/review/`. A theme is ported after its card.
3. **Design for doing, not predicting.** Ask what is interesting to do with the theme's mathematical object on a screen. Children have most enjoyed families where they click around to solve a puzzle; see [the plan](plan/README.md) and the copy and substance rules in `AGENTS.md`. Don't port the worksheet wholesale, and don't build a make-a-puzzle editor.

## What a port delivers

- **A spec** in `docs/<id>/README.md`: the object, the move, what counts as a solve, and a checkable certificate whenever the answer is "can't", "every" or "the most". Open with the mathematics, theorem first, then where the puzzles appear, how a puzzle plays, the files and the sources. Follow `docs/chips/README.md`.
- **8 to 12 puzzles** over Easy, Medium and Hard, each with a solution witness, a useful first hint, and the insight it is for. Add a **playground** where free play with the object is natural.
- **An independent validator**, `scripts/validate-<id>.mjs`, that recomputes every answer by a different method from the mechanic's own (an exhaustive search against a separate simulator, say), checks that hints alone reach a solve, and rejects illegal moves and forged saves.
- **Tests**, `tests/<id>.test.mjs`.
- **A browser run**: `node scripts/families-browser-smoke.mjs` passes, and a suite of the family's own when its board has gestures or keyboard controls worth checking.
- **A "Not yet done" list** in the spec, starting with three things testers should watch for.

## Files

| File | Contents |
|---|---|
| `dist/families/<id>/<id>.js` | The mechanic or mechanics, and the module entry (its default export) |
| `dist/families/<id>/<id>.css` | Styles, in the shared board look of `dist/boards.css` |
| `dist/families/<id>/<id>.json` | The pack: puzzles, sources and a family record |
| `scripts/build-<id>.mjs` | Optional: the authoring list that computes answers and writes the pack |
| `scripts/validate-<id>.mjs` | The validator; its default export runs it, and `npm run build` calls it |
| `tests/<id>.test.mjs` | Unit tests; `npm test` picks them up |
| `docs/<id>/README.md` | The spec and notes |
| `dist/families.js` | One line, `'./families/<id>/<id>.js'`, added at the end |

`<id>` is a short lowercase name such as `chips`. Start every puzzle id with `<id>-` (Proofs, which came first, uses `proof-`).

## The module entry

```js
export default {
  id: 'chips',
  family: {id: 'chips', symbol: '◉'},
  mechanics: chipMechanics,
  pack: new URL('./chips.json', import.meta.url).href,
  css: new URL('./chips.css', import.meta.url).href,
  focus: '.chip-node:not([aria-disabled]),.chip-again'
};
```

- `family` is the satchel family the module adds, with a one-character symbol. Leave it out when the module's puzzles join existing families.
- `mechanics` maps each mechanic id to its hooks. A mechanic id must be new; `tests/families.test.mjs` fails on a clash.
- `pack` and `css` are resolved from the module's own location, so they work in the browser and in Node.
- `focus` is optional: the control that takes focus when the focused one disappears after a move.

A module must not import anything that leads back to `families.js`: `engine.js`, `expansion.js`, `ui.js`, `storage.js`, `tile-controls.js` and the road and caravan modules all do. The registry would wait on itself, the page would stay blank, and Node would report only "unsettled top-level await". `expansion-controls.js`, the base mechanic modules and their clock helpers are safe, and `tests/family-imports.test.mjs` lists everything that is and names the import that breaks the rule. The tile-gesture helpers reach `wire` as `api.tile` instead.

## Mechanic hooks

Every mechanic has these:

| Hook | Returns |
|---|---|
| `fresh(p, random)` | The starting board |
| `valid(p, board)` | `true` only for a well-formed board; saves are checked with it |
| `solved(p, board)` | Whether the board is a solve |
| `move(p, board, action, random)` | The next board, or `null` for an illegal move |
| `hint(p, board)` | `{type: 'move', action, text}`, `{type: 'deadend', text}`, `{type: 'done'}`, or `{type: 'note'}` to show the authored hints by level and never an answer |
| `render(p, attempt, ctx)` | The board's HTML. Buttons with `data-action="expansion-move"` and a JSON `data-move` make moves; `data-action="mechanic-ui"` with `data-ui` changes view-only state |

These are optional:

| Hook | Use |
|---|---|
| `wire(root, p, api)` | Pointer and keyboard gestures on the element marked `data-mechanic-wire`; `api.apply(action)` makes a move, `api.ui(payload)` changes view state, `api.attempt()` reads the attempt and `api.tile` holds the tile-gesture helpers |
| `ui(p, payload)` and `reset(p)` | View-only state such as the chosen tool, kept outside the save |
| `carry(p, from, to)` | Lets Undo keep part of the board (Chip firing keeps its discoveries) |
| `noUndo(p)`, `noHint(p)` | Hide Undo or Hint |
| `help(p, attempt)` | Extra HTML for How to play |

## Puzzle fields

Copy the shape of a puzzle in `dist/families/chips/chips.json`: `id`, `number`, `title`, `mechanic`, `band`, `difficulty_level`, `revision`, `parameters`, `objective`, `instruction`, `controls`, `rules`, `idea`, `prerequisites`, `familyTitle`, `hints`, `parent` (`notice`, `prompt`, `explanation`, `extension`, `connection`, `sourceIds`) and `provenance`. Also:

- `band` is `all` for grade-free puzzles grouped by `difficulty_level` (`easy`, `medium`, `hard`), or `playground` for the playground, whose `parameters.mode` is `playground`.
- `objective` is the full goal for How to play and read-aloud. The play screen shows it as one line unless `visibleObjective` says otherwise: set `visibleObjective: ''` when the board already shows the goal, as the copy rules in `AGENTS.md` ask.
- `controls` is the How to play text for the controls.

## A group inside an existing family

Set `libraryFamily` to the existing family's id (`clock` for Clockwork Gates, `nim` for Pebble Duel, `code` for Signal Lanterns, `color` for Neighbor Lanterns), `group` to a short heading such as `Stars`, and `band` to `all`. The group appears below the family's Easy, Medium and Hard, numbered from 1, and Next puzzle walks through the group alone. Leave `family` out of the module entry. Proofs is the existing example, with its own `proofs` band above the levels.

Every group gets its own mechanic id, even when the move is the family's own, because Next puzzle and the contract test go by mechanic. A group that keeps the base move can wrap the base hooks: import the base module (`motion.js` has `toggle`, `clock` and `billiard`; `networks.js` has `route` and `color`; `deduction.js` has `latin`, `code` and `nim`; `measurement.js` has `jug` and `weigh`) and spread its hooks into the new mechanic, overriding what changes. Changing the base module itself changes that family's files, so claim them on the work board and keep its puzzles and saves working.

## Where it appears

- **Satchel.** Families from the seam come first, newest first, and the newest starts open. A playground opens from a button above the groups.
- **Not on the road.** A family goes onto a road only after children have played it. That is a separate change to the road, and Claude owns the story.
- **Offline.** `npm run build` adds the module's files to the offline copy (`dist/sw.js`). Nothing reaches the live site until James asks for a release.

## Checks before you push

```sh
node scripts/build-<id>.mjs     # if the family has one
npm test
npm run validate
npm run build
npm start                       # then, in another terminal:
node scripts/families-browser-smoke.mjs
node scripts/copy-browser-smoke.mjs
node scripts/expansion-browser-smoke.mjs
node scripts/navigation-browser-smoke.mjs
```

`TEST_FAMILY=<id>` limits the families suite to one module. It reports which puzzles live hints solve; the validator is where every puzzle must be solvable through hints. The other three suites count families from the registry, so a new family needs no change to them. `tests/families.test.mjs` checks the contract: a unique id and mechanics, every required hook, the validator, tests and notes in place, and every puzzle starting valid, with an objective and controls, and rendering. `tests/family-imports.test.mjs` checks the imports.

## When another port merges first

Two files are shared by every port: the registry and `dist/sw.js`, which the build writes. On a rebase conflict, keep both registry lines with yours last, take either side of `dist/sw.js`, run `npm run build`, and rerun the checks.

If a port needs anything else shared (`main.js`, `ui.js`, `engine.js`, `caravan-ui.js`, `boards.css`), make it a general hook rather than a family id, put it in its own commit, and note it on the work board so the other ports can use it.
