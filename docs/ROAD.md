# The Lantern Road (version 4)

The road is a race to the Lantern Fair. Six travelers haul their lantern tree along seven stops. A keeper sets the puzzles at each stop. Plume, a show-off peacock, leads a rival caravan one stop ahead and leaves a score to beat. There is no plot or villain. The road has stars, a rival, two earned tools, two side puzzles to come back for, and a finale.

Design decisions, October 2026 (James and Claude):

- Characters live inside the puzzles. Keepers and Plume speak one short line when a puzzle opens and react to what the player does: a mistake, a hint, a solve. They never restate rules. Those stay on the board and in How to play.
- The six travelers are a fixed party. They are the pieces in the ferry's seating puzzle and otherwise appear in the scenes, busy at each stop. They do not speak.
- There is no losing. The tension comes from Plume's scores and from stars. Keepers never join the caravan.
- The travelers' wagon goes the whole way. It rides across on Snooze's shell, at the stern behind the deck, and goes up Windy Ridge as the cable car's cargo, which is what Billie's stones balance (decided October 10).
- Art is bright and saturated, with dark stops mixed in (night marsh, Halloween hollow, stormy lighthouse, night fair) the way Bloons TD varies its maps. Art is made separately; see [art/ROADMAP.md](art/ROADMAP.md).

## Stops

| # | Stop | Mood | Keeper | Puzzles (in order) |
|---|---|---|---|---|
| 1 | Turtle Ferry | bright morning | Snooze, a sleepy ferry turtle | Seats on the shell (cup swaps, with the travelers as the pieces) · Wake-up bell (clock) · Landing lamps (lantern wires) |
| 2 | Glowworm Marsh | night glow | Mr. Hops, a fussy frog lamplighter | Boardwalk lamps (route) · Lily pads (Latin square) · Pond water (jugs) |
| 3 | Windy Ridge | bright, windy | Billie, a loud goat | Cable-car stones (balance) · **Pebbles with Plume** (Nim against the rival) · Kites (coloring) |
| 4 | Spooky Hollow | Halloween | Rattle, a theatrical skeleton gardener | Pumpkin patch (lantern wires) · Crypt door (signal code) · **The garden nobody covered** (a proof garden; earns the **chalk**) |
| 5 | Old Workshop | rainy, warm inside | Sprocket, a raccoon inventor | Floor patch (L-trominoes) · **The new pump** (jugs with Fill/Empty; earns the **pump**) · Turntable parts (hub swaps) |
| 6 | Stormy Lighthouse | storm at night | Wick, a calm owl | Mirror room (billiards) · Beacon gears (clock) · Harbor lamps (lantern wires) |
| 7 | The Lantern Fair | festive night | Billie, Mr. Hops and Plume return | Prize booth (balance) · Every stall (route) · **Plume’s rematch** (the proof duel: choose who starts, three wins in a row against perfect play) |

All twelve catalog mechanics appear, plus a proof garden and the proof duel. The board for each encounter on each trail is listed in `dist/road.js` (`STOPS`, by catalog ID). Lines are in `dist/road.js` (per encounter) and `dist/road-cast.js` (per character).

### Side puzzles and tools

Two optional side puzzles appear on the map as soon as their stop is reached, before the tool that solves them exists:

- **Snooze’s bath** (Turtle Ferry) is a pair of jugs that can only pour into each other, so the target is unreachable: pouring alone only trades between two states. After the **pump** from the Old Workshop, Fill and Empty appear and it can be solved. These are new instances: K–1 4/3 → 2, 2–3 5/3 → 4, 4–5 9/4 → 6. Each was checked to be impossible by pouring and solvable with the pump (5, 5 and 7 moves).
- **The other garden** (Glowworm Marsh) is an uncoverable garden. Before the **chalk** from Spooky Hollow, Prove it can’t is locked. After it, the garden can be proved. In 2–3 it is the 6×6 board, and the Checker shortcut is earned by the painted proof at the Hollow. In 4–5 it is the “shared partner” garden, where the colors balance, so paint cannot work and a star proof is needed after painting at the Hollow.

Side puzzles never advance the road.

### Plume and stars

Each road puzzle gives up to three stars: **solved**, **no hints** (no Hint pressed in this play) and **beat or tied Plume**. The third star exists only where the family has a natural count:

| Family | Plume’s number counts | Best possible |
|---|---|---|
| Cup swaps | swaps | the minimum number of swaps |
| Lantern wires | presses | the fewest presses (search) |
| Jugs | fills, empties and pours | the fewest steps (search) |
| Tile gardens | placements and lifts | number of tiles |
| Routes | distance walked | the shortest walk over every road (search) |
| Latin squares | marks and erasures | number of blanks |
| Coloring | color changes | number of lanterns |
| Clock, billiards, signal code | rings, launches, checks | 1 (predict, then act) |

Undo takes a move off the count. Road routes may walk a road more than once, and any walk that covers every road lights the lamps (up to three times the shortest), so the shortest walk is the count to beat: an Euler trail where one exists, otherwise the shortest walk that repeats as little as possible. Balances already fix their budget, and games and proofs have no count, so they top out at two stars. Plume’s lead shrinks along the road: optimum + 2 at the first two stops, + 1 in the middle and exactly optimal from the lighthouse on, where only a perfect solve ties. Prediction puzzles shrink the same way (3, 2, 1 tries). A press budget caps Plume’s number. The best stars per encounter are kept, and replays can only raise them.

