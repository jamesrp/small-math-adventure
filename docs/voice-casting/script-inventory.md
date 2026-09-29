# Current voice script inventory

This is an extraction of the working version-3 Lantern Road, including existing uncommitted story changes. Source hashes and exact clip text are in [script-inventory.json](script-inventory.json). Runtime files were not changed.

**Cast for a character production: 7 voices — narrator, Pip, Moss, Rook, Bea, Fern, Tumble.** The existing script itself only requires one narrator: its 36 story lines are third-person narration, and speaker metadata is not used by playback. Distinct character voices need an intentional dialogue/adaptation decision. In particular, Tumble’s intro currently says “Tumble has a pebble game for the rest stop.”

| Existing read-aloud content | Unique clips | Characters | Words |
| --- | ---: | ---: | ---: |
| 18 encounter intros + 18 consequences | 36 | 1429 | 242 |
| Puzzle objective + controls | 50 | 7934 | 1505 |
| Total | 86 | 9363 | 1747 |

The 50 instruction clips cover all 192 catalog puzzles and 54 road definitions; the road alone uses 31. Story does not multiply across grade trails. Counts include punctuation but no inter-clip separators; words are whitespace-delimited. They are script counts, not billing or duration estimates.

| Character | Identity | Encounters | Story clips by metadata | Optional audition quote |
| --- | --- | ---: | ---: | --- |
| Pip | moth; Keeper of little lights | 2 | 4 | I am checking the dark. From over here. |
| Moss | snail; Camp cook | 3 | 6 | We have time for one small enormous cup. |
| Rook | bird; Navigator | 3 | 6 | Exactly where I expected us to be. More or less. |
| Bea | beetle; Builder and fixer | 5 | 10 | That told us something. Let’s try the next idea. |
| Fern | seedling; Tree tender | 3 | 6 | A little care can grow into a very big thing. |
| Tumble | puff; Carrier of important things | 2 | 4 | I brought a spare. A spare what? We’ll find out. |

