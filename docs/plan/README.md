# The horizontal push

A plan, October 4, 2026, for three tracks: (A) the app's story, UI, art, voice and video; (B) all 63 math-circle themes in the app; (C) a quality review of the 63. It also sets who does what across Claude, Dot/Codex and James. The theme-by-theme inventory is in [themes.md](themes.md). James reviewed it on October 5; his decisions are folded in and listed at the end.

## Where things stand

- **App.** Twelve mechanics with 222 puzzles, 17 proof puzzles, and Chip firing. The Lantern Road has seven stops and 21 encounters on three grade trails, with finished stills in all 90 art slots. There is no video and no recorded voice. No child has played the v4 road, the proofs or Chip firing.
- **Worksheets.** Weeks 1, 2 and 15 have been taught and work. Weeks 3–10 and 52–63 went through the tested writer, critic and reviser workflow. Weeks 11–51 were generated outside the repo; the October 4 review changed 6 of their 123 student PDFs. All but three themes are unpiloted.
- **Coverage.** Five themes are fully in the app (2, 8, 9, 10, 11) and six partly (1, 3–7). Weeks 18 and 62 share an object with an existing family. The other 50 have no presence.
- **Friction.** Adding Chip firing touched ten shared files (`main.js`, `ui.js`, `caravan-ui.js`, `index.html`, `sw.js`, `release.mjs` and browser suites). Fifty ports done that way in parallel would collide constantly.

## How we work

| Who | Owns |
|---|---|
| Claude | Product owner of the app: story, progression and stars, and the brief for every art slot and voice line. The preferred author of front-end work, especially puzzle UI. |
| Dot/Codex | Art, animation, video and voice: files under `dist/art/` and `artwork/`, manifest entries, prompts and provenance, using its own tools (image and video generators, ElevenLabs). |
| Any agent | Game logic, validators, content packs and other internals; worksheet work; reviews of anything. |
| James | Testing with children, and the final word on story, quality and releases. A deploy happens only when he asks. |

exe.dev has no lane.

- **A work board per repo.** `WORKBOARD.md` has one line per item: owner, branch and state. An agent claims an item by pushing that line to `main` before starting. A rejected push means someone else moved first, so fetch, re-read the board and choose again.
- **One item, one branch, one session,** under the integration rules already in both `AGENTS.md` files. A claimed item's files belong to its owner until it merges.
- **Reviews.** Any model can review anything.
- **Testers.** Every finished item arrives with a tester link and three things to watch for. A preview copy anywhere on `jamesrp.github.io` shares the live app's saves, and under the app's path its service worker too, so previews today need a hand-built Artifact. Giving preview copies their own save key, and keeping the live service worker out of their path, makes `…/preview/<item>/` safe.

## Track A: story, UI, art, voice and video

**Story** stays at the Zoombinis level: characters, pictures and consequences, with no narration. James approved roads as chapters on October 5.

- **Roads are chapters.** The Lantern Road is Road 1. Each new road has about seven stops and new keepers. It introduces families that have passed review and been played by children, and brings earlier families back harder, the way Zoombinis returns its puzzles. Plume stays the rival, and stars stay as they are.
- **The lantern tree is the progression.** Each family is one lantern on the tree the caravan hauls. Finishing that family's road puzzles lights it and stars brighten it. The tree doubles as the collection screen.
- **Tools are proof techniques.** The chalk already unlocks paint and star proofs. Each road earns one more tool that works on proof puzzles everywhere: a weight that always drops (chip firing, Nim), a string that pairs two sets (Catalan objects, matchings), a remainder lens (necklaces). Proofs arrive as arguments the child earns and then uses on new boards.
- **The satchel stays,** with every puzzle playable on its own, so any family can be tried before it has a place on a road.
- **Grade trails.** New families are grade-free with Easy, Medium and Hard, as Chip firing is. Folding the three trails into one road waits until children have played.

**UI.** The satchel can't list sixty families, so group them into regions by kind of mathematics (games, tilings, networks, codes, counting, symmetry, chance), with an icon per family. Each family gets a few-second demo of its move on a board that isn't a puzzle, the app's version of the worksheets' "launch together" rule, so How to play can shrink. A reviewer who didn't write the screens runs a de-slop pass over all of them against the copy rules in `AGENTS.md`.

**Art, voice and video** go to Dot/Codex. Claude writes the brief and slot catalog for anything new; `check-art.mjs` and the road browser suite check every batch.

- Next for Road 1: keeper `happy` and `oops` stills and videos, then scene loops and change clips, as the ROADMAP orders them.
- The notes in `docs/voice-casting/` described the old story, where the travelers spoke. In v4 the six keepers and Plume speak 85 lines; the casting brief for those seven voices is now `docs/voice-casting/README.md`, and Dot/Codex auditions and records them.
- Later: scenes and keepers for new stops, region and family icons, the lantern tree.

