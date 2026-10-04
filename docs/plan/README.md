# The horizontal push

A plan, October 4, 2026, for three tracks: (A) the app's story, UI, art, voice and video; (B) all 63 math-circle themes in the app; (C) a quality review of the 63. It also sets who does what across Claude, Codex and James. The theme-by-theme inventory is in [themes.md](themes.md). Nothing here has started.

## Where things stand

- **App.** Twelve mechanics with 222 puzzles, 17 proof puzzles, and Chip firing. The Lantern Road has seven stops and 21 encounters on three grade trails, with finished stills in all 90 art slots. There is no video and no recorded voice. No child has played the v4 road, the proofs or Chip firing.
- **Worksheets.** Weeks 1, 2 and 15 have been taught and work. Weeks 3–10 and 52–63 went through the tested writer, critic and reviser workflow. Weeks 11–51 were generated outside the repo; the October 4 review changed 6 of their 123 student PDFs. All but three themes are unpiloted.
- **Coverage.** Five themes are fully in the app (2, 8, 9, 10, 11) and six partly (1, 3–7). Weeks 18 and 62 share an object with an existing family. The other 50 have no presence.
- **Friction.** Adding Chip firing touched ten shared files (`main.js`, `ui.js`, `caravan-ui.js`, `index.html`, `sw.js`, `release.mjs` and browser suites). Fifty ports done that way in parallel would collide constantly.

## How we work

| Who | Owns |
|---|---|
| Claude | Product owner of the app: story, progression and stars, puzzle UI and mechanics, content packs and validators, UI copy, and the brief for every art slot and voice line. Worksheet reviews and revisions. |
| Codex | Art, animation, video and voice: files under `dist/art/` and `artwork/`, manifest entries, prompts and provenance, using its own tools (image and video generators, ElevenLabs). Never code, boards, lines or CSS, as `docs/art/ROADMAP.md` already says. |
| James | Testing with children, and the final word on story, quality and releases. A deploy happens only when he asks. |
| Dot, exe.dev | No lane until there is a specific job. One candidate: exe.dev hosting preview builds. |