These six quotes remain authored identity material in [caravan-legacy.js](../../dist/caravan-legacy.js#L3), but are **not displayed or spoken in the current companion view**. They are audition material, not additional production lines. Current biographies are also unvoiced. Luma, Bracken, the speaking ferry, and the Keeper are historical material and do not increase the current cast.

## Current story text

| Encounter | Speaker metadata | Intro | Consequence |
| --- | --- | --- | --- |
| Sleepy Ferry / Cargo cradles | Fern | The tree travels in the ferry’s cargo cradles. | The tree is aboard. |
| Sleepy Ferry / Departure bell | Rook | The ferry’s departure bell is stopped. | The ferry crosses the water. |
| Sleepy Ferry / Landing lights | Pip | The landing’s lamps share their wires. | The ferry landing is lit. |
| Reed Marsh / Reed paths | Moss | Each marsh path needs a lantern. | Lanterns mark the reed paths. |
| Reed Marsh / Lantern beds | Fern | The marsh lanterns grow in rows of different seeds. | The lantern beds are planted. |
| Reed Marsh / Garden water | Bea | The lantern beds need water from these measuring tanks. | The marsh garden lights up. |
| Windy Ridge / Cable weights | Bea | One of the cable’s balancing stones has the wrong weight. | The cable carries everyone to the ridge. |
| Windy Ridge / A game with Tumble | Tumble | Tumble has a pebble game for the rest stop. | The game is finished; the friends pack up. |
| Windy Ridge / Ridge lanterns | Rook | Linked ridge lanterns need different colors to tell the paths apart. | The ridge lanterns are lit. |
| Old Workshop / Floor tiles | Tumble | The tree’s trolley needs a repaired workshop floor. | The trolley rolls inside. |
| Old Workshop / Supply cupboard | Bea | The spare lanterns are in the locked cupboard. | The supply cupboard opens. |
| Old Workshop / Lantern cradles | Moss | The workshop’s lanterns belong in their matching cradles. | The workshop windows glow. |
| Lighthouse / Mirror room | Pip | The lighthouse sends light through a room of mirrors. | Light reaches the beacon. |
| Lighthouse / Beacon gears | Bea | The beacon’s turning gear has stopped. | The beacon turns across the bay. |
| Lighthouse / Harbor lamps | Rook | The harbor lamps share the lighthouse’s wires. | The lighthouse and harbor are lit. |
| Clockwork Citadel / Lantern rounds | Moss | Each citadel street needs a lantern. | Lanterns hang along every street. |
| Clockwork Citadel / Courtyard fountain | Bea | Water balances the courtyard fountain’s lift. | The fountain carries the tree into the square. |
| Clockwork Citadel / Square lanterns | Fern | Linked square lanterns need different colors to mark the streets. | The citadel is lit; the whole lantern road is open. |

All current story text comes from [caravan.js](../../dist/caravan.js#L11). [road-art.js](../../dist/road-art.js#L84) selects intro or success for Story → Listen. [main.js](../../dist/main.js#L137) constructs instruction narration and [main.js](../../dist/main.js#L144) reads story text. Character biographies are selected in [caravan-ui.js](../../dist/caravan-ui.js#L49).

The visible opening (“Carry the lantern tree along the road. Light every stop.”) and map finale (“The lantern road is lit.”) have no active Listen control and are excluded from the 86-clip total. The JSON records them separately. Adding them would be a deliberate small extension, not required replacement coverage.

## Deduplicated instruction text

Each exact full reading below includes the objective and controls. The JSON maps every reading to catalog/road puzzle IDs, the source-code functions, and the canonical instance’s JSON pointer.

- **instructions.001** (tile): Cover every square with dominoes. Drag across two neighboring empty squares, or tap them in either order. Tap a placed domino to lift it.
- **instructions.002** (tile): Cover every square with L-trominoes. Drag across three empty squares forming an L, or tap those squares in any order. Tap a placed tile to lift it.
- **instructions.003** (swap): Match the cups to the letters. Tap two cups to swap them. Only the listed pairs can swap.
- **instructions.004** (toggle): Match the goal card. Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.
- **instructions.005** (toggle): Match the goal card in at most 2 presses. Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.
- **instructions.006** (toggle): Match the goal card in at most 3 presses. Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.
- **instructions.007** (toggle): Match the goal card in at most 4 presses. Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.
- **instructions.008** (toggle): Match the goal card in at most 6 presses. Tap a wire to flip both lanterns at its ends. With a keyboard, Tab to a wire and press Enter or Space.
- **instructions.009** (clock): Find the first bell that lands the marker on its star. Enter a bell count, then Ring. Each bell moves every marker. Bell zero is the starting position; passing over a star does not count.
- **instructions.010** (clock): Return to the star for the first time on bell 4. Choose a fixed jump, then Ring. Bell zero is the starting position; passing over a star does not count.
- **instructions.011** (clock): Find the first bell that lands every marker on its star. Enter a bell count, then Ring. Each bell moves every marker. Bell zero is the starting position; passing over a star does not count.
- **instructions.012** (clock): Return to the star for the first time on bell 5. Choose a fixed jump, then Ring. Bell zero is the starting position; passing over a star does not count.
- **instructions.013** (billiard): Predict the first corner and the wall bounces before it. Choose the corner and bounce count, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.014** (billiard): Reach the top right corner first, after exactly 2 bounces. Choose the room width, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.015** (billiard): Reach the bottom right corner first, after exactly 3 bounces. Choose how far to aim up and right, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.016** (billiard): Reach the top right corner first, after exactly 4 bounces. Choose how far to aim up and right, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.017** (billiard): Reach the bottom right corner first, after exactly 3 bounces. Choose the room width, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.018** (billiard): Reach the top right corner first, after exactly 6 bounces. Choose how far to aim up and right, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.019** (billiard): Reach the top left corner first, after exactly 5 bounces. Choose the room width, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.020** (billiard): Reach the top right corner first, after exactly 8 bounces. Choose how far to aim up and right, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.021** (billiard): Reach the bottom right corner first, after exactly 9 bounces. Choose how far to aim up and right, then Launch. Walls reflect the light; the first corner stops it.
- **instructions.022** (route): Walk every road exactly once. Tap a labeled junction to follow a road; crossings are not junctions. You may revisit junctions.
- **instructions.023** (route): Walk every road once, returning to B. Tap a labeled junction to follow a road; crossings are not junctions. You may revisit junctions.
- **instructions.024** (route): Cover every road and return to S in exactly 8 steps. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.025** (route): Cover every road and return to A in exactly 12 steps. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.026** (route): Cover every road and return to A with total distance 22. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.027** (route): Walk every road once, returning to A. Tap a labeled junction to follow a road; crossings are not junctions. You may revisit junctions.
- **instructions.028** (route): Cover every road and return to A in exactly 16 steps. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.029** (route): Cover every road and return to A with total distance 17. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.030** (route): Cover every road and return to A with total distance 28. Tap a labeled junction to follow a road; crossings are not junctions. Repeated roads add to the distance.
- **instructions.031** (color): Color every lantern so linked pairs differ. Choose a color or shape, then tap a lantern. Crossings do not add links.
- **instructions.032** (latin): Use 1–2 once in every row and column. Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.
- **instructions.033** (latin): Use 1–3 once in every row and column. Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.
- **instructions.034** (latin): Use 1–4 once in every row and column. Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.
- **instructions.035** (latin): Use 1–5 once in every row and column. Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.
- **instructions.036** (latin): Use 1–6 once in every row and column. Tap a square, then a number to mark it. Dark squares are fixed. Clear erases the selected square. You can also type numbers or press Delete.
- **instructions.037** (code): Find a code that fits every recorded match count. Tap each lantern to set 0 or 1, then Check. A match is the same symbol in the same position.
- **instructions.038** (nim): Take the last pebble to win. Take any positive number from one pile. The opponent replies automatically. Take the last pebble to win. Undo takes back your move and the reply.
- **instructions.039** (jug): Leave exactly 1 unit in either jug. Fill or empty a jug, or pour between jugs. A pour stops when its source is empty or its destination is full.
- **instructions.040** (jug): Leave exactly 4 units in either jug. Fill or empty a jug, or pour between jugs. A pour stops when its source is empty or its destination is full.
- **instructions.041** (jug): Leave exactly 2 units in either jug. Fill or empty a jug, or pour between jugs. A pour stops when its source is empty or its destination is full.
- **instructions.042** (jug): Leave 4 units in A, 4 units in B, and none in C. Pour between jugs; no water can be added or removed. A pour stops when its source is empty or its destination is full.
- **instructions.043** (jug): Leave 5 units in A, 5 units in B, and none in C. Pour between jugs; no water can be added or removed. A pour stops when its source is empty or its destination is full.
- **instructions.044** (jug): Leave 3 units in A, 2 units in B, and 4 units in C. Pour between jugs; no water can be added or removed. A pour stops when its source is empty or its destination is full.
- **instructions.045** (jug): Leave 2 units in A, 4 units in B, and 4 units in C. Pour between jugs; no water can be added or removed. A pour stops when its source is empty or its destination is full.
- **instructions.046** (jug): Leave 6 units in A, 6 units in B, and none in C. Pour between jugs; no water can be added or removed. A pour stops when its source is empty or its destination is full.
- **instructions.047** (weigh): Find the heavy pebble in at most 1 weighing. Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.
- **instructions.048** (weigh): Find the heavy pebble in at most 2 weighings. Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.
- **instructions.049** (weigh): Identify the odd pebble and whether it’s heavy or light, using at most 2 weighings. Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.
- **instructions.050** (weigh): Identify the odd pebble and whether it’s heavy or light, using at most 3 weighings. Place pebbles Left, Off, or Right. Put equal numbers on both pans, then Weigh. An answer must be the only possibility left by the observations.