## Track B: all 63 themes in the app

**Every theme gets something in the app, but nothing is ported wholesale.** A worksheet is a loose analogy: for its mathematical object, ask what would be interesting to do with it on a screen. Interacting with the object is the fun, sometimes with a prediction. Children have most enjoyed cup swaps, Lantern Wires, the odd-pebble balance, tile gardens (especially with L-trominoes), Nim, Bridge Courier, Signal Lanterns and water jugs, where they click around to solve a puzzle. Mirror Couriers and Clockwork Gates, which are mostly "predict something", were less fun and may be reworked later. A new family can be its own family or a new group in an existing one.

A first pass rates 18 themes A (an existing mechanic or an obvious tap-or-drag solve), 37 B (a new mechanic with a clear, checkable solve) and 8 C (the worksheet's substance is in paper, folding or measuring).

**First, a family seam.** Adding a family should touch only its own files and one registry line. `docs/ADDING-A-FAMILY.md`, written from the Chip firing work, sets what each port delivers: a spec (object, move, what counts as a solve, a checkable certificate for "can't"), 8–12 instances in Easy, Medium and Hard, a playground where natural, an independent validator, a browser run and a "Not yet done" list.

**Then waves**, three to five ports at once. A theme is ported after its review card. The goal is code complete on all 63, followed by one agentic review pass over everything; any family can be cleaned up or removed afterwards.

- **Wave 1** finishes partial themes inside their families: star drawing in Clockwork Gates (4), move menus in Pebble Duel (7), codebook design in Signal Lanterns (18) and first-fit order in Neighbor Lanterns (62). It also adds new families whose solve has two checkable sides: route packing with its cut (13), sorting networks (23), hidden pictures from row and column counts (25) and cheapest networks (53).
- **Wave 2** covers the rest of B. Themes that share an object share an engine: a triangle grid (1, the encore, 16), bead rings (33, 34), list-and-sort of equally likely cases (24, 42–45, 60, 63) and a graph editor (13, 39, 52, 53, 62).
- **Wave 3** covers the C themes, which need the most invention: something to do with the object on a screen, such as folding (28), cutting a Möbius band (38) or drawing routes on a globe (61). Week 15 deserves a real attempt, perhaps with painted grid cells, because children liked it.

Weeks 29, 31 and 32 all land on gcd, which clocks, jugs and billiards already teach, so fold them in rather than duplicate them. A family goes onto a road only after children have played it.

## Track C: review the 63

**One review card per theme**, in the worksheets repo under `plans/review/`. It says whether a mathematician would enjoy the mathematics, how the student pages hold up against `AGENTS.md` and the approved Week 2 catalogs, the age fit, overlaps with other themes and the app fit. Its verdict is keep, revise, rework or merge. Cards come from the workflow's adversarial critic and math check, adapted to read existing packets.

- **Calibrate first** on Weeks 1, 2 and 15. A card that marks down the three themes children enjoyed is miscalibrated and gets fixed before the other sixty. The Week 15 guide still says "unpiloted"; mark it piloted.
- **Then** the wave-1 themes, whatever James will teach next, and the rest. The inventory already flags thin spots: the Caesar wheel in 4, Weeks 21, 45 and 50, and Week 36 at nine tiles.
- **Revisions** use the existing reviser stage and don't wait for James's approval. Ports come first; worksheet revisions can follow the agentic review pass.
- **App families get the same card.** A family can stay while its difficulty changes: tile gardens with only dominoes were too easy for a five-year-old, but L-trominoes made them fairly hard. "Find every one" puzzles that show a slot per answer, as Chip firing does, give away the count, which is the mathematics of knowing you have them all.

## First pieces of work

Items 1–3 can run at once.

1. **Work boards and ownership.** Add the table above and the claim rule to both `AGENTS.md` files and create both boards. Documentation only.
2. **Family seam and recipe,** with Chip firing moved onto the seam to show it works. `npm test`, `npm run build` and every browser suite must pass.
3. **Calibration review cards** for Weeks 1, 2 and 15, then cards for the wave-1 themes.
4. **Port wave 1** once items 2 and 3 have merged.
5. **Safe preview links** for testers.
6. **Dot/Codex handoff:** the Road 1 keeper reactions and the rewritten voice-casting brief.

## Decisions

James decided these on October 5:

- **Story:** roads as chapters, as proposed above. The satchel stays so each puzzle can be tried on its own.
- **Gating:** a theme is ported after its review card. Revisions don't wait for his approval.
- **Reviews:** any model can review anything.
- **Agents:** Dot and Codex are one lane. exe.dev has no lane. Any agent may write code; Claude is preferred for front-end work and puzzle UI.

Still open, with my recommendation first:

- **Tower cities:** add Week 5's visibility clues as their own group, leaving Symbol Orchard pure, or leave them out as decided in September.
