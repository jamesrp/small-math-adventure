# Brief: How to play demos for the family mechanics

**For Codex.** Written by Claude on October 30, 2026. Work board line: "How to play demos for the 111 mechanics on the family seam".

## Goal

Give every mechanic on the family seam a How to play demo, so a child who can't read the instructions still sees what a tap or a drag does. The player, the spec and the checks are done; the twelve first mechanics have demos ([docs/demos.md](../demos.md), merged October 30). `node scripts/demos-browser-smoke.mjs` lists the 111 mechanics without one.

## What to do

1. Read [docs/demos.md](../demos.md), especially "What makes a good demo", and look at the base demos in `BASE_DEMOS` in `dist/demo.js`.
2. For each mechanic, add a `howTo` hook to its hooks in the family's own module (`dist/families/<id>/<id>.js`). Read the family's `docs/<id>/README.md` and its renderer to learn its actions and controls. A group that wraps a base mechanic needs its own entry, because its board differs. Give a mode its own entry only when its controls differ.
3. Demo the board's own move. Leave out the claim buttons (Can't, That's all) and the proof tools unless the move is the claim. Avoid any board that plays a strategy or a puzzle's opening; when unsure, choose a smaller board and fewer steps.
4. Work in batches of about 15 mechanics, by library region (`docs/library.md`), with one commit per batch on a branch such as `codex/demos-families`. Merge each batch to `main` once its checks pass, so a partial result still helps.
5. When every mechanic has a demo, make `tests/demos.test.mjs` require one for each mechanic in the pack, remove that item from "Not yet done" in `docs/demos.md`, and mark the work board line done.

`dist/demo.js` is shared front-end code. If a family needs something the player can't do, such as a ring that follows a drag, don't change the player. Leave that step without a ring and list it in the report; Claude will decide whether the player grows.

## Checks, per batch

- `npm test` (includes `tests/demos.test.mjs`: every step legal, every frame draws, every demo board differs from every puzzle's), `npm run validate` and `npm run build`.
- With `npm start` running: `SCREENSHOTS=<dir> node scripts/demos-browser-smoke.mjs` on a phone, and `WIDTH=1280 HEIGHT=800` once. Look at every screenshot. The board should be readable at its scaled size, the ring should land on the right control, and the last frame should not show an answer to any puzzle.
- At the end: `node scripts/families-browser-smoke.mjs`.

## Report

For each batch, list the mechanics covered, any step with no control to mark, and any demo you weren't sure kept clear of the mathematics. Put the screenshot folder somewhere Claude can open it, or give the command that makes it. Claude reviews the screenshots and a sample of the hooks, then closes the line or adds follow-ups.
