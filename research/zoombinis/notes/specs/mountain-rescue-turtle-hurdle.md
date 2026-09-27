# Turtle Hurdle: complete puzzle logic

The executable model is `tools/spec_mr_turtle_hurdle.py`; the detailed machine-readable spec is `local/specs/mountain-rescue/turtle-hurdle.json`. Source executable SHA-256 is `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. Every native address below is a VA in that executable; its file offset is VA minus `0x400000`.

## State, placement and termination

The party normally contains 16 characters, each with four traits valued 1–5. Native character bytes `+5..+8` hold those traits. The hidden rule chooses one ordering of a primary trait and, at level 3, one ordering of a distinct secondary trait. Sort the **actual arriving party** by the active trait ranks to obtain the reference sequence. A character may occupy any slot whose reference character has the same active trait key. Identical primary traits at levels 1–2, and identical primary/secondary pairs at level 3, are interchangeable; the puzzle does not require a particular character identity within a tie.

The action is placing an unplaced character on an empty turtle while the dock still has supports. A correct placement fixes that character there. An incorrect placement consumes one support and moves the character to the **highest-index unoccupied acceptable slot**. This is the result of the native target-search loop overwriting its result for each eligible position (`0x416013..0x41607c`), not an arbitrary modeled tie break. The character remains rescued even on the final incorrect placement.

Once every character is placed, the full party can continue. When supports reach zero, additional placement is disabled and only the placed characters can continue; the rest are stranded. Correct placements do not consume attempts. Occupied characters are not available for later rearrangement. Wrong placements reveal an actual position rather than adding a clue on the log. There is no puzzle time limit. Busy animation temporarily blocks input but does not alter the settled puzzle state.

The reference validator is `0x4012d0` with nested two-key sorting helper `0x4016a0`. The drop callback is `0x415e70`; support decrement is `0x415fd2..0x415fd9`, acceptance/correction success flags are `0x416289` and `0x4162d6`, and terminal dock/completion behavior is `0x415380..0x4154e7` plus `0x416540` and the update branch at `0x415527`.

## All three difficulty branches and exact generation

| Level | Ordering | Clues rendered | Incorrect-placement allowance |
|---|---|---|---|
| 1 | Primary trait only | All five primary value-order cells | 3 |
| 2 | Primary trait only | Randomly one or two distinct primary cells | 5 when one clue; 4 when two |
| 3 | Primary then secondary trait | One index, with both trait rows shown at that index | 6 |

The level-2 five-support branch is real native behavior; the manual's fixed four-support description omits it. Level 3 has another implementation detail: the generator independently draws a primary clue index and a secondary clue index, but the renderer tests only the primary mask before drawing **both** rows. The second random draw still advances the RNG state. This is directly visible at `0x4165ba`, `0x416661..0x416693`.

Constructor `0x401000`, parameter generator `0x401060` and clue/support generator `0x401180` form a complete generator boundary. Given the 32-bit CRT state immediately before entry:

1. Draw the primary axis with `rand()%4`, remove it from `[0,1,2,3]`.
2. Create the primary value permutation by removing one element from `[1,2,3,4,5]` at each draw, with moduli `5,4,3,2,1`.
3. Draw the secondary axis with `rand()%3` from the remaining axes, then its value permutation with the same five removal draws.
4. Level 1 has no more draws. Level 2 draws `k=rand()%2+1`, then samples `k` indices without replacement from `[0..4]`. Level 3 draws two indices independently with modulus 5, one for each internal clue mask.

There are 12 generator draws at level 1, 14 or 15 at level 2, and 14 at level 3. The CRT recurrence is `state=(214013*state+2531011) mod 2^32`, result `(state>>16)&32767`. There is no puzzle rejection or fallback. A complete solution always exists by sorting the party. The internal level-4 branch is diagnostic: two axes, no initial clues, seven supports; it is kept separate from the three normal difficulties.

## Assets and provenance

The JSON spec binds 51 extracted source files, each with source path, SHA-256 and format, under `crazy_turtle` and `mystic_marsh/TRAITS`. It references the common extraction manifest for frame-level offsets and decoded files. Native trait rendering indexes `6*axis+value` at scene `+0xbc2c`; five value cells are shown for each active axis. Turtle placement records are at `0x48be60` (16 records of 12 bytes), and clue coordinates are at `0x48bd90`. Original graphics remain under the local corpus.

## Verification and reproduction

From the project directory:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_turtle_hurdle.py --validate
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_turtle_hurdle.py --validate-actions
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_turtle_hurdle.py --export
```

The native generator matched all bytes, random values and final RNG state for **400 cases**: 100 each for levels 1–3 and diagnostic level 4. The complete native placement validator matched **36,024 predicates**, including party sizes 1–16 and deliberate twins. An additional **258 scene placement decisions** matched support counters, accepted slots and correction targets: 55 correct and 203 incorrect. The last test runs the original drop callback through its decision side effects and stops before the wrong-placement spline animation; graphics/audio functions are inert stubs. Native trait validation is not stubbed. The low-level oracle maps only isolated memory and never launches the game.

Results are in `local/analysis/mountain-rescue-turtle-hurdle/{parity,action-parity}.json`. Animation timing, pixel hit testing and shared campaign menus/saves are outside this puzzle specification. There are no unresolved generation or trait-rule questions within the stated valid-input boundary.
