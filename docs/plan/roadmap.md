# Roadmap, November 2026

A proposal for James, November 2, 2026, written when the math-studio channel took over dispatch. It covers both repositories against his three aims: (1) a public corpus of app puzzles and worksheets that keeps going wider, in better form factors; (2) running the Wednesday circle in a lively room of about eleven children; (3) weekend math at home with Jay, Rose and sometimes a neighbor. The older plan is [README.md](README.md); where each week stands is [decisions.md](decisions.md).

## Where things stand

- **App.** 123 mechanics and 1,414 puzzles, every mechanic now with a How to play demo. The live site was last deployed October 11, so three weeks of finished work (Waves 8 to 10, library regions, the layout and claims audits, the demos) is on `main` but not in front of anyone. No child had played the road, the demos or most families before the November 2 deploy; Rose has since (see Decisions).
- **Worksheets.** 101 weeks plus drafts, a catalog with a concept map, strands and a proposed six-year path, and an explorer page. Weeks 1, 2 and 15 are the only piloted ones. 97 of the 100 weeks are stored as problem files (one file per problem, with band packets as views); Weeks 1, 2 and 15, the return visits and the bonus pages are not.
- **Waiting on James.** His review of Weeks 83 to 97 and of the 23 drafts, and the voice pick.
- **Waiting on Codex.** The reviser and packaging stages of the eleven guide drafts (worksheets [PR #6](https://github.com/jamesrp/math-circle-worksheets/pull/6)); keeper reaction clips, voice auditions and scene motion (open lines on the app board).

## Decisions

- **November 4, 2026: keep the Lantern Road, trimmed.** James played the live app with Rose (5), and she preferred the Lantern Road version over the bare puzzles. That settles trim versus drop in favour of keeping the story, trimmed, rather than a minimalist puzzle app. Jay hasn't played it yet; if his reaction differs, revisit before cutting anything more. Still open from the play session: whether children watch the How to play demos or skip them.

The pattern: breadth is far ahead of play. More families or weeks now add less than getting what exists in front of children and into a shape people can follow.

## The order I recommend

1. **Ship and play.** *Done:* `main` deployed November 2; James played it with Rose on November 4, and the road stays, trimmed (see Decisions). Next: Jay's session, and noting whether children watch the demos or skip them. *James: Jay's play session.*

2. **Room plans for the circle (aim 2), starting now.** A short room plan per activity: a launch of three minutes or less, pairs with jobs, timed rounds, something physical, a reset signal, and what early finishers do. Start with the permutation follow-ups (shape machines, cycle notation) and the next few weeks James picks; the Wednesday check-in uses them. *Claude.*

3. **Worksheet copilot v0 as a SKILL.md (aims 1, 2, 3).** A skill a facilitator points their own agent at. Given the group (grades, size, what they did last time), it proposes the next activity from the catalog's strands and path, gives the band packets, the room plan and the guide's key points, and keeps a log of what happened. It runs on data already in the repo, so v0 is mostly writing. James's Wednesday and weekend check-ins become its first real user, which is the cheapest way to find out what it lacks. *Claude writes the skill; Codex adds a machine-readable export of the catalog if the skill needs one.*

4. **Guided play in the app (aim 1, form factor).** Replace "a big pile of puzzles" with a ladder per family and a Next that adapts: a clean solve skips ahead, a hint keeps you at that level on a sibling puzzle, and a related family is suggested when a ladder ends. The library's regions already group families by kind of mathematics. Step 1 settled its shape: the road stays, so Road 1 remains the first journey, told as a story, and ladders carry the families beyond it. A ladder can start from the road stop where a family first appears, so the story and the pile of puzzles meet. *Claude specs it and builds the UI; Codex builds the ladder data for every mechanic and its tests.*

5. **The book (aim 1, form factor).** Compile the worksheets into one book, ordered by the catalog's strands, with shared problems printed once across K–1, 2–3 and 4–5. The problem files already cover 97 weeks, so this is mostly a new view plus layout. The return-visit and bonus pages still need converting, which is a good Codex job: mechanical, and checked by rebuilding identical PDFs. *Claude designs the book and its order; Codex converts the remaining pages and builds the view.*

6. **Voice.** Already with Codex: ElevenLabs auditions for the keepers and for How to play, waiting for James's pick. No new work until he picks.

7. **Going wider, after 1 to 3.** The next frontier is grades 6 to 8, scouted against the concept map so a new theme is new mathematics, not a near-copy. Drafts go through the tested writer, critic and reviser workflow. Undergraduate versions can wait until the middle-school pass shows diminishing returns. *Claude scouts and critiques; Codex runs writer and reviser stages.*

Weekend home math (aim 3) rides on steps 2 and 3: the Friday check-in proposes, the copilot logs, and home sessions are where new activities get piloted before they reach the noisier room.

## Who does what

| Work | Claude (math-studio channel) | Codex |
|---|---|---|
| Release check, room plans, copilot skill, ladder spec and UI, book design, scouting, reviews and critic stages | ✓ | |
| Ladder data and tests, catalog export, bulk problem-file conversion, writer and reviser stages, art, motion and voice | | ✓ |

Hand-offs stay as they are: a work board line "for Codex" linking a brief in `docs/briefs/` or `plans/briefs/`. The channel's watcher picks up Codex's finished lines and PRs and starts a review.
