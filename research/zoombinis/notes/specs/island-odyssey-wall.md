# The Wall — complete discrete puzzle specification

The recovered puzzle is an unknown substitution cipher combined with an irreversible interval-packing problem. It generates twelve tiles in every playable round, even when fewer than twelve Zoombinis enter. One correctly placed tile passes one incoming Zoombini; completing the incoming group ends play. Progression credit requires all twelve tiles. A locally correct placement is accepted without checking whether the other tiles can still fit.

The executable is SHA-256 `619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2`. Source guards also cover the original `z3a2.mps` and `z3a2.xml`. All instruction addresses are for this PE version; file offset is VA minus `0x400000` for the cited code. Machine-readable specification: `local/specs/island-odyssey/wall.json`. Reusable implementation: `tools/spec_io_wall.py`. The compiled MPS script is structurally decoded to `local/analysis/island-odyssey-wall/decoded-script.json`, retaining instruction and symbol offsets.

## State and moves

There are two rows over ten hieroglyph values, a hidden bijection from those values to ten tile symbols, and twelve ordered tile words. Tiles cannot rotate or reverse. A legal wall placement occupies consecutive empty cells within one row. At level 1 only the twelve four-cell indentations are allowed. At levels 2 and 3 every start fitting within a row is allowed, subject to occupancy. A wrong placed tile remains on the wall and can be lifted or returned to the floor. A correct tile is locked and its occupied cells remain unavailable.

The exact predicate at `0x427e70` counts indices `k` where `tile[k] == substitution[wall[start+k]]`. A full match accepts the tile. Level 1 flashes the number of correct positions without identifying those positions. Higher levels suppress these lights. A valid nonmatching placement uses one wrong attempt. Pickup, floor rearrangement, and invalid wall drops do not use attempts. Invalid drops restore the previous placement or leave a floor tile on the floor. There is no timer or general rearrangement budget.

On the fifth, third, or second wrong placement, respectively, input is disabled and a slab closes the door. Already passed Zoombinis remain passed. After the first passage, Go permits leaving with partial progress. There is no automatic test for an unsolvable remaining packing; a player may become stuck after an accepted alternative placement. This does not imply that every alternative match blocks the rest, or that only one complete packing exists.

Native placement/occupancy evidence: `0x427ee0–0x42822b`, `0x4282c0–0x42854c`, `0x428720–0x428838`. Match-count display: `0x424f40–0x424fbb`. Script setup: MPS instructions 1552–1576 and 1679–1740. Attempts, passage, termination and progression: 1811–1849 and 1970–2052.

## Difficulty

| Level | Wall cells | Tile length | Empty-board starts | Unused cells | Wrong limit | Feedback |
|---|---:|---:|---:|---:|---:|---|
| Not So Hard | 2 × 24 | 4 | 12 | 0 | 5 | Match count |
| Oh So Hard | 2 × 28 | 4 | 50 | 8 | 3 | Full match only |
| Very Very Hard | 2 × 24 | 3 | 44 | 12 | 2 | Full match only |

All levels use twelve tiles and ten symbol values. Level 2 adds boundary uncertainty, deliberately repeated windows, and irreversible overlap choices while removing experiment feedback. Level 3 shortens tile words, reducing the equality-pattern information within each tile, and has more unused cells. It does not simply enlarge the board.

## Exact generation and random order

`0x425900` invokes core `0x426210–0x42699e` before creating display objects.

1. Put glyphs 0–9 into the first ten array cells and mark the rest empty. For each of those ten positions, swap with `rand() % glyph_count`. Fill remaining empty cells in ascending order with `rand() % 10`. These two stages consume exactly `glyph_count` random calls.
2. Scramble the identity substitution with ten random-pair swaps (twenty calls), preserving self-swaps.
3. Level 1 uses starts 0, 4, …, 44. Higher levels distribute each row's extra glyphs among seven gaps, one `rand() % 7` call per extra, inserting six nonoverlapping tile windows per row.
4. At higher levels, shuffle indices 0–11 with twelve random-pair swaps and reserve the first three source windows. For each source in that order, enumerate candidate ranges in ascending row order, excluding already reserved blocks and excluding original tile-start cells from the range counts. Draw `rand() % total_weight + 1`, choose the counted start and copy a contiguous tile-length window there; reserve the destination. The exact unusual range weighting is implemented directly and verified. It is not replaced with uniform sampling over valid physical starts.
5. Derive tiles from the **final** wall at the original starts, applying the substitution. Shuffle the twelve floor positions using twelve random-pair swaps.

This consumes 92, 135 and 131 calls at levels 1, 2 and 3. There are no normal-play authored XML templates and no solvability rejection loop. The original twelve starts always constitute a disjoint full solution witness, including after the deliberate duplicate windows have been written. Randomness is compatible MSVCRT arithmetic with exact call order at entry, not a claim to reproduce a saved full-session seed.

## Validation and reproduction

`local/analysis/island-odyssey-wall/native-validation.json` records **309 original-function generator comparisons**, **6,360 original match-predicate comparisons**, **45 model solution witnesses** for incoming groups of 1, 5 and 12, and **15 model action scenarios** covering locking, occupancy, harmless invalid drops and exact wrong thresholds. All pass.

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_wall.py --validate --samples 100
python3 research/zoombinis/tools/spec_io_wall.py --export
python3 research/zoombinis/tools/spec_io_wall.py --seed 1 --level 3
```

Unicorn on this macOS host requires execution outside the sandbox because its JIT fails in the sandbox. This harness is memory-only: no game process, installer, original UI, network or filesystem access is executed. The generator uses explicit allocator, prior-display-cleanup and imported-rand hooks; the entire match predicate executes without a predicate hook. Discrete action tests are a model of decoded native/script branches, not an emulated scene. Screen-coordinate hitboxes, animation timing and external full-session RNG initialization are outside this specification.

Art remains local under `local/derived/island-odyssey/assets/z3a2` and `assets/z3a2cd`. Resource bindings include background 12000, tile symbols 12400, glyphs 12401, lights 12410, tile objects 12425/12431 and highlights 12429/12433. `assets-manifest.json` preserves archive offsets and hashes. Original help XML and manual PDF pages 18–19 and 34 corroborate the rules; the generator, thresholds and token objective above come from decoded code.
