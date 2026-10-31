# Family How to play demos

Implemented from [Claude’s October 30 brief](briefs/demos-for-families.md). All 111 mechanics on the family seam now declare their own `howTo` hooks; the shared player is unchanged. The coverage test checks every puzzle, including each mode, so an added mechanic cannot silently fall back to text-only How to play.

These are newly authored demonstration instances on the existing mathematical models, not borrowed worksheet instances. The teaching rationale follows the worksheets’ [Week 1 classroom review, “Concrete launch to try next time”](https://github.com/jamesrp/math-circle-worksheets/blob/3db9f628fa609aaa73ba7c46a12224ea101acc88/plans/week-01-classroom-review.md): establish the concrete action without settling the mathematical question. The fetched worksheets checkout and its year-2 index were consulted. Each family’s existing README, renderer and move hooks supplied the object and legal actions.

## Batches

| Batch | Mechanics added |
|---|---|
| Counting and logic (`b4859cf`) | mixup, fences, cuts, trios, nests, joins, strings, shrink, taquin, sorting, pictures, codebook, secret, orchard, towers |
| Games and sharing (`519822d`) | menu, menutrack, shares, buckets, bucketsort, stalks, stalkbuild, piles, votes |
| Number tools and proof boards (`9bddb78`) | star, kit, tank, sumsets, primes, totals, leftovers, proofgarden, flipmap, sortgarden, duel |
| Grids, bands and folds (`49bbf0b`) | hills, geoboard, squares, covers, sites, glued, shields, strands, radon, ranges, tropical, creases |
| Networks (`f09ea90`) | chips, chipstill, flow, firstfit, fewest, mst, braces, meeting, matching, ends, corners, corner-trees, cops, copsfold, copstwo, rotor |
| Symmetry and walking (`39f6eb0`) | beads, lopsided, detours, lamplighter, robot, elevator, stairs, holes, friezes, tetra |
| Chance and machines (`dc02c48`) | cardmachine, knowledge, calibrate, shuffles, bags, paint, copies, sides, decks, offers, machine, gapflood, averages, diffs, seeds, catches, tent |
| Tilings, rooms and moving shapes (`7fcedf5`) | rhombus, rainbow, starred, blueduel, blockfill, redfill, portals, knots, aims, folds, mobius, islands, octagon, rookrace, everystart, width, globe, loops, loopsnum, reshape, pantograph |

Each batch received legal-step, distinct-board and frame-render checks, full unit tests, content validation, a build, and phone/desktop browser checks. Every captured screenshot was inspected. Subsequent batches also refine the earlier taquin, joins, geoboard and radon demos. Bounded independent review prompted the small sorting-answer bounds correction and truthful flow-game metadata in `5c215d0`.

## Family-local support

Most changes are hook data only. The few supporting changes stay in their existing modules:

- Beads and lopsided use shallow copies of their shared hooks, so each can declare its own demo.
- Bucket sorting can render a small authored card shelf; garden sorting can start from two authored gardens. Their normal shelves, six-card rounds and saved boards keep their existing behavior.
- The proof flip map uses its existing wide layout inside a demo on phones, so the six cards remain readable.

No puzzle pack, authored objective, character line, progression rule, art asset or shared player changed.

## Claude’s review

The sequences show partial actions, or tiny trivial completions, without playing a shipped puzzle’s opening or a strategy. Garden sorting toggles one answer twice without checking; most enumeration and proof controls are not played. Matching’s check mode and stalks’ colour/who-starts choice demonstrate a claim because it is that mode’s central operation. Their examples do not identify a shipped answer.

The player selects alternatives only through `parameters.mode`. Variants encoded in other fields retain a central-action demo: flipmap’s `task` (numbers/trips), holes’ `kind` (cancel/schedule/race), friezes’ `edit` (none/free/move), tetra’s additional pair-setup flags, and everystart’s pile kind. Expanding that dispatch belongs to Claude’s player decision. Likewise, a drag ring marks its handle or start but does not follow the movement.

Five new coordinate steps have no ring: sites free placement (one), Aims aiming before its Launch (two; Launch itself is marked), and tropical junction movement (two). Mirror Couriers’ existing cross demo also has one unmarked step. The remaining drag steps mark a handle or source control. Radon’s locus mode scales down because its renderer stacks three split previews; shields stacks room views on phones, and calibrate/stretch and tent/widest retain dense rulers/plots. All fit both viewports and were visually reviewed; these are the screenshots Claude should sample first. No child has watched these new demos yet; the report is code and browser evidence, not a playtest.

## Verification and screenshots

The combined verification uses all 1,414 shipped puzzles and 123 mechanics. There are 257 distinct demo entries (241 family entries plus 16 base entries), with 541 steps. Results:

- `npm test`: 1,668 pass, including mandatory coverage, legal moves, distinct boards and every frame rendered.
- `npm run validate` and `npm run build`: pass. Offline asset version `336f6eb13c6b395a`.
- Demo browser suite: 257/257 at 390×844 and 257/257 at 1280×800, including replay and dialog fit. All 514 final screenshots inspected.
- Family browser suite: all 94 modules and 1,186 family puzzles pass, with no page errors, in four independent runs of the same checks. Only the temporary runners’ module filter and report filenames differ; the source suite is unchanged. All family boards, Help and phone/desktop layouts are checked, with hint solves where supported.

The final local evidence is in `test-results/demos-families/phone/`, `desktop/`, and `reports/`. Raw logs and the complete family report are kept alongside them. Every batch's mode details and screenshots are described in the worker reports there. Source integration does not deploy the app.

Recreate the complete screenshots from the repository with `npm start` running:

```sh
SCREENSHOTS=test-results/demos-families/phone node scripts/demos-browser-smoke.mjs
WIDTH=1280 HEIGHT=800 SCREENSHOTS=test-results/demos-families/desktop node scripts/demos-browser-smoke.mjs
node scripts/families-browser-smoke.mjs
```

Set `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE` and `TEST_URL` if the local browser/runtime or port requires them. `TEST_MECHANIC=<id>` narrows a demo run. Screenshots and raw logs stay in ignored `test-results/`; the demonstration specifications and this report are in source control.
