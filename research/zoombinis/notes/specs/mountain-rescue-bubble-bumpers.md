# Bubble Bumpers — recovered rules and generation boundary

The discrete movement engine, insertion rules, rescue outcome and difficulty progression have independent Python models and original-function comparisons in `tools/spec_mr_bubble_bumpers.py`. Levels two and three also have independent generators. Level one has an exact native-backed generator, a separately checked best-of-30 selector, and an independently ported initial trait-selection prefix. Its full candidate builders are not yet a standalone high-level port. The specification therefore remains explicitly **partial at the generator memory boundary**, rather than claiming seed-only parity.

| Normal level | Authored layouts | Entrances | Generation and adjustment |
|---|---:|---:|---|
| 1 | 2 | 1 | Random layout builder; retain best of at most 30 candidates, stop at first quality 12 |
| 2 | 4 | 3 | Three trait predicates from roster partitions; remove devices at party-size thresholds 7, 6, 5, 4, 3, 2 |
| 3 | 2 | 2 | Character-pair selection, four trait categories and randomized value permutations; remove devices at thresholds 7, 6, 5, 4 |

All layouts are 16 columns by 12 rows. Eight normal authored grids occupy 36,864 bytes beginning at VA `0x4941f0` (raw offset `0x941f0`). The export retains every six-int cell, its original byte range, hash, layout index, and entry coordinates. The native device-name table at `0x49069c` binds 60 named symbols to resources. The specification links 97 decoded marsh graphics/animation resources with their source hashes and frame provenance. Original data stays under ignored `local/`.

## Actions and exact movement

The player chooses a waiting character and an entrance, then lets the board advance. Once launched, the character cannot be steered directly. A scene launch callback has a one-second pending phase; the discrete tick waits for pending launch and movement animation to settle. The model covers settled rule steps, not pixel hit testing or asynchronous timing races.

The 62 device types include ordinary directional arrows; conditional arrows that test one trait; two- and three-state cycling arrows; one-time arrows; rotations and elbows; seven trigger IDs; corresponding magnetic holding spots; whirlpools; and exits. The executable model and JSON export include the exact direction and cycle maps.

A tick first moves ordinary bubbles, then marks occupied triggers, then releases or pushes held bubbles through magnets. A bubble arriving at an occupied magnet replaces the held bubble and pushes that bubble along its incoming direction. The engine can repeat magnet passes to propagate a chain. It uses the result of the final eligible magnet, which is preserved literally in the Python model. It then records exits and whirlpools, resolves collisions and swaps, changes cycling devices, and retains bubbles that did not advance.

Two bubbles converging on the same ordinary cell, or swapping their positions across an edge, are normally lost. Whirlpool arrivals are handled separately on the next tick. Native temporary cooccupancy uses `old_id + 1000 * new_id`, including its asymmetric behavior for character zero; the port does not replace it with an idealized collision rule. Compound tests cover both character orders.

## Success, partial rescue and difficulty progression

A character is rescued when an old occupant is on an exit cell (`62`). A character entering a whirlpool (`58`) or losing a collision gets its lost flag set. Scene block `0x425fcc..0x42603c` declares all characters resolved when rescued count plus lost count equals the incoming count. This is not the full-success condition: rescued characters may continue even when others are lost or trapped.

There is no global mistake or move limit. Each character has one launch for a board. Characters still trapped when the scene is left return to the prior rescue pool. The manual describes these partial outcomes on PDF pages 20 and 32.

The campaign progression block (`0x4251d5..0x42524b`) counts a success only if exactly eight incoming characters are all rescued. It increments save field `+0x1768`; on the third success, it resets that field and increments difficulty `+0x13e4`, capped at three. A partial crossing does not increment or reset this counter.

## Generator details and memory dependencies

`0x441a60` dispatches to the level-specific generators. Levels two and three have complete board/RNG parity within the declared input boundary. Each random draw uses the original CRT transition and modulo reduction; rejected draws remain in the trace.

Level two (`0x443de0`) selects the first category/value having the largest positive frequency strictly below a requested limit. It fills a first subset using marked rejection sampling. The second subset stores positions within the first subset, then later treats those positions as original roster indices; random additions are not marked and may repeat. The port retains these details. It chooses one of four grids, inserts three predicates, and prunes devices according to party size. Erasing a cell preserves the sixth metadata field.

