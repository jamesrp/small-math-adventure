# Saved progress across a deploy

A child's saves live in their browser. After a deploy the app reads them with the new puzzle pack, so a puzzle that changed (a new board, a changed deck, a removed position, a validator that wants a new field) can hold a saved attempt the new code no longer accepts.

## What happens on load

`loadStore` in `dist/storage.js`:

- A saved attempt that no longer matches its puzzle **starts afresh**. It keeps its star (`completed`) and help mark (`helpUsed`) when they are true or false, and `lastPlayed` when it is a valid time. The board, Undo history, moves and hint level start over. A road board keeps its star the same way, so the road and its stars read as before.
- An attempt at a puzzle id that no longer exists, or at a road board the trail has not reached, is left out.
- Before anything changes, the save is copied untouched to `small-math-adventure:before-repair:v1` (a preview uses its own key). The app shows one line, "Some puzzles changed and start fresh. Your stars are kept.", until its next save, which writes the repaired store. A later repair replaces the copy. If the device is too full to keep the copy, the stars still load; if a later save does not fit beside the copy, the copy is dropped first. Clear all local data and deleting an explorer remove it with the other save keys.
- Anything outside the attempts is as strict as before: the schema and content versions, the explorers' fields, the roads and the earlier stories. A problem there still makes the save unreadable, and the previous good save is tried next (repaired the same way if it needs it).
- The repaired store copies only the documented fields, through the same code as a strict read, and must pass the strict validator before it is used.
- Two optional explorer fields were added on October 24, 2026; a save without them reads as before. `readAloud` (true or false) is the Grown-ups read-aloud setting; without it an explorer hears each puzzle read aloud when they are K–1 or when the old `sound` setting is on. `importedAt` (a time) marks an explorer that came from a backup, so Grown-ups can tell a copy from the original; it is written by `importProfiles`. Any other type in either field makes the save unreadable, like the other explorer fields.

**Imports stay strict.** `parseBackup` refuses a backup file that holds an attempt the pack no longer accepts, and names the puzzle. An import is an explicit choice with an error shown before anything changes, so silently changing a file the grown-up chose seemed wrong; but it means a backup exported before a deploy can be refused after it. That is a decision for James (below).

A family that changes a deployed puzzle no longer needs to keep old boards readable to keep the store; it can still do so where unfinished progress matters, as Lamplighter's longer street does. The L-tromino gardens, Mirror Couriers and old Nim answers have their own migrations, which start afresh as the repair does.

## The check: `scripts/save-compat.mjs`

```sh
node scripts/save-compat.mjs           # make saves with the deployed build, then check them
node scripts/save-compat.mjs make      # only make them; RESUME=1 keeps chunks already made
node scripts/save-compat.mjs check     # check the saves already made
```

It extracts `origin/gh-pages` into `test-results/save-compat/deployed` (or uses `DEPLOYED_DIR`), serves it on port 4431 and this checkout's `dist/` on 4432 (`DEPLOYED_PORT`, `CURRENT_PORT`), and writes `test-results/save-compat/report.json`. `CURRENT_DIR` checks another build folder instead of `dist/`, such as `main` before a change. `TEST_FAMILY=chips,road` limits it to some chunks: a family module id, a base mechanic (`tile`, `swap`, `toggle`, …) or `road`. `SKIP_BROWSER=1` runs only the Node part. Playwright comes from `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` as in the other browser suites. It is not part of `npm test`; making the browser saves takes about an hour on a busy machine, the check a few minutes. Run `git fetch` first so `origin/gh-pages` is the live build.

**Saves made in a browser with the deployed app.** One explorer per chunk opens every puzzle in the satchel and saves it opened, after one Hint, after one to three applied hints, and solved where the hints can solve it. Then it reopens the puzzle (a solved one starts afresh, keeping its star) and presses up to eight of the board's own controls in a seeded random order, saving after each press, to reach the states hints never make: wrong moves, refused claims, Can't and That's all. The final save of each chunk is kept too.

