# Nine shipped L gardens — September 27, 2026

Exactly puzzles 4, 8 and 12 in each grade band now require L-trominoes (25% of each band's twelve gardens). IDs, ordering, band assignments and all other puzzle records are unchanged; the pack still has 192 puzzles. These nine records alone advance from revision 1 to 2. Each board starts empty and requires an exact cover by freely rotated L pieces, with no overlap or overhang. Every valid cover is accepted. Explicit cells and solution witnesses live in `dist/puzzles.json`; readable boards, hints and parent notes are generated in [PUZZLES.md](PUZZLES.md).

| ID | Required-solve strategy | Legal first placements that prevent completion |
| --- | --- | ---: |
| tile-k1-04 | Interlock two Ls in a 3×2 rectangle; the first elbow's orientation matters. | 4 |
| tile-k1-08 | Split the 4×3 region into two 2×3 blocks; avoid stranding a straight triple. | 16 |
| tile-k1-12 | A missing corner in a 4×4 square: a central L creates four deficient 2×2 quadrants. | 28 |
| tile-23-04 | Opposite ends of a staircase constrain the pieces filling the middle. | 19 |
| tile-23-08 | An interior missing cell changes which three quadrants the central L must enter. | 19 |
| tile-23-12 | Turn the rectangle strategy sideways into three 2×3 strips; avoid narrow leftovers. | 28 |
| tile-45-04 | Locate the missing cell's quadrant before orienting the central L; filling the center greedily can fail. | 19 |
| tile-45-08 | A 5×5 square missing a corner is outside the power-of-two construction. Reserve two bottom-row Ls, then plan around the remaining boundary. Divisibility by three is insufficient. | 40 |
| tile-45-12 | Decompose a 6×4 rectangle into 3×4 regions and then 3×2 blocks; choices across the proposed seams can strand untileable regions. | 36 |

The last column exhaustively tries each distinct legal initial piece and asks the exact-cover solver whether it extends. It measures consequential choices, not calibrated child difficulty. Larger area alone is not the rationale: the child must manage complementary elbows, boundaries, or decomposition. K–1 still starts with a two-piece instance; later positions provide a quick path beyond it. Prerequisites are recognizing three-square Ls, rotating them, and inspecting remaining space; quadrant decomposition is an available strategy rather than a prerequisite proof. Family feedback from September 20 found sampled K–1 and grades 2–3 domino gardens trivial; these replacements still need child playtesting.

## Sources and adaptation

Consulted `/Users/jamespfeiffer/math-circle/plans/week-01-tiling-redesign.md`, particularly “The undergraduate source trail” and its distinction between square-grid L-trominoes and triangular pattern blocks. The old `worksheets/` directory is absent. Located the worksheets at `/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-01/`; read `README.md` and `week-01-grades-4-5.tex`. Their lozenge enumeration and flip tasks are not imported as L puzzles or claimed as L theorems. Their substantive model—decisions about a recognizable tiling object—guides this adaptation.

The deficient 4×4 instances specialize the construction identified in the curriculum notes: Lehman, Leighton and Meyer, *Mathematics for Computer Science* (2015), §5.1.5, printed pages 119–122 (`tile-mit-mcs` in the existing source catalog). They are newly selected missing-cell instances of that standard construction, not copied worksheet boards. The rectangles, staircase and deficient 5×5 are newly authored app instances; their exact covers were computed and replayed, with no uniqueness, optimality, or research theorem claimed. Exact cover applies to all nine; domino matching/height-function results are not transferred to L tiles.

## Save compatibility and change boundary

`dist/storage.js` retains the original geometry for only these nine revision-1 IDs. Migration is permitted only into their revision-2 L definition. The ordinary strict save checks run against the original domino rules first, including board geometry, completion consistency, history length and move indices. A valid legacy attempt advances to revision 2 with empty board/history and zero moves. Completion, help usage, hint level and last-played time survive. Unrelated attempts, profiles, selected profile and journeys survive unchanged. Both browser loads (including previous-good recovery) and exported backup imports use this validation path. Unknown revisions and malformed legacy boards/history are still rejected; current L attempts retain their board/history.

`tests/fixtures/gardens-v1.json` freezes the nine original full records. `pack-before-l.json` freezes every ordered ID and record's SHA-256 digest at base commit `51816d03db81b375f3174f9964adffc69d9e4fda`. Tests enforce the exact change boundary, mandatory triples, runtime witness acceptance, solvability, legal dead ends, current-state hints and migration through loads/imports. These fixtures are not regenerated from the new pack.

## Verification

- `npm test && npm run validate`: 170 tests pass; 192 catalog puzzles, three campaign puzzles, three bands and twelve mechanics validate. All nine L witnesses are replayed using their actual rules.
- Earlier browser evidence exercised the former rotation controls. Browser smoke scripts need updating for the draw and tap interaction before they can verify the current UI.
- Browser launch and localhost binding required scoped automatic permission escalation. Browser closes in `finally`; the temporary server was stopped after verification. No personal browser profile was used.

Run the browser check using the existing `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, and optional `TEST_URL` conventions. The earlier synthetic fixture suite remains separate coverage of all four orientations, removal, undo, restart and read-aloud.
