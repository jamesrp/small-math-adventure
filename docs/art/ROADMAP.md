# Lantern Road art roadmap

A handoff for whoever makes the art (Dot/Codex, with James’s ChatGPT image and video tools). The game is finished without art: every picture is a drawn placeholder. Each finished file replaces exactly one placeholder, through the manifest, with no code changes.

## Ground rules

- **Keep art batches to art.** Put files under `dist/art/`, records in `dist/art/manifest.json`, and sources and prompts under `artwork/road4/`. If a picture needs a code change, make it as a separate commit under the rules in `AGENTS.md`, which prefer Claude sessions for the puzzle UI and the road's screens. The keepers' and Plume's lines belong to the story; note wanted changes in `artwork/road4/NOTES.md`.
- **No text in pictures.** Names, numbers and labels are drawn by the game.
- **Keep the stop layout.** The map’s stop buttons and the scene’s keeper portrait sit on top of the art at fixed places (see “Safe areas”).
- **Kid-friendly spooky.** The hollow is Halloween-fun, never gory or frightening.
- Original characters only: no likeness of existing franchises.

## Quick start

1. Read “Look and feel”, the cast and the stop briefs below.
2. Make the reference sheets (batch 0). Attach them to every later prompt.
3. For each slot, generate it, then run `node scripts/prepare-art.mjs still|loop|once <file> <slot>`. This sizes, encodes and records the file.
4. Run `node scripts/check-art.mjs` (shape, size, codec, duration), `npm run build` (offline cache list), `npm test` and `node scripts/road-browser-smoke.mjs`.
5. Look at it in the app (`npm start`, open `http://127.0.0.1:4187`), on a phone-sized window and on the iPad.

`node scripts/check-art.mjs --list` prints all 95 slots with their sizes. `artwork/road4/reference/` has a PNG of every placeholder at the slot’s shape. Use those as composition guides (what is where, what changes between stages), not as style references.

The version-3 scenes of the ferry, marsh, ridge, workshop and lighthouse are in `artwork/road/v3/`. They can be a starting point for those places, but they use a dusky, muted palette. The new look below is brighter.

## Look and feel

**Bright and bold, with dark places.** This is a children’s game, so colors are saturated and clean, never washed out or dusty. Four of the seven stops are dark (night marsh, Halloween hollow, stormy lighthouse, night fair). Dark stops still use bright, glowing color accents, like Bloons TD’s night and graveyard maps.

**Style prompt** (start every image prompt with it):

