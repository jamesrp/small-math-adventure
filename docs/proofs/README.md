# Proofs

October 3, 2026. Seventeen proof puzzles in which a solve can be a checked refutation, a one-check round, or a streak against a perfect opponent, not only a witness. The reasoning is in [Insight and proof without AI](../insight-without-ai.md); the playable sketch is [`prototypes/proof-tools.html`](../../prototypes/proof-tools.html). None of this has been played by children yet.

## Where they appear

**Puzzles → Tile gardens → Proofs** (14 puzzles) and **Puzzles → Pebble Duel → Proofs** (3), as the first group above the grade or difficulty groups. They are not on the Lantern Road and do not count toward a trail. The grown-up area has a **Proofs** option in Puzzle notes.

| # | Puzzle | What counts as a solve |
|---|---|---|
| Tile 1 | A lonely square | One star with no partner (Hall’s condition) |
| Tile 2 | The H | Two stars sharing one partner |
| Tile 3 | Corners off (4×4) | A paint proof: touching squares differ, counts 6 and 8 |
| Tile 4 | Two corners, side by side | A covering (two corners of opposite colors; Gomory) |
| Tile 5 | The big board (6×6) | A paint proof; the Checker tool is earned by finishing Tile 3 |
| Tile 6 | Shared partner | A star proof; the colors balance, so paint cannot work |
| Tile 7 | Two holes inside | A covering |
| Tile 8 | Four flips home | A walk on the Week 1 flip map |
| Tile 9 | Five flips home | A paint proof on the flip map (Week 1, grades 4–5, Problem 4) |
| Tile 10 | Any odd number? | Two questions right in a row, one check each: the worksheet’s A back to A, then a different trip |
| Tile 11 | Which trips? | Two clean rounds of six trip cards in a row (colors and distance) |
| Tile 12–14 | Sorting: holes and colors; two holes; four holes | Two clean six-garden rounds in a row, one check per round |
| Duel 1–3 | Two, three, four piles: who starts? | Three wins in a row from new starts against perfect play |

Gardens 1–7 do not say whether they can be covered. The child decides, then either covers the garden or switches to **Prove it can’t**.

## How a proof is checked

- **Stars.** Starred squares may not touch. Every square next to a star is a partner. More stars than partners proves that no covering exists. For dominoes on a grid this is complete: by Hall’s theorem every uncoverable garden has such a set.
- **Paint.** Every square painted, touching squares different, and different counts. Each domino covers one square of each color.
- **Flip map.** Every line joins two colors; then the colors of the start and finish against the number of flips decide whether the trip is ruled out.

The proof cards tick each condition live and accept the proof as soon as one card is complete. This favors clarity over rigor: a child can reach a proper coloring by watching the ticks. The one-check puzzles (Tile 10–14) are where the app tests whether the idea is understood.

Garden gestures match Tile Garden boards: only the central part of a square joins a stroke, and a drag that runs past its second square places nothing. `main.js` passes the rules from `tile-controls.js` to the proof board, since importing them into `proofs.js` would make a module cycle.

## Making painting less work

- Boards for hand-painting are small. Corners off has 14 squares.
- A drag paints or stars every square it crosses, however fast. Squares are hit only near their centers, so a diagonal drag paints a diagonal.
- **Fill blanks** paints every empty square in the chosen color, so a checkerboard needs one color by hand.
- **Checker** paints the whole garden from one tap, and appears only after Corners off is solved. The child earns the shortcut by building the pattern once.

## Rules that keep the evidence honest

