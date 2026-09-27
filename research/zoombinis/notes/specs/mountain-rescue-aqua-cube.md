# Aqua Cube: recovered puzzle specification

`tools/spec_mr_aqua_cube.py` contains the procedural generator, a discrete gameplay model, original-function comparisons, and an exhaustive difficulty calculation. The structured specification is `local/specs/mountain-rescue/aqua-cube.json`; source assets and generated evidence remain local.

The executable is `INSTALL/HD/zoombini2.exe`, SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. Listed virtual addresses have file offset VA minus `0x400000`. Every extraction and native test checks this source hash.

## State and actions

The input party is the actual ordered list of 1–16 arriving characters. Their traits do not matter. Vertices contain character lists, a Fleen, the starting light, or nothing. A normal lever follows one authored adjacency column and spends one turn on arrival. Revisits are legal and cost a turn; previously collected bubbles are empty.

A warp first consumes one available warp and opens a timed selection interval. **Selection is a set of levers:** repeated clicks set the same byte to 1 again, rather than toggling it or adding another move. When the timer expires, the selected levers execute once each in ascending lever index. Intermediate bubbles are not evaluated. Only the final bubble is evaluated, and the entire operation costs one turn. Selecting no lever still spends a warp and a turn. The timer is configured as seven frames of `0x359` (857) clock units at `0x405a24–0x405a9d`, with callback `0x403cc0`; the model exposes timer expiry as an event.

A safe arrival moves every character in that bubble to shore and sets its success byte `+0x5c` and collected-ever byte `+0x64`. The bubble’s count becomes zero. A Fleen arrival removes that Fleen and then **scatters every character already on shore**. The callback `0x4037a0` selects shore characters by `y < 100` and clears their success bytes. These characters never return to their bubbles. Play can continue to rescue characters not yet collected.

The scene ends when the turn budget is spent or every character has been collected at least once. The latter uses the collected-ever byte, including characters subsequently scattered by a Fleen (`0x4027b6–0x40283f`). The final turn still processes its arrival. Full success requires every arriving character to remain rescued; partial success preserves only the currently retained shore group. A board ending does not itself imply full success.

Native boundaries are movement `0x4019e0`, arrival `0x402260`, Fleen callback `0x4037a0`, warp selection `0x4034cd–0x40362d`, and warp execution `0x403027–0x4033bb`. Input ignores movement, rescue, and Fleen animations and ended scenes. Pixel hit testing, interpolation, shared Go/save behavior, and asynchronous input interleavings during warp execution are outside the discrete model.

## All three difficulty branches

| Level | Vertices | Levers | Fleens | Total turns | Available warps |
|---|---:|---:|---:|---:|---:|
| 1 | 8 | 3 | 1 | 6 | 0 |
| 2 | 8 | 3 | 1 | 6 | 1 |
| 3 | 16 | 4 | 4 | 11 | 2 |

The warp allowances are **within** the total turn budget. The manual’s “six moves, plus one warp move” wording should not be translated into seven total turns. The six-word parameter records start at `0x4890b0`; authored vertex records start at `0x489240` (8 records) or `0x489480` (16 records), each 72 bytes. The tool exports these tables with byte-range hashes and provenance.

The generator is `0x403f73–0x4055ba`. It assigns each lever a distinct axis by repeated `rand()%d`, rejecting previously assigned axes; immediately after each accepted axis it draws `rand()%2` for its reflection. Physical coordinate labels are converted into logical bits from these reflections. Coordinate bit order is UD, LR, FB, XC, whereas authored adjacency column order is LR, UD, FB, XC. The model preserves that distinction.

- Level 1 puts a Fleen at logical `111` and the light at `000`.
- Level 2 uses the same Fleen, then one `rand()%3` chooses start `001`, `010`, or `100`.
- Level 3 puts Fleen type 1 at `1111`. One `rand()%4` chooses type 2 from `1110, 1101, 1011, 0111`; type 3 is its complement. Further `rand()%8` draws select among those four patterns followed by their four complements until an unoccupied pattern is found for type 4. Start is `0000`.

Finally, scan physical vertex indices in ascending order, skipping the start and Fleens, and distribute party indices cyclically across the remaining vertices. No further random calls or trait comparisons occur. A full party places up to three characters in each bubble. Smaller parties leave some safe vertices empty.

The CRT RNG is `s = (214013*s + 2531011) mod 2^32`, with output `(s >> 16) & 32767`. Seeds refer to the generation entry. Decorative animation consumes this RNG during play, so these are not whole-game launch seeds. The extra native level-4 branch uses level-3 parameters but a random safe one-hot start; it is tested as diagnostic only. Normal campaign progression caps difficulty at 3 (`0x401fec–0x402052`, save level `+0x13dc`).

## Exact difficulty result

For a full 16-character party, every safe target contains characters. The six/eleven-turn budget equals the number of target bubbles, so full success must collect a new target on every turn. Subset dynamic programming over all target orders determines the minimum number of warp arrivals: an adjacent target costs no warp, any other distinct target costs one warp.

The calculation covers all 1, 3, and 24 logical generator choices at levels 1, 2, and 3; reflections and lever permutations preserve the graph. Every case has a model-replayed full-rescue witness. Level 1 requires zero warps, every level-2 case requires exactly one, and **every level-3 case also requires only one**, despite allowing two. The second warp provides flexibility rather than a universally necessary extra operation. This result assumes the lever mapping is known; learning the mapping without wasting turns remains part of play.

## Evidence and reproduction

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_aqua_cube.py --validate-generation --validate-actions --analyze-difficulty --export
```

Unicorn must run outside this host’s restrictive memory-mapping sandbox. The Windows game is never launched. Original arithmetic and state transitions execute in isolated memory; allocation, sound, graphics, narration, and animation settlement have explicit boundaries.

Passing evidence under `local/analysis/mountain-rescue-aqua-cube/` includes 400 complete generator/RNG comparisons; 112 single-edge moves; 2,199 legal arrival transitions; 265 Fleen scatter callbacks; every 24 warp subsets across levels 2 and 3, including empty subsets; 21 repeated queue clicks; and 24 warp activation gate cases. Early completion checks execute the original collected-ever predicate. The difficulty report covers all 28 logical choices and includes replayable witnesses.

The structured specification binds 48 source files under `Data/Bmp/AQUACUBE/`, with hashes and available frame counts. Full image offsets and decoded paths remain in `local/derived/mountain-rescue/manifest.jsonl`. Manual PDF pages 17 and 30 corroborate the visible puzzle; generator details, exact turn accounting, repeated-click semantics, and Fleen loss behavior come from native code and comparisons.
