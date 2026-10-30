# How to play demos

How to play opens with a few seconds of the puzzle's move played on a board that isn't a puzzle. It is the app's version of the worksheets' "launch together" rule: show the concrete action first, and keep the words for those who want them. The plan asked for it in Track A ([plan](plan/README.md), UI: "Each family gets a few-second demo of its move on a board that isn't a puzzle … so How to play can shrink").

## What a child sees

How to play shows the demo board above its text. After a short pause the demo plays: before each step a ring marks the control the step uses (several rings, in order, when the step needs several taps), then the board changes. When the last step has played, a ▶ button below the board (named "Show again") plays it once more. With reduced motion the demo doesn't start by itself; the first board shows with the ▶ button (named "Show the move").

The demo is drawn by the mechanic's own renderer, inert and hidden from screen readers; How to play's text says the same thing in words and is still read aloud. Nothing is saved, and the demo has its own puzzle id (`demo-<mechanic>`), so a mechanic's view state for the open puzzle is untouched. A staged road puzzle, explained in its picture's words, has no demo.

## Writing a demo

A mechanic declares its demo in an optional `howTo` hook (the twelve first mechanics declare theirs in `BASE_DEMOS` in [`dist/demo.js`](../dist/demo.js)):

```js
howTo: {
  parameters: {piles: [3, 2], normal_play: true, task: 'win_game'},
  steps: [{ui: {pick: {pile: 1, from: 1}}}, {move: {type: 'choose', pile: 1, remove: 2}}]
}
```

- `parameters` replace the parameters of the mechanic's first puzzle; `puzzle` (optional) replaces other puzzle fields. The board must differ from every puzzle's board (`tests/demos.test.mjs` checks).
- `steps` is a list of 1 to 8 steps. `{move: action}` plays the action the board's own controls would send (`data-move`); `{ui: payload}` changes view state as a `data-action="mechanic-ui"` control would (`data-ui`).
- A step's ring goes on the control whose `data-move` or `data-ui` equals the step. `taps` lists CSS selectors to mark first, in order, for controls that don't carry the move (two cups, a cell before its keypad, Ring). `view` gives the renderer context for the frame before the step (Latin squares draw the keypad for `{selected: cell}`).
- `howTo` can be a list of entries, each with a `mode`: the entry for the open puzzle's `parameters.mode` wins, then an entry without one. Give a mode its own demo when its controls differ (Mirror Couriers' four modes).

What makes a good demo:

1. **The move, not the mathematics.** Show what a tap or a drag does, on a board smaller than or different from every puzzle. Don't play a strategy, a puzzle's first moves, or an answer; a demo that ends on a goal is fine only when the goal is trivial on that board. Water jugs fills the 2-litre jug and pours it into the 5, which shows a pour without the difference trick that the first puzzle needs.
2. **Two to four steps.** Long enough to see the rule twice, short enough to finish in about five seconds.
3. **Small boards.** The demo is drawn at least 360 px wide and scaled to fit the dialog and less than half the screen's height, so a tall board ends up small. Prefer a board whose controls are big enough to see at that scale.
4. **A ring on every step.** A step whose control carries no `data-move` (a drag, a tap on a drawn crossing) gets no ring unless `taps` names something; the browser suite lists these steps.

## Checks

- `node --test tests/demos.test.mjs` (in `npm test`): every step is legal and changes the board, every frame draws, a `ui` step changes the drawing, and every demo board differs from every puzzle's.
- `node scripts/demos-browser-smoke.mjs` plays every demo in a browser on a phone (and on any `WIDTH` and `HEIGHT`): no page error, the demo fits the dialog, Show again replays it. It lists steps with no control to mark and the mechanics without a demo. `SCREENSHOTS=<dir>` saves each finished demo; `TEST_MECHANIC=<id>` runs one mechanic.

## Not yet done

- **Demos for the family modules.** On October 30, 2026 only the twelve first mechanics have demos (16 with their modes); the 111 mechanics on the family seam have none, so their How to play is text alone. Once every mechanic has one, make `tests/demos.test.mjs` require a demo for each.
- **Mirror Couriers' cross mode** taps a crossing drawn on the sheet, which has no control to mark.
- **Shorter How to play text.** The plan's point was that How to play can shrink once the demo shows the move; the text stays as it was until children have seen the demos.
- Testers should watch for: whether children watch the demo or skip to the text; whether a ring on a small scaled board is enough to see what was tapped; and whether Show again gets used.
