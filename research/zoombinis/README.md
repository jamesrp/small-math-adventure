# Zoombinis local research corpus

This workspace unpacks the three supplied discs for studying puzzle rules, difficulty progression, art, and animation. It retains original files and byte-level provenance so a future importer can work from a user's own disc. Nothing here is integrated into the math adventure's `dist/` bundle.

**Start with [the 24-family specification and difficulty report](notes/puzzle-specifications.md)** for the latest work. The [initial four-generator report](notes/generator-parity.md), [combined puzzle catalog](local/puzzles.json), and [local corpus browser](local/index.html) provide the earlier evidence, structured contracts and extracted assets.

The [local three-game player plan](../../docs/ZOOMBINIS-PLAYER-PLAN.md) defines the proposed browser runtime, private asset packs, localStorage save management, remaining compatibility work, and implementation batches. It is a plan, not an implemented player.

Player implementation now lives separately in [`business/zoombinis/`](../../../zoombinis/README.md). Further source findings stay here: [Logical Journey player audit](notes/player-logical-journey-audit.md), [Mountain Rescue player audit](notes/player-mountain-rescue-audit.md), [Island Odyssey player audit](notes/player-island-odyssey-audit.md), and [local import boundary](notes/player-import-boundary.md). These distinguish the new first-slice player from the still-incomplete campaigns and timing engine.

Detailed generator reports:

- [Allergic Cliffs: hidden predicates and party-conditioned generation](notes/logical-bridge-parity.md)
- [Pizza Pass: preference partitions and feedback](notes/logical-pizza-parity.md)
- [Beetle Bug Alley: permutations, exact distances and target reachability](notes/mountain-generator-parity.md)
- [Greenhouse: overlapping paths, templates and scramble invariants](notes/island-generator-parity.md)

First-pass per-game analysis:

- [Logical Journey](notes/logical-journey.md)
- [Mountain Rescue](notes/mountain-rescue.md)
- [Island Odyssey](notes/island-odyssey.md)
- [Native random-number analysis](notes/native-analysis.md)

The corpus combines extraction of all three games with native research for all 28 puzzle families: the initial four generator recoveries and detailed contracts for the other 24. It is not a complete implementation of any game. Documented rules, decoded data tables, native-tested behavior and hypotheses are labeled separately. The games use a mixture of generated content and authored tables/templates.

## First-pass coverage

| Game | Puzzle families | Difficulty levels | Decoded PNG images/frames |
|---|---:|---:|---:|
| Logical Journey | 12 | 4 | 10,749 |
| Mountain Rescue | 9 | 3 | 9,207 |
| Island Odyssey | 7 | 3 | 13,921 |
| Total | **28** | | **33,877** |

All **3,012 disc files** were verified against their ISO byte ranges and hashes. Game decoder checks verified original resource slices, image data/hashes and converted audio. Preview contact sheets were inspected. These checks establish extraction/conversion integrity. Subsequent native tests establish parity at the explicit boundaries in the per-family reports. Independent ports, original-function backends and event-input models are distinguished; full session replay and rendering parity remain unverified.

The first pass decoded Island Odyssey's Greenhouse templates and Mountain Rescue's 22 weighted Beetle Bug Alley layouts with move pools, and extracted Logical Journey's 48 original difficulty-specific help entries. The initial native follow-up reproduced the isolated Greenhouse, Beetle Bug Alley, Allergic Cliffs and Pizza Pass generators. The subsequent 24-family pass adds all remaining puzzle contracts and their native evidence; see the linked coverage report for each implementation boundary. Art limitations include 11 unconverted indexed-color AO files, unresolved runtime palettes/transparency and animation timing, and one explicitly flagged Logical Journey picker image. Art and runtime UI work are outside the current generator/difficulty pass.

## What is preserved

