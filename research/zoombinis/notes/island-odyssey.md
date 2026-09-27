# Island Odyssey: private extraction and reverse-engineering notes

The disc's installed-game resources are directly accessible in `HD/`; the installer and original game were never run. This is a first-pass corpus, not a full engine reimplementation. All proprietary payloads and detailed extracted content remain under ignored `local/`.

## Reproduce

From the `small-math-adventure` project directory, with Python 3 and Pillow:

```sh
python3 research/zoombinis/tools/island_odyssey.py --frames all --native
python3 research/zoombinis/tools/island_corpus.py --overview
python3 research/zoombinis/tools/island_odyssey.py --skip-unpack --verify
```

The bundled Pillow-enabled interpreter is `/Users/jamespfeiffer/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`. `--native` optionally uses host `objdump` to statically disassemble; it never invokes the original executable. `--skip-unpack --frames all` reruns just PNG decoding. Default input/output can be changed with `--disc` and `--output` on the main unpacker. The corpus helper uses the standard research directory layout.

## Coverage

- 24 BUL archives, all resource records unpacked through `HD/rsc/root.inx`: 1,447 resources.
- 1,035 AO animations, 308 WAV files, 19 JPEG backgrounds, 55 RGB palette files, 25 LIPS files, 5 NFNT font files.
- 1,024 AO animations contain 13,921 AO2C frames decoded to RGBA PNG, preserving frame order. The remaining 11 AO files are palette-based variants preserved verbatim.
- All 11 MPS scripts have offset-addressed printable expression/symbol evidence; all 12 script XML files have structured JSON equivalents. The game's nonstandard `<12Created>` tag in `z3p1.xml` is temporarily renamed only while parsing and restored in JSON; the original parse diagnostic is retained.
- Seven puzzle records link mechanics, all three difficulty levels, verbatim XML help, guide page references, script evidence, and native asset roots.
- Greenhouse has six exact 12×12 templates, plus static recovery of core template composition, random filling, and shuffle logic. The other six generators remain partially identified in native code, not fully decompiled.

The generated corpus is `local/derived/island-odyssey/`. Useful entry points are `puzzles.json`, `assets-manifest.json`, `animations-manifest.json`, `background-overview.jpg`, and `sprite-overview.jpg`. Every unpacked payload has its source archive hash, archive byte offset, payload offset/length, source index offset, output name, and SHA-256. Every exported frame has the AO hash, AO2C offset, dimensions, order, output path, and PNG hash. Original AO files remain available for exact control metadata and future playback work.

## Index and animation format recovered locally

`root.inx` begins with a little-endian uint32 root count, followed by absolute uint32 node offsets. Directory nodes have flags `0x400`, an absolute child-table offset, and a null-terminated name. Child tables contain count and absolute offsets. Leaf records have `<HHIIIH` fields followed by a null-terminated name: flags, archive ID, entry offset, entry byte length, and reserved fields. Archive registration leaves use `0x280`; resource leaves use `0x80`. Archive IDs are explicit, including ID zero; they are not simply alphabetical positions. Each BUL begins with a four-byte identifier matched against its registration record. Resource entry lengths include the null-terminated filename before the actual payload. The extractor validates identifiers, all ranges, and every embedded filename.

For the common AO variant, the uint16 at offset 2 is the frame count. Each frame carries an `AO2C` chunk: four-byte tag, uint32 body length, uint16 format 2, uint16 width, uint32 height, and height uint32 scanline offsets relative to the body. Runs are `(uint16 type, uint16 count)`: type 0 skips transparent pixels; type 1 contains RGB555 colors; type 2 contains RGB555 colors followed by one stored alpha byte per pixel. RGB555 is expanded by bit replication. Alpha bytes are retained unchanged; the original compositor's rounding/scaling has not been verified. Two empty 1×1 frame sentinels use a zero row pointer followed by an explicit one-pixel skip, handled separately. Decoder checks exact row-byte and pixel counts on every frame.

PNG frame sequences are useful for inspection and future transcoding. Animation event tracks, frame durations, offsets/anchors, sound synchronization, and runtime palette changes have **not** been reconstructed; no guessed animation timing is assigned. Assets with invisible first frames are expected; inspect subsequent frames.

## Puzzle logic evidence

`PuzzleEngine.dll` contains reusable answer/container classes (`RPuzzle`, `RAttributeContainer`, `RHorizontalValueContainer`, etc.), rather than all game-specific generators. The main `Zoombinis Island Odyssey.exe` contains `RCatapultGame`, `RGlyphGame`, `RGardenGame`, `RCorralGame`, `RBarnGame`, and astronomical/greenhouse code. String references to `z3aNin.xml` / `z3aNout.xml` appear to support debug serialization; those files are not shipped in this extracted disc. Their absence is not evidence that the normal generator needs them.

MPS data includes names and readable expression text, but extracting strings is **not** reconstructing bytecode control flow. For example, the Catapult script contains dataset completion flags and weighting expressions. Its exact dataset selection and the native gear/cam dataset arrays still need decompilation. Generated native PE metadata maps imports; annotated disassembly resolves imported `rand`, `srand`, XML accessors, and relevant strings.

The most substantial native recovery is `logic/greenhouse-generator.json` and its focused `.asm`:

- At VA `0x405340`, a supplied nonzero seed is used; zero falls back to `time(NULL)` before `srand`.
- Levels 1/2 use template channel cardinalities 3,4,5; level 3 uses 3,6,6. These are internal packed channels; their complete visual/semantic mapping is pending.
- VA `0x404ea0` selects `TemplateN`, parses its `Num`, and chooses `T(rand()%Num+1)`. **All shipped groups have `Num="1"`**. Consequently this selection path only chooses T1, although Template3 also contains T2 and T3. All six are retained in the corpus.
- Three 12×12 template grids are transformed and packed using bit shifts 0,2,5. Transform codes 0..3 are identity, horizontal reversal, vertical reversal, and both; code 90 rotates clockwise. Level 3 uses code 90 for Template3; other channels use `rand()%4`.
- Zero-valued channel slots are filled by `rand()%cardinality+1` in row-major order.
- Levels 2/3 perform 20 accepted swaps. Each candidate pair comes from `rand()%144`. Equal indices are rejected; level 3 additionally requires equal low-two-bit attributes. Whole cells swap; rejected candidates do not count toward 20.
- Subsequent helper calls, final trait permutations, moth/beetle setup, and progress state remain unresolved. This is a static recovery with exact evidence addresses, not a runtime parity claim.

For the addresses above, PE file offset equals VA minus `0x400000`; the main source executable hash is in every native/logic evidence JSON. This offset relation is specific to these sections in this disc version.

## Validation and next work

The named archive extraction completed without missing archives, out-of-range entries, identifier mismatches, or filename mismatches. Independent verification compared all 1,447 payloads byte-for-byte against their source archive slices and verified all 13,921 PNG hashes, dimensions, and Pillow image integrity. An intentionally oversized AO2C chunk is rejected. Results are recorded in `validation.json`. PNG decoding validates every run and complete scanline; only the 11 explicitly recorded unsupported indexed variants remain unconverted. Background and sprite overview sheets were visually inspected: colors, alpha edges, glyphs, gear pieces, moths, character art, and scenery render plausibly. The Barn background uses resource 21000 as specified in its XML, not a presumed numbering interval.

Next priorities: decode the 11 palette variants; recover AO event/timing/placement tracks and lip-sync semantics; reconstruct the MPS instruction stream; complete native generator functions and constant tables per puzzle; then validate generator behavior against isolated original-game observations using known seeds. No web player or distributable asset bundle was created.
