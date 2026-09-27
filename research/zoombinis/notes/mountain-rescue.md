# Mountain Rescue: extraction and logic evidence

The supplied disc exposes the game's data as individual files. No installer or historical executable was run. The decoder and source-grounded puzzle annotations are in `tools/mountain_rescue.py`; extracted art, tables, evidence, and the nine-puzzle catalog live only under `local/derived/mountain-rescue/`.

Run from the repository root:

```sh
python3 research/zoombinis/tools/mountain_rescue.py
python3 research/zoombinis/tools/mountain_rescue.py --verify-only
```

Python needs Pillow and numpy. Both are available in the bundled runtime and the Python used for this extraction. `--source` and `--output` override the default local directories. The script reads bytes and optionally invokes `objdump` for static disassembly; it never executes the game. The puzzle annotations are embedded as original summaries in the decoder and rebuilt with current source hashes.

## Results

All 990 targeted files decoded without errors:

| Format | Source files | Result |
|---|---:|---|
| RB | 516 | 516 transparent sprite PNGs |
| BB | 160 | 160 RGB PNGs, including full backgrounds |
| AN | 150 | 1,693 animation frame PNGs |
| ANM | 19 | 6,823 component frame PNGs, preserving slot indices |
| BMT | 15 | 15 PNGs; these are ordinary Windows BMP data despite the extension |
| PAT | 129 | 129 JSON files containing every coordinate, step, wait, and source offset |
| ZTL | 1 | 22 structured Beetle Bug Alley layout records and move variant pools |

Total: **9,207 PNGs**, including **8,516 animation/component frames**; 541,880 sparse pixel spans decoded. `manifest.jsonl` records each source path and SHA-256, frame and payload offsets, payload hashes, output paths and hashes, declared/output sizes, raw unknown header words, and preserved animation slots. `summary.json` and `verification.json` contain machine-readable status.

`background-contact-sheet.png` and `animation-contact-sheet.png` were visually inspected. Backgrounds are upright with coherent colors; transparent sprites and animation components render coherently. This is structural and visual validation, not a comparison against the running game.

The verification command checks every source hash and every PNG hash/integrity, tests opaque/missing/alpha pixels and truncated input rejection, checks a known PRNG sequence, and proves a byte-exact ZTL parse/serialize round trip.

## Native graphics formats

All integer fields below are little-endian. File extensions and original case are preserved in output paths to avoid name collisions.

- **BB:** six 32-bit header words; byte size at +8, width +12, height +16, byte size repeated +20. RGB data starts +24, top-to-bottom, three bytes per pixel. The first two header words are retained as unknowns.
- **RB:** six 32-bit header words; byte size +8, width +12, height +16. A repeated byte size at +24 precedes the payload at +28. Payload begins with an unknown 16-bit value, then spans `{u16 x,u16 y,u16 count,u8 kind,pixels}` until payload end. Kind 0 carries RGB triples; kind 1 carries RGB plus inverse opacity. Missing pixels are transparent. Kind 1 RGB appears premultiplied; PNG export uses alpha `255-t`, unpremultiplying with rounded integer division. This interpretation is strongly supported by data and images but not yet verified against the renderer's exact arithmetic. Quantization means original pre-multiplication RGB cannot be recovered exactly; original bytes remain the authority.
- **AN:** a 32-bit frame count, followed by that many RB records including their headers and size words. Frame order is preserved; no timing field was identified in these containers.
- **ANM:** exactly 3,000 indexed slots in every supplied file. Each slot has a 32-bit frame count; each frame has its payload size **before** its 24-byte RB header, followed by the sparse payload. Zero-count slots remain identified by index. Character component/layer names and draw ordering are not yet mapped; exporting slots as complete characters would be inaccurate.
- **PAT:** text records `FIRST` and `NEXT_n`, coordinate pairs, `step`, and `wait`. FIRST has four coordinate pairs and NEXT has three, consistent with connected cubic Bézier curves; actual curve evaluation and timing semantics are not confirmed. These are movement paths, not puzzle generators.

**35 sparse frames have spans extending one or two pixels beyond their declared width.** The exported PNG canvas expands to retain them, and both sizes plus `expanded_canvas` are recorded. Original playback may clip or handle these differently. No source spans were silently discarded. Several serialized header fields contain apparent pointers or debug-fill words (`0xcdcdcdcd`); these are preserved as inert values.

A developer note on the disc (`Data/Bmp/BOOLIES/tempo_boolies.txt`) includes animation intervals and timing comments: walk/turn 30, idle/blink frames 70, blink-sequence interval 3000 milliseconds, inter-pinball interval 400, and delayed success checking 1000. These are evidence from a shipped development note, not confirmed runtime settings. Full text and its hash are in `evidence/developer-notes.json`.

