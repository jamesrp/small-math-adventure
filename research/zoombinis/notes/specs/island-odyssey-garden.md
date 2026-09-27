# Island Odyssey — The Garden

Garden is a stateful classification puzzle. The generator secretly chooses which plant attribute governs columns, rows, and plots; the player establishes the value-to-coordinate assignments by making accepted placements. All holes initially allow all values, so the first plant fits anywhere. There is no hidden preassigned permutation of colors or shapes to coordinates.

Each plant has four independent four-valued features in native order: flower, stem, leaf, root. Level 1 selects one feature, level 2 selects two distinct features, and level 3 selects three distinct features. This yields respectively 4, 12, and 24 possible ordered attribute-axis assignments. The board has 4, 16, or 64 holes. Multiple plants can share a hole whenever their selected traits agree. Unselected traits are irrelevant to acceptance at every level.

An accepted planting locks its plant, fixes the chosen hole's selected values, removes those values from every still-empty hole, then restores each selected value along its matching coordinate axis. Previously filled holes retain their fixed masks. Every accepted placement extends consistent partial bijections and therefore remains extendible to a complete arrangement. The mathematical challenge is discovering the relevant features within the error allowance, rather than avoiding an irreversible packing dead end.

The complete rule uses a 16-bit allowed-value mask: four nibbles encode flower/stem/leaf/root, and each plant supplies one bit in each nibble. `tools/spec_io_garden.py` implements the exact native acceptance and propagation operations. It also provides discrete state/actions and the original RNG sequence: twelve plants × four `rand()%4` draws, then three distinct-axis draws using moduli 4, 3, and 2. Lower difficulties overwrite unused axes only after all three draws. Every normal generation uses exactly 51 RNG calls, including when fewer than twelve incoming plants are visible. Duplicate plants are allowed; there is no filtering or authored normal-play template.

Five rejected plantings end level 1; ten end levels 2 and 3. The sun is an error counter, not a real-time deadline. A rejected plant returns and remains available until this allowance runs out. Accepted plants pass tokens immediately; Go permits partial departure after the first. Completing a smaller incoming group also triggers progression, unlike Wall's twelve-token progression condition. The native speech discriminator compares hole capacity with literal twelve: with smaller groups it may describe an empty hole using the filled-hole response. The model preserves this edge case.

The native report passed 309 generator comparisons, 10,080 complete acceptance/propagation comparisons, and 13 original feedback-discriminator cases. Thirty complete solution witnesses and thirty rejection-budget scenarios exercise the discrete model. The original propagation block executes unmodified mathematical instructions; external answer-value and filled-string accessors are marshaled, then execution stops before display effects. Full UI, animation timing, and ambient RNG history are outside the parity boundary.

The complete machine-readable specification is `local/specs/island-odyssey/garden.json`; the validation report and decoded compiled script are under `local/analysis/island-odyssey-garden/`. Resource IDs, executable table addresses/file offsets, source hashes and manual PDF pages 24, 36–37 are preserved in that specification.

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_garden.py --validate --samples 100
python3 research/zoombinis/tools/spec_io_garden.py --export
```

Native validation uses the existing macOS JIT approval for bounded emulation in memory. Export and model use standard-library Python. No original game process is launched.
