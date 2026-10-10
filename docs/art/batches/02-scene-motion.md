# Batch 2: scene loops and change clips

The road's scenes start to move: 28 scene loops (`scene/<stop>/<stage>`), 21 change clips (`scene/<stop>/<n-1>-<n>`), then the two map loops and the finale loop. Style, specs and each stop's "Change" and "Loops" notes are in [ROADMAP.md](../ROADMAP.md). Start after [batch 1](01-keeper-reactions.md) is in, so its lessons carry over, and claim the line on [WORKBOARD.md](../../../WORKBOARD.md) first.

## What the game does with them

A scene shows its stop at the current stage (how many of its three puzzles are solved on this trail) and loops that stage's clip. Solving a puzzle plays the change clip once, which hands over to the next stage's loop. The scene sits just above the board while the child is thinking. Reduced-motion players, and anyone before a clip loads, see the slot's still.

## Start from what exists

All 28 stage stills are finished and stay as they are. Each change slot's still is a copy of the stage it ends on; keep that too, because it is what reduced-motion players see after a solve. `prepare-art.mjs` keeps an existing still.

- **Loops:** first frame is the stage still. `prepare-art.mjs loop` crossfades the end into the start (`--fade 1`), so the clip need not end exactly where it began. Nothing in a loop may change the stage: a lamp that is off stays off.
- **Change clips:** first frame is stage n−1's still, last frame is stage n's still (give the tool both if it takes an end frame). ROADMAP's chaining recipe, which makes each stage still from the last change's final frame, was for when no stills existed. Do not replace stage stills that way now.
- The hand-off from a change clip to the next loop is seamless only if both match stage n's still. Check last frames with `node scripts/prepare-art.mjs lastframe`, as in batch 1.

## Motion rules

- Gentle and ambient. The child is solving a puzzle under this picture; motion that pulls the eye off the board is too much.
- No strobing. Lightning at the lighthouse and fireworks at the fair stay soft: at most one flash per loop, never a full-frame white flash, never more than three flashes a second.
- Keep the bottom-left corner (keeper portrait) and top-right corner (Plume's card) calm, and the main action in the middle 80% of the width, where phones crop.
- Camera locked, no new objects, no text, no audio.

## Making them

Do one stop at a time, its four loops and three changes together so they match. Start with Glowworm Marsh and look at it in the game before moving on.

Since October 10 the Turtle Ferry's three puzzles and the marsh boardwalks are played inside a stage ([batch 3](03-stage-boards.md)) instead of under their scene. So the game no longer shows `scene/ferry/0`–`2`, the ferry's three changes, `scene/marsh/0` or `scene/marsh/0-1`; `scene/ferry/3` still shows above Snooze's bath, the side puzzle. Leave those for last, or skip them. Then the map loops (`map/wide`, `map/tall`: the landmarks under the stop buttons must not move) and `finale/fair`.

`node scripts/prepare-art.mjs loop|once <clip> <slot>`, then record each clip in `artwork/road4/prompts.json` with its first and end frames. Originals stay out of the repository, as in batch 1.

Budgets: scene loop or change clip 1.5 MB, map 3 MB, finale 4 MB, all art under 90 MB (8.4 MB today). Videos are not part of the offline install; they cache on first play.

## Checks and review

- `node scripts/check-art.mjs`, `npm run build`, `npm test`, and `node scripts/road-browser-smoke.mjs` with `npm start` running.
- In the game at phone and iPad sizes: play through each finished stop and watch every change land on its next loop. Check reduced motion once.
- A review page, `artwork/road4/review/scene-motion.html`: each stop's stages in order, loop then change then loop, so James can watch a stop from arrival to finish.

## Done

The finished stops' slots have clips, the checks pass, the review page exists, and the work is on `main`. A batch can land one stop at a time; say which stops are in on the work-board line. Three things for James to watch with children:

1. Does the moving scene pull eyes off the board while they think?
2. Does each change clip read as "my solve did that"?
3. Is there a jump where a change clip hands over to its loop?

## Known

Before a change clip has loaded the first time, the poster (the finished stage) shows for a moment and then the clip starts from the stage before. If that looks wrong in the game, tell Claude in `artwork/road4/NOTES.md`; it is a code fix, not an art fix.