| Layer | Location | Purpose |
|---|---|---|
| Original discs | `../../Zoombinis.iso`, `../../MountainRescue.iso`, `../../IslandOdyssey.iso` | Unmodified source images |
| Disc files | `local/discs/<game>/` | Full Joliet file trees, including game files, installers, and bundled demos |
| Disc manifests | `local/manifests/<game>.json` | ISO SHA-256, per-file SHA-256, source byte range and directory record offset |
| Decoded assets | `local/derived/<game>/` | PNG images/frames, WAV audio where decoded, animation JSON, raw archive resources, palettes and scripts |
| Manuals | `local/manuals/<game>.json` and `.txt` | Page-indexed text from all 151 manual pages, linked to source PDF hashes |
| Native evidence | `local/native-analysis/<game>/` | Executable hashes, PE sections/imports, full static disassembly, strings with addresses, RNG call sites |
| Generator evidence | `local/analysis/` | Differential results, original-function slices, deterministic fixtures, exact graph analyses and solution certificates |
| Generator coverage | `local/generator-parity.json` | Additive latest parity metadata, explicit boundaries and hashes of validation reports |
| Family specifications | `local/specs/<game>/` | State, inputs, actions, feedback, outcomes, difficulty, generation, assets and explicit boundaries for the other 24 families |
| Specification coverage | `local/puzzle-specifications.json` | Additive contracts and hashes of specifications, models and family evidence |
| Puzzle catalog | `local/puzzles.json` | First-pass evidence, four initial generator recoveries and 24 detailed specifications |
| Search index | `local/corpus.sqlite3`, `local/files.jsonl` | Searchable raw/derived file records and hashes; metadata stays beside the decoded files |

Per-resource offsets in a game decoder's manifest refer to the extracted archive file. Add the archive's `iso_offset` from the disc manifest to obtain an ISO-relative byte position. File and archive hashes identify the exact version. Frame coordinates, sparse image bounds, palettes and unresolved timing fields are retained rather than flattened into an assumed player model.

`local/` and the `.iso` files are excluded by the project's `.gitignore`. The existing app server and release script serve/build `dist/` only. Treat the entire `local/` tree as original or source-derived game material when moving or sharing the project. The tools and analytical notes live outside it; review any material separately before deciding to distribute it.

## Reproduce

Run from the `small-math-adventure` directory. Python 3 with Pillow, numpy and pypdf is required for all conversions; core ISO extraction uses only the standard library. Native analysis uses LLVM `objdump`. The Codex bundled Python already has these packages:

```sh
PYTHON=/Users/jamespfeiffer/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
"$PYTHON" research/zoombinis/tools/corpus.py extract
"$PYTHON" research/zoombinis/tools/corpus.py manuals
"$PYTHON" research/zoombinis/tools/logical_journey.py \
  --disc research/zoombinis/local/discs/logical-journey \
  --out research/zoombinis/local/derived/logical-journey
"$PYTHON" research/zoombinis/tools/mountain_rescue.py
"$PYTHON" research/zoombinis/tools/island_odyssey.py --frames all --native
"$PYTHON" research/zoombinis/tools/native_analysis.py
"$PYTHON" research/zoombinis/tools/logical_catalog.py
"$PYTHON" research/zoombinis/tools/island_corpus.py --overview
```

Per-game notes document the corresponding puzzle-catalog generation commands. After generating or updating those catalogs:

```sh
"$PYTHON" research/zoombinis/tools/corpus.py index
"$PYTHON" research/zoombinis/tools/corpus.py verify
"$PYTHON" -m unittest discover -s research/zoombinis/tools -p 'test_corpus.py'
"$PYTHON" research/zoombinis/tools/logical_validate.py \
  --disc research/zoombinis/local/discs/logical-journey \
  --out research/zoombinis/local/derived/logical-journey
"$PYTHON" research/zoombinis/tools/mountain_rescue.py --verify-only
"$PYTHON" research/zoombinis/tools/island_odyssey.py --skip-unpack --verify
```

Extraction never runs an original installer or executable. The ISO reader validates bounds, both-endian directory fields, path components, duplicate paths and output containment. It supports the single-extent Joliet layout present on these discs, and rejects unsupported interleaved or multi-extent records. It does not extract a separate Macintosh HFS volume or emulate resource forks; the original ISOs retain any such data for later work. Decoder assumptions are specific to these versions and are not a hardened public upload service.

Re-running ISO extraction verifies existing bytes before retaining a file. Decoders regenerate their outputs; use an empty output directory when switching disc versions to avoid retaining old derivatives. The native helper analysis refuses an unrecognized executable hash because its function addresses are version-specific.

### Generator models and native comparisons

The new logic tools write to `local/analysis/`. Their commands and exact boundaries are documented in each puzzle report. Create the optional native environment once:

