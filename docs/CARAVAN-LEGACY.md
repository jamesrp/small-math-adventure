> Historical version-one campaign. The current road is documented in [ROAD.md](ROAD.md). Counts and validation results below describe the earlier release.

# The Last Lantern Caravan

The Caravan takes over the main app experience while retaining the existing 132-puzzle catalog and its mathematical rules. No puzzle IDs, instances, solutions, hints, or revisions were changed for this campaign.

## The journey

Six companions carry a living lantern tree to a sheltered valley: Pip the moth, Moss the snail, Rook the navigator, Bea the beetle, Fern the gardener, and Tumble the pack carrier.

| Chapter | What changes | Existing puzzle families |
| --- | --- | --- |
| The ferry that snored | Light the landing, arrange the cargo, and wake the ferry | Lantern Wires, Cup Swaps, Clockwork Gates |
| The branching paths | Choose the reeds and meet Luma, or take the ridge and meet Bracken | Reeds: Bridge Courier, Symbol Orchard, Spring-water Jugs. Ridge: Mirror Couriers, Odd-pebble Balance, Pebble Duel |
| When the wind changed | Prepare a shelter; a storm separates the caravan into two safe camps | Neighbor Lanterns, Odd-pebble Balance, Clockwork Gates |
| A message across the mist | Help both camps send a signal, reunite, and find the valley | Mirror Couriers, Signal Lanterns, Bridge Courier |
| A place to put down roots | Plant a garden, build a hearth, and meet a new neighbor | Symbol Orchard, Tile Garden, Pebble Duel |
| The tree that found a home | Water, plant, and light the tree; see the caravan settle into its new home | Spring-water Jugs, Cup Swaps, Lantern Wires |

Both routes contain all twelve puzzle mechanics across the whole journey. The route changes three encounters and returns in later dialogue and the ending. Chapter locations, party composition, and journal memories reflect progress. Every encounter has a setup and a specific consequence. Mistakes and hints do not harm companions or reduce rewards.

## Playing and revisiting

- Create or select an explorer, start the journey, and continue the current encounter.
- A successful campaign solve records the encounter before showing its aftermath. Returning home or reloading does not lose that progress.
- A puzzle solved earlier opens for reattempting with a small Solved indicator. The saved achievement remains, and solving in the satchel does not advance the campaign.
- Revisit completed encounters from the route or journal on fresh boards, preserving the story and earlier completion. Unfinished attempts resume. Restart clears the current attempt immediately; balance attempts receive a newly randomized secret.
- Change puzzle trails at any time. An encounter already started retains its bound puzzle; future encounters use the newly chosen trail.
- The puzzle satchel retains the entire collection for free choice, including the alternate grade trails and all ten expansion families.
- Story text has an optional read-aloud control. Browser voice availability varies by device. All rules and story information remain visible as text.
- Puzzle play shows one concise objective and the board. Authored puzzle names stay in the catalog data and adult notes; repeated story setup and operational details are available through Story and How to play. Default encouragement and duplicated success messages are omitted.

## Saves and offline support

The optional `journey` field extends each existing schema-version-one profile. Profiles without this field retain their prior data without changes. It contains a story version, started flag, route, ordered completed-encounter IDs, and a mapping from encounter IDs to catalog puzzle IDs. Bindings remain stable across difficulty changes.

Validation rejects unknown or out-of-order encounters, invalid routes, inaccessible puzzle bindings, and completed encounters without a corresponding completed puzzle attempt. Backup import creates independent explorers, including their journeys. Original puzzle saves, hints, assistance, undo history, and completion remain under the existing validation and recovery rules.

The normal release command adds every campaign module, stylesheet, and illustration asset to the offline precache and hashes them into its version. Existing tabs must close before an installed service worker update takes over.

## Verification

Run `npm test` and `npm run build`. The campaign tests exercise every chapter, both branches, all three trails, save validation, older profiles, replay, remembered discoveries, difficulty changes, and imported explorers.

The optional `scripts/caravan-browser-smoke.mjs` exercises the actual app flow. The original browser suites remain available for broader puzzle controls and save behavior. Real iPad Safari voice, installation, and offline relaunch still require device verification; desktop viewport checks cannot establish those behaviors.

Verified in September 2026: all 95 unit tests and the release validation pass. Chromium completed both 18-encounter campaigns (including a complete offline journey), the original puzzle/save regression suite, and all 60 expansion puzzles through their actual UI controls and hints. Browser checks covered phone and iPad viewport sizes, reloads, profile isolation, imports, replay, and completion focus, with no browser errors.

`scripts/copy-browser-smoke.mjs` checks all 132 default puzzle screens for one objective, no visible puzzle names or duplicate instruction stacks, and no idle feedback. It captures the K–1 cup-swapping example on phone and tablet layouts for visual review. An independent adversarial review covered all twelve renderers and the player pages, followed by screenshot review.
