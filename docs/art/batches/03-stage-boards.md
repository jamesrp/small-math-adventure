# Batch 3: stages for the ferry and the marsh

James played the road on October 10 and asked for the Turtle Ferry's three puzzles and the marsh boardwalks to be played in the picture itself, seen "more isometric than side-on", instead of under a scene he had to scroll past. The game now does that over drawn placeholders (`dist/stage-placeholders.js`). This batch replaces them with finished art: five slots. Claim the line on [WORKBOARD.md](../../../WORKBOARD.md) first. Style, specs and the cast are in [ROADMAP.md](../ROADMAP.md).

| Slot | Size | What |
|---|---|---|
| `stage/ferry/asleep` | 1600×900 | Snooze from above and in front, asleep, with an empty round deck on her shell and a bell frame at her bow. |
| `stage/ferry/awake` | 1600×900 | The same picture, pixel for pixel, with her eyes open and a smile. |
| `stage/ferry/bell` | 256×256, transparent | The brass bell, hanging from a short rope at the top center. |
| `stage/marsh/night` | 1600×900 | Glowworm Marsh at night from above and in front: open water, no boardwalks. |
| `stage/marsh/hops` | 256×256, transparent | Hops walking, full body, carrying his lamp-lighting pole, feet at the bottom center. |

Stills are what matter. A stage backdrop may have a gentle loop (water, fireflies) under the same rules as batch 2's scene loops; nothing may move where the game draws pieces.

## What the game draws on top

The game draws every piece that changes during play, so a backdrop is the place and nothing else. Coordinates are in the 1600×900 picture.

**Ferry.** Keep these empty and evenly lit:

- **The deck,** an ellipse centered at (650, 548), 940 wide and 416 tall, flat and seen from above at about 30°. The game puts four to six seats on it in two staggered rows (feet at y 470 and 645), the travelers in them, and for the lamp puzzle either lamp posts around its rim or a lamp tree above its back half (up to y 40).
- **The bow frame:** two posts at x 1078–1108 and 1384–1414, a beam across the top at y 24–60, and an empty hook under the beam's middle at (1245, 60). The game hangs `stage/ferry/bell` there and mounts one or two round bell wheels, 270 across, between the posts from y 250 to 780. Keep that space plain: sky, water or the turtle behind it, nothing busy.
- **The bow platform** under the frame (x 1040–1410, y 560–790), where travelers without a seat stand.

Snooze's head sits to the right of the frame (x 1380–1600, y 480–700). Her face is the only difference between asleep and awake. The jetty, where the caravan waits on the map, comes in from the bottom-left corner.

**Marsh.** Keep the water from x 300 to 1300 and y 220 to 820 open and fairly dark, so lit lamps read: the game lays its boardwalks, junction platforms and lamps there, in a different pattern on each grade trail. Put reeds, lily pads and fireflies around the edges. A mossy bank at the bottom middle (x 500–1100, y 800–900) is where Hops waits before his first step.

**Covered corners.** Plume's card covers the top-left (about 330 × 110) and the keeper's round portrait overlaps the bottom-left (about 250 × 110).

**Phones** show the middle of the picture, x 200–1400; the bell puzzle shows the bow, x 700–1600. Snooze's face only has to read in the bow view.

## The bell and Hops

- **Bell:** brass, friendly, about 150 wide in the picture. The game swings it from the top center on each ring, so the rope's top must be at the top center of the square.
- **Hops:** the same frog as his keeper portraits (top hat, round spectacles, lamp-lighting pole), mid-stride, readable at 100 px tall. The game slides him along a boardwalk between platforms; a walking pose that works facing either way is best. Until this slot is ready, the game shows his round idle portrait as a token.

## Not in this batch

- The seats, lamps, boardwalks and bell wheels stay drawn by the game. If finished stickers for them would look better next to the new backdrops, say so in `artwork/road4/NOTES.md` and Claude will write slots for them.
- **The caravan's wagon on the ferry.** James asked how the wagon crosses on the turtle, and how it later rides the Windy Ridge gondola. That is a story choice waiting on him, so leave the wagon out of both backdrops for now.
- The old ferry scenes stay as they are. They now show only above Snooze's bath, the side puzzle.

## Making them

1. `node scripts/export-art-references.mjs` writes `artwork/road4/reference/stage_*.png`: each placeholder with the areas above outlined in red. Use them as composition guides; the outlines must land on the same things in the finished art.
2. Make `asleep` first, then `awake` from it with only the face changed (an edit, not a new generation), so the switch on the bell's solve is just her eyes opening.
3. `node scripts/prepare-art.mjs` for each file, and record prompts in `artwork/road4/prompts.json`. Originals stay out of the repository.

Budgets: stage backdrop 450 KB as a still, 1.5 MB as a loop; bell and Hops 60 KB each.

## Checks and review

- `node scripts/check-art.mjs`, `npm run build`, `npm test`, and `node scripts/road-browser-smoke.mjs` with `npm start` running.
- In the game at phone, iPad and desktop sizes, all three grade trails: the ferry seats (four, five and six seats), the bell (one and two wheels), the lamps (ring of four, ring of five, lamp tree) and the boardwalks (three layouts). Every piece must sit where it belongs: travelers on the deck, wheels between the posts, lamps on the rim, Hops on the platforms.

## Done

The five slots are ready, the checks pass, and the work is on `main`. Three things for James to watch with children:

1. Do children tap the travelers on the deck, or reach for the pair buttons first?
2. Does tapping the bell to ring read as obvious?
3. On the boardwalks, do they plan a walk or just tap the glowing platforms?
