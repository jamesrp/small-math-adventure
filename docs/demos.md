# How to play demos

How to play opens with a few seconds of the puzzle's move played on a board that isn't a puzzle. It is the app's version of the worksheets' "launch together" rule: show the concrete action first, and keep the words for those who want them. The plan asked for it in Track A ([plan](plan/README.md), UI: "Each family gets a few-second demo of its move on a board that isn't a puzzle … so How to play can shrink").

## What a child sees

How to play shows the demo board above its text. After a short pause the demo plays: before each step a ring marks the control the step uses (several rings, in order, when the step needs several taps), then the board changes. For a drag the ring presses where the drag starts and slides to where it ends, and the board changes when it lands. When the last step has played, a ▶ button below the board (named "Show again") plays it once more. With reduced motion the demo doesn't start by itself; the first board shows with the ▶ button (named "Show the move").

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
- A step's ring goes on the control whose `data-move` or `data-ui` equals the step. `taps` lists where to mark first, in order, for controls that don't carry the move (two cups, a cell before its keypad, Ring): a CSS selector on the board before the step, or `{after: selector}`, measured on the board once the step is made, for a tap on an empty spot (a new site dot, a crossing) or the end of a drag. `drag: true` makes the ring slide from one tap to the next instead of pulsing at each: a handle names itself twice, `taps: ['.knob', {after: '.knob'}]`. `view` gives the renderer context for the frame before the step (Latin squares draw the keypad for `{selected: cell}`).
- `howTo` can be a list of entries, one per variant whose controls differ. An entry names its variant with `mode` (the puzzle's `parameters.mode`, as Mirror Couriers' four modes) and `when`: other parameters as `{name: value}` (flip map's `{task: 'trips'}`), or a test of the parameters with a `variant` name (tetra's `variant: 'place', when: q => Boolean(q.place)`). The first entry whose conditions all hold wins, then an entry with none. `tests/demos.test.mjs` checks that each named variant is some puzzle's.

What makes a good demo:

1. **The move, not the mathematics.** Show what a tap or a drag does, on a board smaller than or different from every puzzle. Don't play a strategy, a puzzle's first moves, or an answer; a demo that ends on a goal is fine only when the goal is trivial on that board. Water jugs fills the 2-litre jug and pours it into the 5, which shows a pour without the difference trick that the first puzzle needs.
2. **Two to four steps.** Long enough to see the rule twice, short enough to finish in about five seconds.
3. **Small boards.** The demo is drawn at least 360 px wide and scaled to fit the dialog and less than half the screen's height, so a tall board ends up small. Prefer a board whose controls are big enough to see at that scale.
4. **A ring on every step.** A step whose control carries no `data-move` (a drag, a tap on a drawn crossing) gets no ring unless `taps` names something; the browser suite lists these steps.

## Checks

- `node --test tests/demos.test.mjs` (in `npm test`): every step is legal and changes the board, every frame draws, a `ui` step changes the drawing, and every demo board differs from every puzzle's.
- `node scripts/demos-browser-smoke.mjs` plays every demo in a browser on a phone (and on any `WIDTH` and `HEIGHT`): no page error, the demo fits the dialog, the ring slides along every drag, Show again replays it. It lists steps with no control to mark and the mechanics without a demo. `SCREENSHOTS=<dir>` saves each finished demo; `TEST_MECHANIC=<id>` runs one mechanic.

## Family coverage

All 111 family-seam mechanics now have demos: 241 family entries with control variants, plus the 16 entries for the twelve first mechanics. The test requires a demo for every puzzle and mode in the pack. [The implementation report](demos-families-report.md) lists the batches, checks, screenshots and remaining player limitations.

## Variants and drags (November 2)

The player now chooses demos by variants other than `parameters.mode`, and its ring follows drags. New variant demos: flip map's numbers (two counts marked, no Check) and trips (one card answered yes, another no, no Check); holes' schedule (two wires, then a tile outside the first loop) and race (one tile inside each loop); friezes' free edits (an F placed, a second form chosen and placed) and moves (an F lifted and moved, then Flip); tetra's pair with a merge and pair with letters to put on; every-start's piles (a pile built and kept, unjudged). None ends the puzzle or plays a check. Tetra's Can't stays out of every demo, since it is a claim.

Thirty drag steps slide: friezes' slide, Aims' aiming, and the handles of creases, globe, pantograph, ranges, strands and tent. Every step now marks something: sites' new dot, tropical's junction and Mirror Couriers' crossing use `{after}` or a crossing selector.

These were checked by `npm test` and by playing all 266 demos through the player in jsdom (every step found its marks and every drag slid), not in a real browser: this session had none. The ring positions and the slide on a phone and a tablet still want a look.

## Not yet done

- **Shorter How to play text.** The plan's point was that How to play can shrink once the demo shows the move; the text stays as it was until children have seen the demos.
- Testers should watch for: whether children watch the demo or skip to the text; whether a ring on a small scaled board is enough to see what was tapped; and whether Show again gets used.
