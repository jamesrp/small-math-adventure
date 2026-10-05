# Batch 1: keeper reaction clips

Fourteen one-shot clips: `keeper/<id>/happy` and `keeper/<id>/oops` for Snooze, Mr. Hops, Billie, Rattle, Sprocket, Wick and Plume. Style, cast, specs and tools are in [ROADMAP.md](../ROADMAP.md); this page says what is different about this batch and what each clip does. Claim the Dot/Codex line for it on [WORKBOARD.md](../../../WORKBOARD.md) first.

## What the game does with them

The keeper's round portrait sits beside the speech bubble on every road puzzle. A wrong move plays `oops`; a solve plays `happy`. Plume's small score card plays `happy` when he beats the player and `oops` when the player beats or ties him. Each clip plays once, then the portrait shows the idle still (or the idle loop, if one exists later). A second mistake in a row plays `oops` again from the start, so a child may see the same clip three or four times in a minute.

Reduced-motion players, and anyone before the clip loads, see the slot's still.

## Start from what exists

The 28 keeper stills are finished (October 3) and stay as they are: `dist/art/keeper/<id>/{idle,talk,happy,oops}.webp`, with sources in `artwork/road4/stills/` and choices in `artwork/road4/stills-selected.json`. Do not regenerate them.

- **First frame:** the reaction still (`happy.webp` or `oops.webp`). The reaction lands the instant the child acts.
- **Last frame:** the idle still (`idle.webp`). The game cuts from the clip's last frame to the idle still, so any difference shows as a jump.
- If the video tool takes an end frame, give it the idle still. If it takes only a first frame, describe the idle pose in the prompt ("returns exactly to this resting pose: …"), then compare: `node scripts/prepare-art.mjs lastframe clip.mp4 last.png` and look at `last.png` beside `idle.webp`. For a number to go with your eye, `ffmpeg -i last.png -i dist/art/keeper/<id>/idle.webp -lavfi "[0]scale=512:512[a];[1]scale=512:512[b];[a][b]ssim" -f null -` prints how alike they are: identical frames score 1.0, and Snooze's happy and idle stills, which differ only in the face, score 0.90, so a clean ending sits close to 1. Regenerate a clip that drifts; never edit the code to hide a jump.

## The clips

1.5 to 3 seconds each (the checker allows 1.2 to 6). The gesture fills the middle; hold the idle pose for the last 0.3 seconds or so. Camera locked, background unchanged, no new objects, no text, no audio. The game crops the square to a circle, so keep heads, hats, hands and props inside the middle 80%.

| Keeper | `happy` (the still: …) | `oops` (the still: …) |
|---|---|---|
| Snooze | wide-eyed smile → she stretches her neck up a little, takes one slow contented blink, and her eyelids sink back to drowsy | startled awake → a small jolt, a slow blink, the eyelids droop back to drowsy |
| Mr. Hops | hand at his hat brim → he lifts the hat an inch, sets it back, lowers his hand | frown → a short disapproving head shake (a "tut"), the frown smooths back to his idle smile |
| Billie | laughing, hoof up → a little hop, the scarf whips in the wind, she lands | laughing, eyes squeezed → a good-natured laugh with shaking shoulders, eyes open again |
| Rattle | fist up → a rattly jig, bones jiggling, back to holding the watering can | hands on his cheeks → he jumps up in mock fright ("boo!"), lands, hands back down |
| Sprocket | grinning, eyes closed → tosses the wrench in one spin and catches it | hand at mouth → ducks as if something clanked nearby, peeks back up |
| Wick | wing raised → one soft hoot (beak opens), one wing flap, rain drips off the hat | wing at his chin → a slow head tilt, considering, eyes settle to half-lidded |
| Plume | wink and smug grin → a smug laugh, chest puffed, the tail fan shimmers | wing over beak → he gapes, the tail droops a little, then he composes himself |

Keep it small and characterful. An `oops` is never mean or scary: Rattle's "boo" is theatrical, Billie laughs with the child, not at them.

## Making them

1. Install ffmpeg first if it is missing (on the Mac, `brew install ffmpeg`). `prepare-art.mjs` needs it, and without `ffprobe` the checker skips codec and duration checks. The October 3 batch ran without it.
2. Generate each clip as ROADMAP's "Videos" section describes, from the stills above. Start with one keeper's pair and look at it in the game before doing the rest.
3. `node scripts/prepare-art.mjs once <clip> keeper/<id>/<pose>`. It writes the MP4 (512 px, H.264, 24 fps, no audio), keeps the existing still as the poster, and records the slot in `dist/art/manifest.json`.
4. Add each clip to `artwork/road4/prompts.json` (slot, prompt, tool, date, first frame, end frame, source file). Keep the generator's original clips out of the repository (James's Drive is fine) and record their filenames there; the shipped MP4s are the only video committed.

## Checks and review

- `node scripts/check-art.mjs` (each clip under 400 KB, H.264, yuv420p, no audio, 1.2 to 6 seconds), `npm run build`, `npm test`, and `node scripts/road-browser-smoke.mjs` with `npm start` running.
- In the game (`npm start`, `http://127.0.0.1:4187`), on a phone-sized window and an iPad-sized one: at one stop per keeper, make a wrong move twice and then solve. At Windy Ridge, lose one pebble game to Plume and win one. Turn on reduced motion once and check the reaction still shows instead.
- Make a review page, `artwork/road4/review/reactions.html`, like `keepers.html`: each keeper's idle still, then the two clips in circle crops, looping with a pause, so James can watch all fourteen at once.

## Done

The fourteen slots have clips, the checks pass, the review page exists, and the work is integrated on `main` under `AGENTS.md`. Mark the work-board line done and tell James three things to watch for when children play:

1. Does the reaction read at portrait size, at a glance, while the child is looking at the board?
2. Is there a visible jump when a clip hands back to the idle still?
3. Does any `oops` get annoying by the third mistake in a row?

## Not in this batch

- **Idle and talk loops.** `talk` shows from the moment a puzzle opens until the first move, with or without sound, so a talking loop would move its mouth in silence. Claude will decide how `talk` should behave before those loops are briefed.
- Scene loops and change clips are [batch 2](02-scene-motion.md).