**Saves made in Node with the deployed modules.** The same states for every puzzle, plus Undo, half way, one move from solved and Replay, made as the deployed `main.js` makes them. Each grade trail of the deployed road is played in order with its tools and side puzzles, and the explorer is saved part way through an encounter, after the first and eleventh encounters, and at the end.

**The check.** Each saved attempt goes alone into a store and through this checkout's `validateStore` (what an import does) and `loadStore` (what the app does); the reason is recorded for each that fails. Each chunk's final save, all of them in one explorer, and each road save also load in the current app in a browser, which is checked for the "could not be read" line and a missing explorer. The script exits non-zero if any save would still empty the store.

What it does not reach: boards that need a long run of a child's own moves, the earlier stories' archived road boards (57 in this pack), and saves from builds older than the one deployed.

## October 24, 2026: the October 11 deploy against main

The live build is `gh-pages` 6fe77e0 ("Deploy main b139244"): 988 satchel puzzles in 60 family modules and the twelve base mechanics, and 69 boards on the current road (23 encounters on each of three trails). It was checked against `main` at 916e7a4 (with Meeting roads and Gaps' fixes of the same day), first as it was and then with the repair, and again at caf7871 after the Glued squares, Portal shields, Strands and Ways out fixes merged.

- **Saves made:** 9,510 distinct attempts from the browser over all 988 puzzles (894 solved through hints; no puzzle hung), about 7,800 from Node (balance secrets are random), and 18 road explorers from the three trails (22 of the 23 encounters each, with tools and side puzzles; the final duel is not solved by hints). The final saves, one explorer holding every chunk's (988 attempts, 475 kB) and the road explorers all loaded in the current app in a browser: 91 loads.
- **Would have emptied the store, before the repair: none.** No saved attempt fails the strict validator on today's `main`, so the next deploy loses nobody's progress even without the repair. The lanes that changed deployed puzzles kept old boards readable.
- **The check sees the failures it is for.** With Lamplighter's longer street taken out of a scratch copy of `main` (what that family would be without the lane's hand-kept compatibility), the random presses had walked to −4 or 4 in Lamplighter 3 and 8. `main` without the repair then showed "Saved data could not be read" and no explorer; with the repair, those two puzzles start afresh with their stars and the app shows the calm line.

**What children will see after the next deploy**, by family:

| Family | Puzzles | What happens |
|---|---|---|
| Mirror Couriers (`billiard`) | billiard-01 to billiard-12 | Every saved attempt starts afresh, stars and help marks kept. This is the revision 2 rework of Week 9 (predict-and-launch menus became launches), migrated on purpose by `courierAttempt`, not by the new repair. |
| The road, Wick's lighthouse | road4-lighthouse-mirrors-k1, -23, -45 | The same Mirror Couriers migration: a solved lighthouse board shows afresh on a revisit; the encounter, its stars and the road are kept. |
| Every other deployed family | 976 satchel puzzles, 66 road boards | Unchanged: boards, Undo history and hints resume. |

No family's change loses a star: no deployed puzzle id is gone, and both the migration and the repair keep `completed`. Mirror Couriers was among the less-liked families in the October 5 playtest notes, which suggests (untested) that few children have unfinished boards there.

Re-run the check right before the deploy: lanes are still changing families today.

## For James to decide

- **Imports.** They stay strict: a backup exported before a deploy that changed one of its puzzles is refused whole, naming the puzzle (today none of the sampled deployed saves would be). Letting an import repair the same way, and say which puzzles start afresh, would make old backups always restorable.
- **The copy from before a repair** has no button: it sits in browser storage for a grown-up or a developer to export by hand, and is replaced by the next repair. A Grown-ups "save from before the update" export would make it usable.
- **The line** "Some puzzles changed and start fresh. Your stars are kept." shows on the first screen until the next save. A reload on a puzzle's own page saves at once, so the line is not seen there (the same as the other load warnings).