Plume waits at Windy Ridge for the pebble game (regular Nim: the opponent answers with a winning move when it has one and a random move otherwise) and at the fair for the rematch against perfect play.

### Grade trails

Each grade trail (K–1, 2–3, 4–5) is its own run of the road with its own progress, stars and tools. Switching the puzzle level switches trails. A stop shows a pip for every trail that has lit it, and the finale offers the next trail.

## Screens

- **Header**: the explorer's name with the grade trail beside it (switching it switches trails), and three tabs: Road, Puzzles and Journal.
- **Map**: one picture of the road in two layouts, wide (1000:420) and tall for phones (600:900). It shows no place names. Each stop is a tappable region over its landmark (`MAP_REGIONS`), and the next stop's region glows, more strongly on hover. A reached region shows its stars and trail pips. The map also shows the travelers’ wagon at the current stop, Plume’s wagon one stop ahead, side-puzzle badges with a lock until their tool, and the tools earned and star total in the top-right corner. A finished stop opens a sheet listing its puzzles with stars and Replay.
- **Road puzzle**: a scene shows the stop at its current stage (0–3 puzzles solved). The Turtle Ferry's three puzzles and the marsh boardwalks are instead played inside a **stage**, the stop seen from above and in front, with the pieces in the picture (`dist/road-stage.js`): the travelers sit in their seats on Snooze's deck and are tapped to swap (pair buttons below); the bell hangs at her bow over one or two big bell wheels, the bell count is tapped on a number chart below and the bell itself rings; the lamps stand on the deck's rim or a lamp tree and their ropes are tapped; Hops walks the boardwalks from junction to junction, lighting each walk's lamp. Travelers glide between seats. Each stage fits the screen without scrolling (a 4:3 middle crop on phones, the bow alone for the bell). The keeper’s portrait overlaps its bottom edge, with the speech bubble beside it under the picture, so the art stays clear. Listen reads the line aloud. Plume’s card shows where there is a score. The board is below. On a solve, a strip shows this play’s stars and what each was for, any tool earned, Next and Replay. Dark stops darken the page around a light board.
- **Finale**: the fair picture, the star total and which trails are finished.

Every picture is an art slot with a drawn placeholder (`dist/road-placeholders.js`) until finished art is marked ready in `dist/art/manifest.json` (`dist/art.js`, `dist/art-slots.js`).

## Saves

`profile.journey` is `{version: 4, trails: {k1|23|45: {started, completed: [main encounter IDs in order], side: [side IDs], stars: {encounterId: 1–3}}}}`. Road boards are campaign copies with IDs `road4-<encounter>-<band>`. They never share a save with the library. Tools are derived from `completed`, so they cannot be forged separately. Storage validates order, side puzzles (stop reached and tool earned), star ranges, a completed board for every completed encounter, and that every saved road board belongs to an encounter its trail has reached.

Earlier stories stay readable: a version-3 journey moves to `profile.roadJourney` (validated by the frozen `dist/caravan-road3.js`), alongside the version-1 `caravanJourney` and version-2 `rescueJourney`. Their boards stay in the catalog for validation and appear in the Journal under “Earlier …”.

## Files

| File | Contents |
|---|---|
| `dist/road.js` | Stops, encounters, side puzzles, tools, campaign boards, Plume’s scores, stars, progress and validation |
| `dist/road-cast.js` | Keepers, Plume and their reaction lines; the six travelers |
| `dist/road-ui.js` | Map, scene banner, solved strip, stop sheets, journal and finale |
| `dist/road-stage.js`, `dist/stage-placeholders.js` | Stages: the four puzzles played inside the picture, and their drawn backdrops |
| `dist/road-placeholders.js` | Drawn placeholders for every art slot, plus the map stop positions and regions |
| `dist/art.js`, `dist/art-slots.js`, `dist/art/manifest.json` | Art slots: catalog, manifest loading, video hand-off and reuse across renders |
| `dist/road.css`, `dist/boards.css` | Road layout and moods; the shared look of all puzzle boards |
| `dist/caravan-road3.js` | Frozen version 3, for archived saves |
| `tests/road.test.mjs`, `tests/caravan.test.mjs` | Road logic and archives |
| `scripts/road-browser-smoke.mjs` | Every encounter on every trail through the interface, side puzzles, finale, migrations, art slots |
| `scripts/caravan-browser-smoke.mjs` | Saves around the road through the interface: Undo, reload, locked solved boards, free play beside the road, offline, Journal replay, backups with the earlier stories |
| `scripts/check-art.mjs`, `scripts/prepare-art.mjs`, `scripts/export-art-references.mjs` | Art checks, conversion and composition references |
| `scripts/road-art-preview.mjs` | Screenshots of the map at four points along the road, every stop’s opening scene and the finale, on phone, tablet and desktop, for reviewing art by eye |

## Verification

`npm test` plays all three trails to the fair and checks stars, Plume’s scores against each instance’s optimum, side-puzzle locks, trail independence, forged saves and the archives. `npm run build` validates every non-proof road board by its hints. Proof boards are validated with their sources. `node scripts/road-browser-smoke.mjs` plays the road through the interface (K–1 on a phone, 2–3 on a tablet, 4–5 on a desktop), and `node scripts/caravan-browser-smoke.mjs` checks its saves there.

Not yet checked on an iPad, and no child has played it. Family playtesting should look at pacing, whether Plume’s scores feel fair, and whether the side puzzles are found.