Level three (`0x444fa0`) tries pairs differing in at least two traits, then falls back to one difference. Differing categories are considered in order 3, 4, 1, 2. A cross-trait count controls retries and best-value fallback. The original retains best values but not their categories; the model follows that assignment order. Rejection-sampled value permutations include draws whose results are not ultimately placed on the grid.

Level one is exposed by `tools/spec_mr_bubble_level1.py`. Its original candidate functions `0x441d70` and `0x442a30` execute in isolated memory. Every candidate, quality, RNG chunk and selected final grid is exported. Selection is independently checked: first quality 12 ends the search; otherwise the first strictly best candidate among 30 is retained. Quality is not treated as a proof of gameplay solvability.

The independent prefix/helper port, `tools/spec_mr_bubble_level1_traits.py`, establishes that four uninitialized value-five scratch words and the caller's old `BL` byte affect trait selection. Identical roster and seed can produce different results with different initial bytes. The native backend makes stack fill explicit; it does not pretend these bytes are determined by the random seed.

The helper can also return before writing predicate B. With party `[[5,5,5,5],[1,5,5,5]]`, seed zero and four zero old value-five words, it selects A = `(1,1)`, exhausts the selectable table, and returns 1. Both builder prefixes then read B's untouched old category at frame `B+0x48` and old value at `B+0x3c`. Six original-prefix comparisons cover both builders and old B values `(0,0)`, `(3,2)` and `(4,5)`, checking predicates, orientation, initial score and RNG. These old output slots are additional replay inputs. C selection also leaves `BL` nonzero, so D accepts its first random draw.

Two separate diagnostics ran the original helper for at most 20,000 instructions. Party `[[5,5,5,5]]` with zero old value-five words has no eligible first sample; party `[[1,5,5,5]]` with an extra existence-scan word equal to 2 reaches a second-sample rejection loop without an eligible candidate. Both calls exhausted their instruction budgets. The scans read four output-pointer arguments and an extra caller word beyond the selectable table, so an extra 2 can falsely indicate availability. The independent helper raises `NoCandidate` for an empty eligible set; that is an explicit model signal, not a native return value. These bounded observations support the static loop analysis and are reported separately from completed parity comparisons.

There is a separate heap dependency: rule constructors `0x441480` and `0x441620` allocate character records and copy only trait bytes `+5..+8`. Constructor `0x45bf00` does not initialize byte `+4`. When level two's selector returns category zero, subsequent code reads that byte. The pure model exposes `pretrait_bytes`, and 36 native comparisons exercise values 0, 1 and 255. Zero remains a stated isolated-memory default, not a recovered fact about the original allocator.

A rejection loop with no eligible outside-subset trait does not have a native termination branch; the Python model raises an explicit error. Single-character and repeated-identical-trait level-three fallbacks are not fully characterized as concrete-memory executions. No universal generation or solvability claim is made for those inputs. Diagnostic level four is also outside this three-level specification.

## Reproduction and validation

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_bubble_bumpers.py --validate --validate-generators --validate-interactions --validate-lifecycle --validate-metadata --validate-fallback --export
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_bubble_level1.py --validate
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_bubble_level1_traits.py --validate
```

Use the approved unsandboxed native invocation on this macOS host; Unicorn cannot initialize safely inside the sandbox. All source addresses are guarded by executable SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. The game and installer are never launched.

Passing checks: 880 full level-two/three generator cases plus 256 targeted level-three fallback cases, 496 individual-device ticks, 240 compound ticks, 2,400 ticks across 24 generated boards with 192 launches, 504 insertion cases, 164 resolution predicates, 54 progression predicates, 36 heap-byte generator cases and 12 category-zero arrow ticks. The generator tests use party sizes 2–8 normally and 9–12 diagnostically.

Level-one evidence adds 270 native generator exports, 5,607 candidate/selection comparisons, six independent selector edge cases, and 1,266 helper/prefix comparisons: 180 trait-helper cases, 1,080 regular prefix cases and six untouched-B early-return cases. Two further 20,000-instruction rejection-loop diagnostics are counted separately. Of the 270 generator exports, 90 use normal eight-character rosters and 180 are smaller-roster diagnostics. Ninety reached quality 12 early; 180 used all 30 attempts. These checks validate the stated function and memory boundaries; they do not reconstruct the original process's allocator or stack history.
