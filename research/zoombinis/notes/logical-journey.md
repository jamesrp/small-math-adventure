# Logical Journey extraction and analysis

This disc contains the 2001 update of the original Mohawk-engine game. The native game executable is available directly at `INSTALL/HD/Zoombinis Logical Journey.exe`; no installer or game executable was run. The extracted asset corpus stays under the ignored `local/` tree. The work here covers the 22 primary `DATA/*.mhk` archives, excluding the bundled Mountain Rescue demo from the primary-game counts.

## Outputs and exact counts

Paths below are relative to `research/zoombinis/local/derived/logical-journey/`.

| Output | Count | Meaning |
|---|---:|---|
| `archives.json` | 22 | Original MHK archive paths, sizes and SHA-256 hashes |
| `resources.jsonl` and `resources/` | 4,753 | Exact raw resource slices with archive offset, length, numeric resource ID, four-byte tag, file-table index, original name if any, and SHA-256 |
| Distinct resource byte hashes | 4,231 | Counts above retain duplicate resources to preserve their original identities |
| `images.jsonl` and `images/` | 10,749 | Indexed PNGs from all 190 tBMP resources; 116 resources are compound image banks |
| `animations.jsonl` and `animations/` | 2,890 | Parsed 2,117 SCRB and 773 SCRS resources |
| Animation frame records | 43,802 | Shape-index/position lists plus preserved frame markers; **not** fully reconstructed playable animations |
| `audio.jsonl` and `audio/` | 1,464 | All SND resources converted losslessly to unsigned 8-bit, mono, 11,025 Hz PCM WAV |
| `texts.jsonl` | 53 | STRL string lists, including 48 difficulty-specific puzzle help entries |
| `palettes.json` | 50 | 44 SHPL palette records and 6 tPAL records |
| `puzzles.json` | 12 | Puzzle records with 48 difficulty descriptions, rule models, provenance and explicit generator unknowns |

Other preserved resource types are REGS (83), NODE (9), PATH (9), and CURS (5). These have not been semantically decoded. The three loose Bink videos remain available under the original disc `DATA/` directory; they were not transcoded. The small `.mps` and `.rsc` files and the print program remain in the disc tree rather than being mixed into gameplay-resource counts.

## Puzzle evidence

The manual describes 12 puzzle families and four difficulty levels. Crucially, the original `DATA/zoombini.mhk` includes machine-readable help for every puzzle/difficulty combination: STRL resources 1700–2860, with puzzle bases increasing by 100 and level offsets 0, 20, 40, 60. `texts.jsonl` retains the exact original text locally; `puzzles.json` contains paraphrased rule descriptions with each supporting resource ID and hash. The manual page references are one-based PDF pages.

| Puzzle | Main archive | Help IDs | Manual pages |
|---|---|---|---|
| Allergic Cliffs | `bridge.mhk` | 1700, 1720, 1740, 1760 | 16, 36 |
| Stone Cold Caves | `tunnels.mhk` | 1800, 1820, 1840, 1860 | 17, 37 |
| Pizza Pass | `pizza.mhk` | 1900, 1920, 1940, 1960 | 18, 37 |
| Captain Cajun’s Ferryboat | `ferry.mhk` | 2000, 2020, 2040, 2060 | 21, 38 |
| Titanic Tattooed Toads | `lilly.mhk` | 2100, 2120, 2140, 2160 | 22, 38 |
| Stone Rise | `slides.mhk` | 2200, 2220, 2240, 2260 | 23, 39 |
| Fleens! | `fleens.mhk` | 2300, 2320, 2340, 2360 | 25, 40 |
| Hotel Dimensia | `hotel.mhk` | 2400, 2420, 2440, 2460 | 26, 40 |
| Mudball Wall | `net.mhk` | 2500, 2520, 2540, 2560 | 27, 41 |
| The Lion’s Lair | `caves.mhk` | 2600, 2620, 2640, 2660 | 30, 41 |
| Mirror Machine | `smoke.mhk` | 2700, 2720, 2740, 2760 | 31, 42 |
| Bubblewonder Abyss | `maze2.mhk` | 2800, 2820, 2840, 2860 | 32, 42 |

These internal archive names do not always match the visible puzzle names: in particular, `caves.mhk` is The Lion’s Lair and `tunnels.mhk` is Stone Cold Caves. Decoded backgrounds corroborate this mapping.