- **No Undo** in one-check puzzles and duels (`noUndo` in `dist/proofs.js`). `main.js` and `ui.js` respect it, and the engine keeps no history for them. Restart is allowed and deals a fresh round or start.
- **Hints never answer.** In those puzzles Hint shows the three authored nudges, one per press, and never an answer, a highlight or Apply hint. Each mechanic’s `solve()` gives the answers, for the validator and tests only. A puzzle finished after opening Hint counts as “with hints” in the grown-up summary.
- **One check per round.** A miss shows a covering for every coverable garden and a star or color proof for every other one. Any odd number? marks every possible number after a check, and its next question is always a different trip, so a revealed answer is never asked again.
- **Coin-flip answers.** Each sorting answer is a coin flip, resampled only so each round contains the boards that refute named wrong rules: level 1 always has two holes of the same color; level 2 always has two neighboring corners (coverable) and, in about half the rounds, two opposite corners (not); level 3 always has a stranded corner and an unbalanced board with nothing stranded.
- **Blind guessing.** Sorting levels 1–2: 1 round in 62, a level 1 time in 3,844. Level 3: 1 in 56 and 1 in 3,136. Trips: at best 1 round in 40, the puzzle 1 time in 1,600.
- **Duel starts** are half losing positions for the player to move; under uniform sampling only 12% of three-pile starts would be. The opponent plays a winning move when it has one; when losing, it leaves the fewest winning replies. Only wins from a new start count.
- **No dead-end message** on an impossible garden. The tile solver’s automatic “cannot be completed” would announce the answer.

## Files

| File | Contents |
|---|---|
| `dist/proofs.js` | The four mechanics (`proofgarden`, `flipmap`, `sortgarden`, `duel`): validation, moves, hints, `solve()` for the evidence puzzles, rendering, pointer gestures, and `reset()` for choices that are not moves (the tool, a half-placed domino, lifted pebbles) |
| `dist/proofs.css` | Styles |
| `dist/proofs.json` | The pack: 17 puzzles and 4 sources, loaded alongside `puzzles.json` and merged in `main.js` |
| `scripts/build-proofs.mjs` | Authoring list; computes garden cells, coverings and the smallest star sets, then writes `dist/proofs.json` |
| `scripts/validate-proofs.mjs` | Checks content, witnesses, refutations, solve chains, that evidence hints give nothing away, checker soundness (every proper painting and every star set of up to four on the coverable gardens), generator coverage of the wrong rules, new questions in Any odd number?, and the opponent; run by `npm run build` |
| `tests/proofs.test.mjs` | Library grouping, rendering, Undo rules, hints, Any odd number?, saves, the duel streak rule, resets |
| `scripts/proofs-browser-smoke.mjs` | Plays every proof puzzle through the interface, including fast strokes, cancelled drags, hints and focus; `TEST_PHONE=1` for a phone viewport |

The pack is separate from `dist/puzzles.json` so `scripts/import-expansion.mjs`, which rebuilds that file, and the existing tests are unchanged. Edit the authoring list, then run `node scripts/build-proofs.mjs`, `npm test` and `npm run build`. Saves validate against the merged list; if `proofs.json` cannot load, the app stops with its usual load error rather than discarding saves. An older build still open in another tab (for example around a service-worker update) does not know the proof puzzles: it falls back to the previous save, and its next save drops proof attempts. Any additive pack has this risk.

The How to play dialog leaves out the grown-up notes for proof puzzles, since they name the verdict. The notes stay in Grown-ups → Puzzle notes → Proofs.

## Where these could go next

They are harder than solving a possible instance, because the child must first decide which kind of answer to give. Three placements, in order of commitment:

1. **Proofs group (now).** Opt-in, found by children and grown-ups who go looking.
2. **Side quests.** After a child has solved several concrete gardens on the road, a companion makes a claim about the garden they just finished: “Take these two corners away and nobody could cover it.” The child proves or refutes it. Side quests are optional, add a keepsake to the Journal, and never block the road. Rook, the navigator who is “exactly where I expected us to be, more or less,” suits a companion whose confident claims need checking; Bea, who takes problems apart, suits find-the-flaw puzzles. Counterexample hunts belong here too: “Rook says missing corners always mean impossible.”
3. **End bosses.** One optional night challenge per stop: a one-check sorting round, a trip round, or a duel streak. These use the strongest evidence and are the right place for difficulty. The reward is a light on the lantern tree or a tool, such as Checker or a parity lens that later works in Lantern Wires and Cup Swaps. A boss never gates progress.

Within each kind, a three-step ladder would help younger children:

- **Told.** “Prove this garden can’t be covered.” Only Prove mode; the child builds the proof.
- **Decide.** Cover or prove, as now.
- **Apply.** One-check rounds and duels.

For K–1, the told versions of A lonely square and The H, and the two-pile duel, look reachable. Painting proofs suit grades 2–3. Sorting rounds, trips and three- and four-pile duels suit grades 4–5. These are guesses to playtest.