```sh
python3 -m venv research/zoombinis/.venv
research/zoombinis/.venv/bin/python -m pip install -r research/zoombinis/tools/requirements-native.txt
```

Unicorn executes bounded original x86 instructions in isolated emulated memory. It does not launch a Windows process or provide native filesystem, network or UI access. On this macOS host its executable-memory mapping requires approved execution outside the restrictive agent sandbox; pure models and static analyses do not need that exception.

Representative commands (the full graph analysis and native suites take longer):

```sh
NATIVE_PYTHON=research/zoombinis/.venv/bin/python
"$NATIVE_PYTHON" research/zoombinis/tools/native_oracle.py
"$NATIVE_PYTHON" research/zoombinis/tools/test_logical_bridge_generator.py
python3 research/zoombinis/tools/logical_bridge_difficulty.py
"$NATIVE_PYTHON" research/zoombinis/tools/logical_pizza_generator.py --native --seeds 128 --analysis-seeds 10000
"$NATIVE_PYTHON" research/zoombinis/tools/mountain_generator.py --native-validate --native-seeds 30
"$NATIVE_PYTHON" research/zoombinis/tools/mountain_generator.py --native-moves
python3 research/zoombinis/tools/mountain_generator.py --difficulty --samples 100
python3 research/zoombinis/tools/mountain_generator.py --goal-analysis
python3 research/zoombinis/tools/island_generator.py --certify-templates
python3 research/zoombinis/tools/island_generator.py --samples 1000
"$NATIVE_PYTHON" research/zoombinis/tools/island_oracle.py --samples 1000
python3 research/zoombinis/tools/generator_catalog.py
python3 research/zoombinis/tools/specification_catalog.py
python3 research/zoombinis/tools/corpus.py index
```

Rerun `generator_catalog.py` to regenerate `generator-parity.json` after changing a report, before rebuilding the index. It hashes the current validation evidence and adds a `generator_parity` field to the four matching puzzle records without overwriting first-pass findings. Indexing rejects a stale report snapshot. Rerun `specification_catalog.py` after updating any of the other 24 contracts, models or evidence directories. It preserves first-pass metadata and attaches `puzzle_specification`; indexing rejects stale snapshots. The catalog remains at 28 families, with the coverage and limits of each native comparison visible.

## Query examples

```sql
-- Puzzle metadata, including explicit unresolved generator questions.
SELECT game, name, metadata_json FROM puzzles ORDER BY game, name;

-- Original game data, excluding bundled cross-promotional demos/installers.
SELECT game, path, bytes, iso_offset, sha256
FROM files WHERE layer = 'disc' AND role IN ('game-data', 'game-runtime');

-- Duplicate bytes across files or discs without losing source identities.
SELECT sha256, COUNT(*) AS copies, SUM(bytes) AS total_bytes
FROM files GROUP BY sha256 HAVING COUNT(*) > 1 ORDER BY total_bytes DESC;
```

## Remaining work toward generator parity

1. Close the documented engine-boundary gaps: animation/clock event integration for movement puzzles and complete independent ports where exact generation currently uses guarded native backends. Some Bubble Bumpers branches also require nontrait/scratch memory inputs beyond the seed and party.
2. Recover the remaining logic around the initial four generators: full Pizza Pass feedback selection, Greenhouse path annotation/movement, and session-level inputs/progression. Separate static solutions and ideal query counts from actual gameplay constraints.
3. Expand difficulty measurements with meaningful decision counts, exact distances, invariants and solvability checks; add player calibration separately.
4. Resume palette changes, animation timing, sprite-bank binding and character assembly when runtime/art work returns to scope. Those first-pass limitations remain documented in each game's notes.

The future web-player boundary would be a local user-supplied disc/file importer plus a separately implemented runtime. These artifacts prepare the provenance and format work for that possibility; no player, upload service, distribution package, or deployment is included.

## Format references

- [ECMA-119, ISO 9660 and Joliet](https://ecma-international.org/publications-and-standards/standards/ecma-119/)
- [ScummVM Mohawk resource reader](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/resource.cpp)
- [ScummVM Mohawk bitmap decoder](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/bitmap.cpp)

The game manuals, help resources and native binaries on the supplied discs are the primary evidence for puzzle-specific claims. Public format references support container decoding rather than the games' actual generation algorithms.