- **A work board per repo.** `WORKBOARD.md` has one line per item: owner, branch and state. An agent claims an item by pushing that line to `main` before starting. A rejected push means someone else moved first, so fetch, re-read the board and choose again.
- **One item, one branch, one session,** under the integration rules already in both `AGENTS.md` files. A claimed item's files belong to its owner until it merges.
- **The critic is never the writer.** Where James agrees, the critic comes from the other model family (Codex reviews Claude's work and the reverse). The workflow's own README notes that its reviewer and judge shared the writer's model family.
- **Testers.** Every finished item arrives with a tester link and three things to watch for. A preview copy anywhere on `jamesrp.github.io` shares the live app's saves, and under the app's path its service worker too, so previews today need a hand-built Artifact. Giving preview copies their own save key, and keeping the live service worker out of their path, makes `…/preview/<item>/` safe.

## Track A: story, UI, art, voice and video

**Story** is my call as product owner; James can overrule it. It stays at the Zoombinis level: characters, pictures and consequences, with no narration.

- **Roads are chapters.** The Lantern Road is Road 1. Each new road has about seven stops and new keepers. It introduces families that have passed review and been played by children, and brings earlier families back harder, the way Zoombinis returns its puzzles. Plume stays the rival, and stars stay as they are.
- **The lantern tree is the progression.** Each family is one lantern on the tree the caravan hauls. Finishing that family's road puzzles lights it and stars brighten it. The tree doubles as the collection screen.
- **Tools are proof techniques.** The chalk already unlocks paint and star proofs. Each road earns one more tool that works on proof puzzles everywhere: a weight that always drops (chip firing, Nim), a string that pairs two sets (Catalan objects, matchings), a remainder lens (necklaces). Proofs arrive as arguments the child earns and then uses on new boards.
- **Grade trails.** New families are grade-free with Easy, Medium and Hard, as Chip firing is. Folding the three trails into one road waits until children have played.

**UI.** The satchel can't list sixty families, so group them into regions by kind of mathematics (games, tilings, networks, codes, counting, symmetry, chance), with an icon per family. Each family gets a few-second demo of its move on a board that isn't a puzzle, the app's version of the worksheets' "launch together" rule, so How to play can shrink. A reviewer who didn't write the screens runs a de-slop pass over all of them against the copy rules in `AGENTS.md`.

**Art, voice and video** go to Codex. Claude writes the brief and slot catalog for anything new; `check-art.mjs` and the road browser suite check every batch.

- Next for Road 1: keeper `happy` and `oops` stills and videos, then scene loops and change clips, as the ROADMAP orders them.
- The notes in `docs/voice-casting/` describe the old story, where the travelers spoke. In v4 the six keepers and Plume speak 85 lines. Claude rewrites the casting brief for seven voices; Codex auditions and records them.
- Later: scenes and keepers for new stops, region and family icons, the lantern tree.

## Track B: all 63 themes in the app

**Every theme gets a home:** its own family, a new group in an existing family, or a printable in the grown-ups area when no good app solve exists. "All 63" counts homes, not forced mechanics. A first pass rates 18 themes A (an existing mechanic or an obvious tap-or-drag solve), 37 B (a new mechanic with a clear, checkable solve) and 8 C (the substance is in paper, folding or measuring).

**First, a family seam.** Adding a family should touch only its own files and one registry line. `docs/ADDING-A-FAMILY.md`, written from the Chip firing work, sets what each port delivers: a spec (object, move, what counts as a solve, a checkable certificate for "can't"), 8–12 instances in Easy, Medium and Hard, a playground where natural, an independent validator, a browser run and a "Not yet done" list.

**Then waves**, three to five ports at once.

- **Wave 1** finishes partial themes inside their families: star drawing in Clockwork Gates (4), move menus in Pebble Duel (7), codebook design in Signal Lanterns (18) and first-fit order in Neighbor Lanterns (62). It also adds new families whose solve has two checkable sides: route packing with its cut (13), sorting networks (23), hidden pictures from row and column counts (25) and cheapest networks (53).
- **Wave 2** covers the rest of B. Themes that share an object share an engine: a triangle grid (1, the encore, 16), bead rings (33, 34), list-and-sort of equally likely cases (24, 42–45, 60, 63) and a graph editor (13, 39, 52, 53, 62).
- **Wave 3** decides each C theme: a printable, an animation (folding in 28 and cutting the Möbius band in 38 are good video work), or a rethink. Week 15 deserves a real attempt, perhaps with painted grid cells, because children liked it.

Weeks 29, 31 and 32 all land on gcd, which clocks, jugs and billiards already teach, so fold them in rather than duplicate them. A family goes onto a road only after children have played it.

## Track C: review the 63

**One review card per theme**, in the worksheets repo under `plans/review/`. It says whether a mathematician would enjoy the mathematics, how the student pages hold up against `AGENTS.md` and the approved Week 2 catalogs, the age fit, overlaps with other themes and the app fit. Its verdict is keep, revise, rework or merge. Cards come from the workflow's adversarial critic and math check, adapted to read existing packets.

- **Calibrate first** on Weeks 1, 2 and 15. A card that marks down the three themes children enjoyed is miscalibrated and gets fixed before the other sixty. (The Week 15 guide still says "unpiloted".)
- **Then** the wave-1 themes, whatever James will teach next, and the rest. The inventory already flags thin spots: the Caesar wheel in 4, Weeks 21, 45 and 50, and Week 36 at nine tiles.
- **Revisions** use the existing reviser stage, with James approving each.
- **App families get the same card.** Tile gardens were too easy for a five-year-old. "Find every one" puzzles that show a slot per answer, as Chip firing does, give away the count, which is the mathematics of knowing you have them all.

## First pieces of work

Items 1–3 can run at once.

1. **Work boards and ownership.** Add the table above and the claim rule to both `AGENTS.md` files and create both boards. Documentation only.
2. **Family seam and recipe,** with Chip firing moved onto the seam to show it works. `npm test`, `npm run build` and every browser suite must pass.
3. **Calibration review cards** for Weeks 1, 2 and 15, then cards for the wave-1 themes.
4. **Port wave 1** once items 2 and 3 have merged.
5. **Safe preview links** for testers.
6. **Codex handoff:** the Road 1 keeper reactions and the rewritten voice-casting brief.

## Decisions for James

My recommendation comes first in each.

- **Story:** roads as chapters with the lantern tree as progression, or a free map of regions.
- **Gating:** port a theme only after its review card, or port first and review in the app.
- **Cross-model critic:** Codex reviews worksheets and app copy, or Codex stays on art only.
- **Tower cities:** add Week 5's visibility clues as their own group, leaving Symbol Orchard pure, or leave them out as decided in September.
- **Dot and exe.dev:** no lane for now, or name a job.