> Children’s game art in a bold, bright storybook-cartoon style. Clean, confident dark outlines (deep green-black #233e35), flat saturated color with soft cel shading, simple rounded shapes, chunky readable silhouettes, big expressive eyes and friendly faces. Playful and warm, readable at small sizes on an iPad. No text, letters, numbers, logos, user interface, borders or watermarks.

Avoid: muted or dusk-washed palettes, gouache or paper-texture painting, photorealism, glossy 3D plastic, thin scratchy lines, and busy detail in the scene’s bottom-left corner.

| Stop | Mood | Key colors |
|---|---|---|
| Turtle Ferry | bright morning | sky #9fdcff→#fff0c2, sea #3bb5c8, sand #f2d27e, coral #ff9e5e |
| Glowworm Marsh | night glow | sky #14213f→#2c4a63, water #1e4b45, glow #c6ff6b, lily pink #ff7ab8 |
| Windy Ridge | bright, windy | sky #7fd0ff, hills #7ab46b / #5b8f68, cable-car red #e35d4a, kites pink, yellow, blue, purple |
| Spooky Hollow | Halloween | sky #24123a→#5e2a72, moon #ffe9a8, pumpkin #ff8a1f, stone #8a8aa8 |
| Old Workshop | warm inside, rain outside | wood #7a4e33 / #a8743f, lamp #ffcf6a, window rain #3e5f80 |
| Stormy Lighthouse | storm at night | sky #17233a→#3a4f78, sea #1f3b63, beam #fff09a, lighthouse red #e35d4a |
| The Lantern Fair | festive night | sky #2a1758→#7a2f86, string lights red, yellow, blue, gold #ffd23f |

## The cast

Draw a **reference sheet** for each character first: front, three-quarter, and two or three expressions, on a plain background. Save the sheets in `artwork/road4/reference-sheets/`. They are not shipped. The six travelers already exist as small vector drawings in the game (`artwork/road4/reference/party_*.png`). Keep their designs recognizable and make them richer.

**The travelers** (silent; they appear in scenes doing things):

| | Look |
|---|---|
| Pip | a small moth with soft tan wings, a round face, two antennae and an oversized red-orange scarf |
| Moss | a snail with a terracotta spiral shell, a sage-green body and a yellow kettle carried on his shell |
| Rook | a blue-grey bird navigator with a cream chest and an orange beak, always holding a folded map |
| Bea | a red beetle (ladybird shape) with a dark green head, a yellow headband and a wrench |
| Fern | a seedling with two bright green leaves growing from a smiling terracotta pot |
| Tumble | a round, fluffy, pale-beige puff with a pointed green hat, often carrying a spoon or blanket |

**The keepers** (one per stop; they talk):

| | Look and personality |
|---|---|
| Snooze (Turtle Ferry) | A giant, very sleepy sea turtle who *is* the ferry: a wooden deck with three cargo cradles on her leaf-green shell, lanterns at the deck corners, heavy-lidded eyes, a kind smile. Slow and gentle. |
| Mr. Hops (Glowworm Marsh) | A fussy frog lamplighter: bright green, round, big eyes, a tall black top hat with a gold band, a long brass lighting pole with a tiny flame. Precise and proud of his lamps. |
| Billie (Windy Ridge) | A loud, cheerful mountain goat who runs the cable car: cream fur, curled brown horns, a red scarf always flapping in the wind. Shouts happily over the wind. |
| Rattle (Spooky Hollow) | A theatrical skeleton gardener: a round white skull with dark eye sockets and small orange glints, a floppy purple hat, a pumpkin-orange scarf and a little watering can. Tries to be spooky and is secretly delighted to have visitors. |
| Sprocket (Old Workshop) | A fast-talking raccoon inventor: grey fur, black mask, round goggles pushed up on the forehead, a leather tool belt full of springs and gears, a striped tail. Things go bang around him. |
| Wick (Stormy Lighthouse) | A calm owl lighthouse keeper: brown feathers, huge round yellow-ringed eyes, a yellow raincoat and sou’wester hat. Few words, dry humor. |
| Plume (the rival) | A show-off peacock: teal-blue body, gold crest, a big fan tail of green and gold eye-spots, smug half-closed eyes. Competitive but a good sport. Drives a flashy wagon with a tail-feather awning. |

## Slots and files

Files go in `dist/art/` at the slot’s path: `scene/ferry/0` becomes `dist/art/scene/ferry/0.webp` and `.mp4`. `prepare-art.mjs` names, sizes and records them. Every ready slot needs a **still** (WebP). It is also the video’s poster and what reduced-motion players see, so it must be a complete picture by itself. A **video** (MP4, H.264, no audio) is optional and plays over it.

| Group | Slots | Still | Video |
|---|---|---|---|
| Map | `map/wide`, `map/tall` | 2000×840, 1200×1800 | loop 6–8 s, gentle ambient motion |
| Map stickers | `map/wagon-party`, `map/wagon-plume` | 240×180, transparent | — |
| Tools | `tool/chalk`, `tool/pump` | 256×256, transparent | — |
| Travelers | `party/pip` … `party/tumble` | 256×256, transparent, full body | — |
| Scenes | `scene/<stop>/<0–3>` (28) | 1800×690 | loop 4–6 s (ambient) |
| Scene changes | `scene/<stop>/<n-1>-<n>` (21) | 1800×690 (poster) | one-shot 2–4 s, from stage n-1 to stage n |
| Keepers | `keeper/<id>/idle`, `talk` | 512×512 | loop: idle 3–6 s, talk 2–4 s (plays only while a voice speaks) |
| Keeper reactions | `keeper/<id>/happy`, `oops` | 512×512 | one-shot 1.5–3 s that ends on the idle pose |
| Finale | `finale/fair` | 1800×780 | loop 8–10 s |
| Stages | `stage/ferry/asleep`, `stage/ferry/awake`, `stage/marsh/night` | 1600×900 | optional loop, nothing moving where pieces go |
| Stage pieces | `stage/ferry/bell`, `stage/marsh/hops` | 256×256, transparent | — |

Stops are `ferry, marsh, ridge, hollow, workshop, lighthouse, fair`. Keepers are `snooze, hops, billie, rattle, sprocket, wick, plume`.

**How the game uses them.** The scene shows the stop’s stage: the number of its three puzzles solved on this trail. Solving a puzzle plays the change clip, which then hands over to the next stage’s loop. The keeper portrait rests on `idle` and shows `talk` only while the keeper is saying a line (see “When `talk` shows” below). After a mistake it plays `oops`, and on a solve it plays `happy`, then returns to idle. Plume’s small card uses Plume’s poses: `happy` when Plume wins, `oops` when you beat or tie him. Reduced-motion settings show stills only.

A **stage** replaces the scene for the four puzzles played inside the picture: the Turtle Ferry's seats, bell and lamps, and the marsh boardwalks. The game draws the puzzle's pieces (seats, travelers, bell wheels, lamps, boardwalks, Hops) on the stage at fixed spots, so a stage is the place and nothing else. Snooze's bath and Glowworm Marsh's lilies keep their scenes. [Batch 3](batches/03-stage-boards.md) has the layout.

### Safe areas

- **Scenes**: the speech bubble sits under the picture, not on it. Only two things cover a scene: the keeper’s round portrait, which overlaps the **bottom-left corner** (about 10% × 15%), and Plume’s card in the **top-right corner** (about 30% × 18%). The travelers can stand anywhere along the bottom middle. On tablets in landscape the picture can lose a little top and bottom. On phones, and beside the board on a wide, short screen (a tablet or laptop in landscape, where Plume's card moves under the keeper), it is cropped to the **middle 80% of its width** and the portrait covers a little more of the bottom-left, so keep the main subject in the middle.
- **Map**: each stop’s landmark sits under its red mark in `reference/map_wide.png` / `map_tall.png` (wide: Turtle Ferry 9%,70% · Glowworm Marsh 24%,38% · Windy Ridge 39%,66% · Spooky Hollow 53%,30% · Old Workshop 66%,70% · Stormy Lighthouse 80%,34% · The Lantern Fair 92%,64%). The map shows no place names: each stop is a tappable region around its landmark (`MAP_REGIONS` in `dist/road-placeholders.js`), and the next stop's region glows. A road links the stops in order, and the travelers' wagon waits on it at `MAP_WAGON`. The star total and the tools sit in the **top-right corner** of the wide map.
- **Stages**: the red outlines in `reference/stage_ferry_asleep.png` and `stage_marsh_night.png` mark where the game draws pieces; keep them plain. Plume's card covers the **top-left** corner, the keeper's portrait the bottom-left. Phones show only the part of the picture that holds each puzzle's pieces (`phoneView` in `dist/road-stage.js`): about x 180–1420, y 266–816 for the seats and the bow platform; the bow from the bell to its wheels, x 700–1600, y 40–790; about x 150–1125, y 0–815 for the lamps; and the marsh water down to Hops's bank, about x 250–1350, y 175–900. Anything else may be cut on a phone. Keep the ferry's horizon behind the deck: the drawn placeholder's pale horizon line (y 150) runs through the travelers on the lamps' phone crop, so the finished stage should stop the sky line at Snooze's shell (brief added October 24, from the road replay).
- **Keepers**: head and shoulders centered, filling about 80% of the square, on a plain background in the keeper’s stop colors. The game crops it to a circle.

### Stop briefs

Each stop has four stages (0 = arrived, 3 = all solved), and the change clips animate between them. The travelers are in every scene, busy with the stop’s task. A keeper may appear small in the scene doing their job; Snooze must, because she is the ferry.

**Turtle Ferry: bright morning harbor.** Turquoise sea, a sandy beach, a wooden dock on the left with two unlit lanterns, and Snooze floating as a ferry in the middle right with three cargo cradles on her shell.
0. Snooze asleep (“zzz” bubbles). The travelers wait on the beach. The cradles are empty.
1. The travelers sit in the seats on Snooze’s shell. *Change: they hop aboard one by one into their seats.*
2. Snooze awake, eyes open, paddling, wake ripples behind. *Change: a bell rings, Snooze yawns, opens her eyes and starts to swim.*
3. The dock lamps and Snooze’s deck lanterns glow warm. *Change: the lamps flick on one by one.*
Loops: waves, a gull, Snooze’s slow breathing.

**Glowworm Marsh: night glow.** Deep blue night, still water, tall reeds, a boardwalk with three lamp posts, drifting glowworms and lily pads. Mr. Hops may be on the boardwalk with his pole.
0. Lamps dark; glowworms only.
1. The boardwalk lamps glow green-gold. *Change: Mr. Hops lights them in turn.*
2. Flowers bloom in rows on the lily pads (pink, yellow, white). *Change: the buds open.*
3. The pond glows softly, with bright reflections. *Change: water pours in and the pond lights up.*
Loops: glowworms drifting, reeds swaying, ripples.

**Windy Ridge: bright windy day.** Green mountains with snowcaps, a cable car on a line, wind streaks, a flat picnic rock where Plume’s wagon is parked.
0. The cable car is wobbling at the bottom; Plume’s wagon waits.
1. The cable car is balanced and halfway up. *Change: a stone is swapped and the car rises.* (Story, October 10: the travelers' wagon is the car's cargo. The finished stills predate that; when these scenes are next redrawn, show the wagon riding up with the car.)
2. Plume’s wagon rattles away in a huff (dust trail); pebbles are left on the rock. *Change: Plume stomps off and drives away.*
3. Bright kites fly with long tails. *Change: the travelers launch the kites.*
Loops: wind in the grass and Billie’s scarf, kites tugging, clouds moving.

**Spooky Hollow: Halloween night.** Purple sky, a big moon, a crooked bare tree, rounded tombstones, a crypt door in a hill, a pumpkin patch, a few bats. Spooky-fun, never scary.
0. Pumpkins dark; the crypt door shut.
1. The jack-o’-lanterns are lit with orange glow. *Change: the faces flicker on.*
2. The crypt door creaks open on warm light. *Change: the door swings open; a bat flutters out.*
3. White chalk marks (stars and checks) on Rattle’s garden plots, which glow faintly. *Change: chalk lines draw themselves.*
Loops: flicker, bats, drifting mist.

**Old Workshop: cozy inside, rain outside.** A wooden workshop: a rain-streaked window, a big gear on the wall, a workbench, warm lamplight, and a hole in the floor.
0. The hole in the floor; the lamp dim.
1. The floor patched with new L-shaped tiles. *Change: the tiles slide into place.*
2. The new pump on the bench gurgling water. *Change: Sprocket cranks the pump and water spurts.*
3. Parts sorted on a turntable, the lamp bright, the gear turning. *Change: the turntable spins and the parts drop into slots.*
Loops: rain on the window, the gear ticking, the lamp flicker.
*Covered corner (October 24):* the current scenes put Sprocket in the top-right corner that Plume's card covers, so the game shows the card in the top-left, over the window, at this stop. A redraw should keep the top-right corner (about 30% × 18%) plain, with Sprocket lower or further left; the card then goes back to the top-right.

**Stormy Lighthouse: storm at night.** Dark storm clouds, lightning, big waves, a red-and-white lighthouse on rocks, a pier with three harbor lamps.
0. The lighthouse dark; lightning flashes.
1. A beam of light shines out of the mirror room. *Change: the light bounces and shoots out.*
2. The beacon turns, sweeping the beam across the bay. *Change: the gears catch and the beam swings.*
3. The harbor lamps are lit and a small boat is safe at the pier. *Change: the lamps light along the pier and the boat glides in.*
Loops: waves crashing, rain, the beam sweeping, an occasional lightning flash.

**The Lantern Fair: festive night.** A purple night with string lights, striped tents, a Ferris wheel and a prize booth.
0. String lights dim.
1. The prize booth lights up. *Change: the booth sign blinks on.*
2. All the stall paths are lit. *Change: the light runs along the strings.*
3. Fireworks. *Change: the first fireworks burst.*
Loops: the Ferris wheel turning, lights twinkling, fireworks.

**Finale (`finale/fair`).** Everyone at the fair under fireworks: the six travelers with their lantern tree, all six keepers, and Plume wearing a “good sport” ribbon. Loop: fireworks, waving, the Ferris wheel.

Under the picture each keeper says goodbye beside its `happy` portrait and Plume concedes beside his `oops` portrait (October 24), then the trail’s medal is awarded. The medal is drawn in code for now (a bronze, silver or gold disc on a red and blue ribbon, the colors of the map’s trail pips); if it wants art later, brief it as three 256×320 transparent stickers, one per trail, matching those pip colors.

**Map.** A cartoon world map: a winding road from the bright harbor through alternating bright and dark regions to the night fair. Each stop’s landmark sits under its mark. Wide and tall layouts are separate pictures with the same world. Loop ideas: water shimmer, glowworms, flags, lighthouse beam, fireworks over the fair.

### Keeper poses

| Pose | Loop or once | Motion |
|---|---|---|
| idle | loop 3–6 s | Breathing, blinking and one in-character habit: Snooze dozes (slow zzz); Mr. Hops polishes his pole; Billie’s scarf flaps; Rattle sways and clacks his jaw; Sprocket fiddles with a wrench; Wick blinks slowly as rain drips off his hat; Plume preens and fans his tail. |
| talk | loop 2–4 s | Speaking: mouth or beak moving, one small gesture. Plays only while a voice is heard (below). |
| happy | once 1.5–3 s, ending on the idle pose | Snooze stretches and smiles; Mr. Hops tips his hat; Billie hops and bleats; Rattle does a rattly jig; Sprocket tosses a wrench and catches it; Wick hoots and flaps once; Plume laughs smugly. |
| oops | once 1.5–3 s, ending on the idle pose | Snooze startles awake; Mr. Hops tuts; Billie laughs; Rattle jumps with a “boo!”; Sprocket ducks a clank; Wick tilts his head; Plume gapes, shocked. |

For Plume, `happy` is used when the player loses to him, and `oops` when the player beats him.

**When `talk` shows** (decided by Claude, October 23, 2026). `talk` means speaking now, and a mouth moves only while a voice is heard.

- A line that appears in the bubble (a puzzle's opening line, a hint, a locked side puzzle) is said once: the portrait shows the **talk still** for a beat about as long as the line takes to say (600 ms plus 350 ms a word, a `…` counting as a word, between 1.2 and 4.5 seconds), then settles to idle, whether or not the child has moved.
- While the line's recording or the browser voice plays (the opening line by itself when sound is on, any line on Listen), the portrait plays the **talk loop** from the moment the voice starts until it stops, then idle. The loop never plays without a voice: with sound off, before a recording loads and if it never starts, the talk still stands in for it.
- A mistake or a solve shows `oops` or `happy` first; the portrait talks for that line only when Listen plays it, and afterwards rests on idle rather than replaying the reaction. When K–1 reading plays the line by itself (from October 24), the reaction face stays while the voice is heard, so the face is not lost to the talk loop.
- Reduced motion shows the talk and idle stills at the same moments. The game cannot tell when a device's volume is down or muted, so there the loop plays unheard, for the length of the line and no longer.
- `dist/road-ui.js` (“The keeper's talk pose”) holds the timing; `tests/road.test.mjs` and `scripts/road-browser-smoke.mjs` check it.

**Brief for the idle and talk loops (not yet made).** Idle: as the table says, an endless rest that can run for minutes; keep its motion small. Talk: start from the talk still and loop the mouth or beak with one small gesture; it plays for one line at a time (about 1 to 5 seconds), cut short when the voice stops, and the game cuts straight to idle, so keep the gesture close to the still and avoid a big movement that would look interrupted. No sound in the video; the voice comes from the recordings in `docs/voice-casting/`.

## Making them

**Stills (ChatGPT images).** Use the style prompt + character or stop brief + stage + framing. Attach the relevant reference sheets and the placeholder from `artwork/road4/reference/`. Ask for the slot’s exact aspect (for example 1800×690 for scenes). For stickers, tools and travelers, ask for a **transparent background**.

Example scene prompt:

> [style prompt] Wide 1800×690 game scene, “Turtle Ferry”, bright morning harbor: turquoise sea, sandy beach, wooden dock with two unlit lanterns on the left. In the middle right a giant sleepy sea turtle with a wooden deck and three empty cargo cradles on her shell floats as a ferry, eyes closed, “zzz” bubbles. Six small traveler characters (see reference sheet) wait on the beach in the lower middle. Keep the lower-left corner simple ground and the top-right corner simple sky. Composition as in the attached placeholder.

Example keeper prompt:

> [style prompt] Square 512×512 portrait: head and shoulders of Rattle, a friendly theatrical skeleton gardener (see reference sheet) with a floppy purple hat and pumpkin-orange scarf, holding a little watering can, mischievous grin, centered, filling most of the frame, plain purple-night background.

**Videos (image to video).** Start from the finished still as the first frame. Lock the camera (no pan or zoom), add no new objects and no text, and keep the motion small and characterful.

- **Loops**: generate 6–8 s of ambient motion. `prepare-art.mjs loop` crossfades the ending into the start, so the loop does not jump.
- **Change clips**: chain the stages so each change ends on the next stage. Make stage 0’s still. Generate the change video from it with the change described. Extract its last frame with `node scripts/prepare-art.mjs lastframe change.mp4 stage1.png`, clean it up if needed, and use that as stage 1’s still and the start of the next change. If a chain drifts off-model, regenerate the clip rather than editing the code. Every stage now has its finished still, so instead give the tool both stills, as [batch 2](batches/02-scene-motion.md) describes.
- **Keeper reactions** start on the reaction still and end on the idle pose, so the reaction lands at once and the hand-off back to idle is invisible. [Batch 1](batches/01-keeper-reactions.md) has the details.

Example video prompt:

> Use the attached image as the first frame. Camera locked. The giant turtle slowly yawns, opens her eyes and begins to paddle; gentle wake ripples spread behind her; the six small travelers on her shell wobble and hold on. No new objects, no text. 3 seconds.

## Technical specs

- **Stills**: WebP, quality about 82, at the slot size. Transparent slots keep alpha. Budgets: scene 450 KB, map 1.2 MB, portrait 120 KB, sticker and icon 60–80 KB.
- **Videos**: MP4 (H.264, yuv420p, 24 fps, no audio, faststart), at most 1280 px wide. Budgets: scene loop or change 1.5 MB, keeper clip 400 KB, map 3 MB, finale 4 MB. Total art under 90 MB.
- `prepare-art.mjs` does all of this. To do it by hand: `ffmpeg -i in.mov -an -vf "scale=1280:-2,fps=24,format=yuv420p" -c:v libx264 -preset slow -crf 28 -movflags +faststart out.mp4` and `ffmpeg -i in.png -c:v libwebp -quality 82 out.webp`.
- **Manifest**: `{"scene/ferry/0": {"status": "ready", "image": "scene/ferry/0.webp", "video": "scene/ferry/0.mp4"}}`. Only `ready` entries are used, so a half-finished batch can sit as `todo`. Paths are relative to `dist/art/`.
- **Offline**: stills are part of the offline install (`npm run build` adds them). Videos are cached the first time they play online, then work offline. Until then, players see the still.
- iPad Safari autoplays only muted, inline video, which the game already sets. If a video does not play, the still shows.

## Order of work

Steps 0–4's stills were all made on October 3 (`artwork/road4/NOTES.md`): every one of the 90 slots then in the catalog has a finished still. What is left is motion, one batch at a time, each with its own brief:

0. Reference sheets: the six travelers, six keepers and Plume. Done.
1. Keeper portraits: `idle` and `talk` stills for all seven. Done.
2. Scenes: the four stage stills for each stop (28). Done.
3. Map (wide and tall), wagons, tools, travelers, finale. Done.
4. Keeper reactions: `happy` and `oops` stills (done), then clips: [batch 1](batches/01-keeper-reactions.md).
5. Scene loops and change clips, then map and finale loops: [batch 2](batches/02-scene-motion.md).
6. Stages for the ferry and the marsh, where four puzzles are now played in the picture: [batch 3](batches/03-stage-boards.md). Five new slots, placeholders until then.

Keeper `idle` and `talk` loops can now be briefed as their own batch: “When `talk` shows” and the loop brief under Keeper poses say how the game uses them. Family icons have a brief (below). The lantern tree and scenes and keepers for a second road come later, each with a brief from Claude.

After each batch: `node scripts/check-art.mjs`, `npm run build`, `npm test`, `node scripts/road-browser-smoke.mjs`, look in the app at phone and iPad sizes, and commit the art with its prompts in `artwork/road4/prompts.json` (prompt, tool, date, source file, slot).

## Region and family icons: brief (October 24)

From Claude, after the Puzzles library was grouped into regions ([docs/library.md](../library.md)). Nothing here is drawn yet, and no symbol was changed.

**Where they show.** Each family in Puzzles has a 43 px tile beside its name (on the From the road shelf and under its region), and the same mark on its Playground button. Today the tile holds a text symbol: `family.symbol` in each family's module, and `familySymbols` in `dist/caravan-ui.js` for the twelve base families. Region headings stay plain words: no region icon is wanted (the copy rules in `AGENTS.md`).

**What the check found.** No two families in one region share a symbol (`tests/library-parents.test.mjs` now keeps it so). But:

- Two symbols are shared across regions: ◐ is both Signal Lanterns (Codes and logic) and Cops and robbers (Maps and networks); ▦ is both Symbol Orchard (Codes and logic) and Garden fences (Counting and arranging).
- Five already mean something else to a child or a grown-up: ⌘ Knot colours (the Mac Command key), ▷ Take it or pass (a Play button), ≡ Paint rows (a menu button), ⧖ Mirror twins (an hourglass: "wait"), ♧ Bridge Courier (the clubs card suit, a pun on the card game).
- Look-alikes sit in the same region and blur at tile size: ⊠ ⊞ ⊡ (Portal shields, Glued squares, Area traps) and ⦾ ⊚ ◍ (Loop worlds, Octagon streets, Ball triangles) in Shapes and spaces; ▤ ▣ (Joining strips, Nesting cards) in Counting and arranging; ⊙ ⊜ ⊕ (Catch and mark, Sharing circles, Copying bags) in Chance and machines. ⇄ Cup swaps and ⇆ Ticket shuffles are mirror images, in different regions.
- Several are adult notation that pictures nothing on the board: ⊨ Who knows, ≀ Strands, ⋈ Stretch bands, ∏ Prime bags.
- ☀ (Lantern Wires) and ⚖ (Odd-pebble Balance) may draw as colour emoji on some iPads; not yet checked on one.

**Proposal.** A batch of family icons, one per family (80 today; a new family adds one), as art slots `family/<id>` of the existing `icon` shape (256 × 256, transparent, 60–80 KB). Claude adds the slots and the code that shows them in a separate commit before the batch; the text symbol stays as each slot's placeholder. Each icon is the board's own main object, in the boards' look (ink outline, sun and leaf fills, pine for the chosen thing), drawn to read at 28 px inside the tile, with no letters or numbers, and with a silhouette no other icon in its region shares. Start with the families above:

| Family | Region | Draw |
|---|---|---|
| Cops and robbers | Maps and networks | A cop's cap and a robber's mask on two dots of a road |
| Garden fences | Counting and arranging | A little fence round a shape of squares |
| Knot colours | Shapes and spaces | A trefoil loop in three colours |
| Take it or pass | Chance and machines | A hand passing a ticket along |
| Paint rows | Chance and machines | Two short rows of painted squares |
| Mirror twins | Patterns and symmetry | Two tetrahedra facing across a mirror line |
| Bridge Courier | Maps and networks | An arched bridge between two dots |
| Portal shields, Glued squares, Area traps | Shapes and spaces | A shield in a square room; a square with matching arrows on opposite edges; a shape with a grid inside and outside it |
| Loop worlds, Octagon streets, Ball triangles | Shapes and spaces | A loop inside a loop; an octagon of streets; a triangle on a ball |
| Joining strips, Nesting cards | Counting and arranging | Strips joined end to end; cards nested one inside another |
| Catch and mark, Sharing circles, Copying bags | Chance and machines | A net with one marked fish; a ring of cups sharing water; a bag beside its copy |
| Who knows, Strands, Stretch bands, Prime bags | Codes and logic; Shapes and spaces; Shapes and spaces; Numbers | Two faces with headbands; strands twisting round a cylinder; two bands crossing round pegs; a bag of counters |

The other families follow in their region's order, each showing what its board shows (the family's `docs/<id>/README.md` describes it). Until the icons arrive, a code lane may swap the two shared symbols as a stopgap if James wants: ⌖ for Cops and robbers and ⬚ for Garden fences (both unused, and unchecked in iPad fonts).

## Voices

[docs/voice-casting/README.md](../voice-casting/README.md) is the brief for casting and recording the six keepers and Plume. Each speech line in the game has a stable ID: `<encounter>/open|win|locked` for encounter lines (and `hollow-plots/stuck`, `marsh-garden/stuck|even` for the proof gardens' reactions, added October 24; the stuck tease shows the keeper's `happy` face; and `fair-final/gloat`, Plume's gloat when it wins a rematch game, added October 24 evening, with Plume's `happy` face), `ferry-seats/taunt` for Plume’s boast on the first scored board of each trail (one line for every trail since October 24: the card beside it shows the number), `<character>/oops-1…3`, `<character>/hint`, `snooze/nudge` (her first, free Hint, which names no place) and `plume/beat-1…3|tie-1…2|lose-1…2|gloat-1…2` for reactions, and `<keeper>/bye` and `plume/concede` for the finale’s goodbyes. Audio added to the manifest as `"voice/<line ID>": {"status": "ready", "audio": "voice/….mp3"}` plays when a child taps Listen and, for K–1, by itself: the opening lines the first time a puzzle opens, then each reaction, hint line, Plume verdict and goodbye as it appears (docs/ROAD.md, “K–1 hear the road”). The browser voice is the fallback.