## Beetle Bug Alley includes authored generator data

`Data/Bmp/magic_wall/DEFAULT.ZTL` is **5,330 bytes** and is referenced by `INSTALL/HD/zoombini2.exe`. Its schema was recovered from the actual read routines, then parsed completely to EOF and round-tripped exactly:

1. A 16-bit record count (22).
2. Per record: category, selection weight, point count (all 16-bit), then point coordinates (pairs of 16-bit values).
3. Three nested move pools. Each stores a variant count; each variant stores a move count; each move stores a transfer count; each transfer is a three-word `(from,to,flag)` record.

There are 6, 6, 5, and 5 layouts in internal categories 1, 2, 3, and 4. Their selection-weight totals are 19, 20, 15, and 18. One category-3 record has zero weight. The three move pools are **not** automatically equivalent to the three user-facing difficulty levels.

Static executable evidence, at image base `0x400000`:

| Virtual address | Recovered behavior |
|---|---|
| `0x43fbf0` | Loads ZTL record count, three header words, coordinates, and calls nested-pool reader three times |
| `0x43fe70` | Reads three nested counts and transfer triples |
| `0x440210` | Filters by category, repeats each record index by its weight, chooses `rand() % total_weight` |
| `0x4402f0` | Chooses one variant independently from each of three pools and concatenates their move lists |
| `0x440c90` | Expands flag 1 into reciprocal transfers (a swap); flag 0 supplies one directed transfer |
| `0x440ab0` | Initialization includes scrambling and acceptance/fallback logic, still incompletely interpreted |
| `0x46c7c0` | PRNG update `state = (214013*state + 2531011) mod 2^32`, output `(state >> 16) & 0x7fff` |

The isolated PRNG and weighted-layout selection step are implemented as `mountain_rand` and `mountain_select_ztl_record`. **These are not a complete puzzle generator.** Mapping the game's three levels to its four internal categories, exact initial scrambling, acceptance/fallback behavior, seed and full PRNG call sequence remain open. Raw disassembly is saved with the executable hash in the evidence/catalog metadata. Do not infer that every puzzle is generated entirely from scratch: this scene explicitly mixes authored layout/move tables with random selection.

## Puzzle corpus and difficulty

`puzzles.json` contains nine scene records, their source manual pages, documented mechanics, difficulty facts, internal art directories, recovered generator evidence, and explicit unknowns. The source is `INSTALL/Data/Zoombinimr.pdf`:

| Puzzle | Manual pages | Useful documented distinctions |
|---|---|---|
| Turtle Hurdle | 15, 28–29 | Feature sorting; 3/4/6 incorrect placements before dock collapse; hardest adds secondary sorting |
| Pipes of Paloo | 16, 29 | Matching traits on edges; easiest has eight junctions; middle uses five branches around central Zoombini; hardest adds network complexity |
| Aqua Cube | 17, 30 | Coordinate toggles; 6 moves / 6 plus one warp / 11 plus two warps; hardest adds fourth dimension via inner/outer cube |
| Beetle Bug Alley | 18, 30–31 | Permutations with more beetles and complex moves at higher levels; authored tables decoded |
| Chez Norf | 19, 31 | Deduction from positive/negative/relational clues; 2 meal categories then 3; 4 extra trays, 3 extra attempts, then 2 incorrect meals; hardest has six customers |
| Bubble Bumpers | 20, 32 | Stateful automatic routing by traits and launch order; higher levels add entrances and symbols |
| Magic Mirrors | 21, 32–33 | Hidden-trait equality-count deduction; 12/8/6 cannonballs and larger candidate walls |
| Snowboard Gulch | 22, 33 | Trait-based branching routes; increasingly hidden sign clues |
| Boolie Boggle | 23, 34 | Binary addition and carry; easiest has two Boolies per group; longer groups and pinball lookahead at harder levels |

The manual gives three named difficulties: Not So Easy, Oh So Hard, Very Hard. Page 10 describes automatic advancement after three consecutive full-party successes; practice mode allows difficulty selection. Booliewood is a settlement/progression scene (400 Boolies triggers the final event), not a tenth puzzle. It remains in the asset corpus.

For eight puzzles, current evidence documents rules but does **not** recover exact random-instance generation, weighting, rejection/solvability checks, or all level constants. The catalog states that gap rather than presenting a guessed reimplementation as original logic. The executable string index retains byte offsets to help locate scene code and asset paths for further static analysis.