The help specifies meaningful level changes: Fleens progresses from same-attribute correspondences to exactly one fixed attribute and then no fixed attributes; Hotel Dimensia progresses through one, two, and three spatial dimensions; Mirror Machine eventually requires one transformation arrangement to work for two Zoombinis. Some help text is identical across adjacent levels, so the catalog explicitly preserves unknown distinctions rather than inventing them.

**Exact per-puzzle generation algorithms are not recovered yet.** The corpus contains documented validators/constraints, difficulty changes and candidate parameters. It does not establish random parameter distributions, rejection sampling, solvability conditioning, seed-to-instance equivalence or exact preset/template selections. Animation resources are not assumed to contain puzzle-generation scripts. Native-code work is organized separately under `local/native-analysis/logical-journey/`, including the actual bounded RNG routine and its call sites. This extraction saves raw resources, offsets and native string evidence so subsequent disassembly can link code to specific asset IDs.

## Image and animation fidelity

The extractor supports the formats observed on this disc: Mohawk LZ packing with a 1,024-byte dictionary, raw/RLE8 indexed images, and compound image offsets. PNGs preserve original pixel indices, and each manifest row stores their hash. They do not bake in guessed transparency.

Matching SHPL resource IDs select palettes where available. Other images use a preceding palette within the archive, which is explicitly labeled as inference. Shared Zoombini resources use only the 36 entries that agree byte-for-byte across the main puzzle palettes; `shared-palette-evidence.json` lists those source palettes. Unresolved palette entries use grayscale placeholders, with every used unresolved index listed per image. Runtime palette swaps, index-zero transparency, and context-specific palette selection still need to be recovered for a player.

`contact-sheet.png` was visually inspected. The principal puzzle backgrounds are recognizable and coherent. **`picker/tBMP/01001` has visibly noisy colors and is not established as a faithful preview**, even with its matching SHPL resource. Trying alternate existing palettes did not establish a correct rendering. Its LZ byte output matches the separate absolute-offset oracle, narrowing the problem beyond a disagreement between the two LZ implementations. Its intended use or palette association remains unresolved. This file remains in the corpus and has an explicit warning in `images.jsonl`; the contact sheet now uses the other picker background (resource 4000).

SCRB and SCRS frame structure is independently supported by all 2,890 resource boundaries and header counts. Both contain draw triplets `(shape index, signed x, signed y)`. FFxx terminates a frame; FExx terminates a frame and consumes an additional 16-bit argument. SCRS adds a second header word. All marker bits and arguments are preserved. Their meaning, animation time base, sound synchronization, sprite-bank selection and transition behavior remain unresolved; no guessed GIF timing is presented as original gameplay.

## Reproduce and validate

Use Python 3 with Pillow installed. From the repository root:

```sh
python3 research/zoombinis/tools/logical_journey.py --disc research/zoombinis/local/discs/logical-journey --out research/zoombinis/local/derived/logical-journey
python3 research/zoombinis/tools/logical_validate.py --disc research/zoombinis/local/discs/logical-journey --out research/zoombinis/local/derived/logical-journey
```

The extraction command also invokes `logical_catalog.py`; the catalog is reproducible from checked-in paraphrases and freshly decoded STRL provenance. It can be regenerated independently with `python3 research/zoombinis/tools/logical_catalog.py --out research/zoombinis/local/derived/logical-journey`.

`decode-summary.json` reports zero extraction/decode exceptions. `validation.json` records 4,753 verified archive slices/hashes, 185 LZ-packed resources compared byte-for-byte with a separate absolute-offset oracle, 10,749 PNG dimension/index-hash checks, and 1,464 WAV sample-hash checks; all passed. Animation parsing also checks the declared frame count and complete byte consumption for every resource. These tests establish structural and conversion integrity, not complete renderer or game equivalence.

## Technical sources

Public ScummVM format research was read alongside the local files: [archive directory reader](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/resource.cpp), [bitmap codecs and compound images](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/bitmap.cpp), [bitmap format flags](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/bitmap.h), and [Mohawk audio container](https://github.com/scummvm/scummvm/blob/master/engines/mohawk/sound.cpp). Downloaded reference snapshots are retained locally under `reference/`. The absolute-offset validation oracle is adapted from ScummVM and marked GPL-3.0-or-later; it is isolated research tooling.
