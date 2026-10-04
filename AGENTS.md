# Math adventure design brief

## Minimalism and UI copy

- **Any time you are creating UI, only put words if they are actually something the app user is going to need to read right then. If there's not an urgent need for the words, leave them out or remove them.** Apply this to existing screens as well as new work.
- Default to zero extra copy. A sentence is not justified just because it explains, identifies, sounds friendly, or fills space. For each visible label or sentence, identify the immediate action, decision, or non-obvious constraint that requires it. If removing it leaves the current task clear, remove it.
- Do not narrate what the interface already shows. For example, remove “Match the goal card” when the board already labels the player's lanterns and the goal card. Do not replace deleted copy with another heading, subtitle, tooltip, caption, reassurance, or slogan.
- Remove puzzle names, family descriptions and prerequisite teasers from puzzle selection, total/explored counters, “Free play” badges, routine “Saved”/offline-ready footers, and back buttons that duplicate the persistent navigation. A family name and selectable puzzles are enough. Keep installation status in installation settings and surface save errors only when attention is needed.
- Use the shortest clear control labels. Do not repeat information already clear from artwork, layout, controls, or another part of the same screen. Keep full instructions, optional mathematical explanations, and prerequisite details in explicitly requested Help or grown-up notes.
- These rules are for interface copy. **Characters may speak:** on the road, the stop's keeper (or Plume, the rival) says one short in-character line when a puzzle opens and reacts briefly to what the player does (a mistake, a hint, a solve, a locked side puzzle). A line says what the character wants or feels in their own voice. It never explains rules, recaps, narrates or offers generic encouragement; rules stay on the board and in How to play. The six travelers do not speak. There is no narrated story: the characters, pictures, puzzles and their consequences carry the adventure.
- Cut decorative whimsy, recap banners, repeated conclusions and promotional prose everywhere else. Avoid the same joke shape twice (a confident claim undercut by a tag) and avoid one motif stretched across everything.
- After removing copy, tighten the layout. Do not leave empty decorative containers or oversized gaps. Keep essential instructions, accessibility names, and readable type sizes.
- Puzzle play screens show the board and **zero objectives when the board or controls already communicate the task**. At most one concise objective may remain for a rule or goal that is not otherwise shown; one sentence is a ceiling, not a quota. No authored puzzle names, family eyebrows, progress badges, subtitles, duplicate board captions, or always-open instruction cards. Put control explanations and detailed rules behind “How to play”.
- Show feedback only when it adds information about the player's action or a necessary constraint. Do not add default encouragement or restate success in several places. Keep exact goals, budgets, first-return conditions, and actionable errors explicit.
- Review every mechanic, menu, dialog, and submitted state adversarially for unnecessary words. Removing a shared heading is insufficient if individual board renderers still repeat instructions. Check empty states, counters, collapsed panel summaries, navigation, and success messages too. Preserve accessible names and full Help/read-aloud instructions when visible copy is removed.

## Mathematical substance

- Build puzzles around a simple, recognizable mathematical object and uniform operations that connect directly to undergraduate or research mathematics. An actual mathematician should appreciate the structure, not just an advanced topic name in an adult note.
- The core app experience is **solve a well-defined instance of one puzzle type**. Proof writing, discussion, generalization, and research exposition are optional; do not depend on them to make an otherwise trivial completion interesting.
- Avoid arbitrary collections of unrelated constraints or randomly selected restrictions. A natural object such as a tiling, permutation, graph, cyclic group, or impartial game may have a rich solution space without extra rule clutter. Explain the intended insight behind each authored change of rules.
- Consult `/Users/jamespfeiffer/math-circle/worksheets/` and the corresponding `plans/` notes. Ten weeks of worksheets, solutions, and mathematical redesign notes are available there. Adapt their mathematics to short, concrete app tasks; do not automatically import their proof/discussion format. Record specific sources and distinguish new instances from borrowed ones.

## Difficulty and variation

- Grade trails are approximate entry points, not ceilings. Document prerequisites in grown-up notes and offer a quick path beyond introductory instances. A small board can be difficult; a large board can be routine.
- Family playtest feedback (2026-09-20): a five-year-old found all sampled K–1 tile gardens and the sampled grades 2–3 gardens trivial. Cup swaps worked better. Do not describe all current content as untested; broader difficulty calibration remains open.
- Difficulty must occur in the required solve: a meaningful choice, interaction, planning step, invariant, or reusable strategy. Merely enlarging a shape or adding an optional counting/proof question after easy completion is insufficient.
- For Tile Garden, prioritize changes to the tile set: L-trominoes, or a menu of two shapes such as dominoes plus trominoes. Exact inventories (X dominoes and Y trominoes) and free choice from a stated menu are natural variants. Do not assume removing inventory restrictions makes a puzzle harder: it enlarges the solution set, so verify the effect on actual decisions.
- For Cup Swaps, use intentional, intelligible exchange families: any pair, adjacent positions, a ring, or every swap involving a designated hub (or one of two designated hubs). Specify whether a restriction refers to fixed positions or moving cup identities. Avoid randomly forbidding half of all pairs. State the insight a restriction is intended to reveal.

## Authoring and verification

- Give each instance explicit starting data, legal moves, a concrete success condition, a solution witness, a useful hint, and the intended mathematical insight.
- Accept every valid solution unless the task explicitly asks for an optimum or a particular outcome. Validate solvability and any uniqueness, optimality, or game-strategy claim; inspect alternatives and dead ends when relevant.
- Prefer a progression of meaningful structural contrasts over a bag of random seeds. Random generation, if used, must stay inside a named mathematical family and be filtered for an authored purpose.
- Keep research connections accurate and assumptions explicit. Do not claim a tiny puzzle illustrates a research theorem beyond what its model actually supports.
- The September 2026 expansion catalog in `docs/puzzle-expansion/` supplies the ten implemented additional families (120 instances, twelve per family). `dist/puzzles.json` is the canonical shipped twelve-mechanic pack, adapted by `scripts/import-expansion.mjs`. The six separate tiling trials remain proposed content. Preserve earlier puzzle IDs and revisions when making additive changes.

## The road and its art

- The Lantern Road is described in `docs/ROAD.md`: seven stops to the Lantern Fair, a keeper per stop, Plume's rival scores, three stars per puzzle (solved, no hints, beat or tie Plume where a count exists), two tools (chalk, pump) that open two side puzzles, and one road per grade trail. Decided with James in October 2026: a fixed party of six travelers, characters inside the puzzles, no losing, keepers never join, no plot or villain.
- Claude sessions own the puzzle UI (board renderers, `dist/boards.css`) and the road code (`dist/road*.js`, `dist/road.css`). Keep board changes in that look: paper card, ink outlines, sun and leaf fills, pine for the chosen thing, ochre for attention, Georgia numerals.
- Art arrives through art slots only: `docs/art/ROADMAP.md` is the brief, `dist/art-slots.js` the catalog, `dist/art/manifest.json` the switchboard and `scripts/check-art.mjs` the check. Art agents add files and manifest entries, never code. Art is bright and saturated, with dark stops mixed in (night marsh, Halloween hollow, stormy lighthouse, night fair).
