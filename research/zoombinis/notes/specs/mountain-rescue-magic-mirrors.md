# Magic Mirrors — discrete puzzle specification

Normal generation, every mirror action, feedback, the level-one target change, ammunition costs and rescue outcomes are modeled in `tools/spec_mr_magic_mirrors.py`. The full specification is `local/specs/mountain-rescue/magic-mirrors.json`; original authored data stays under ignored `local/`.

| Level | Mirrors per board | Boards | Shared cannonballs | Generation |
|---|---:|---:|---:|---|
| 1 | 3 × 2 | 6 | 12 | 123 authored templates, randomized by permutations |
| 2 | 9 × 6 | 1 | 8 | 54 distinct random four-trait tuples |
| 3 | 12 × 6 | 1 | 6 | 72 distinct random four-trait tuples |

## Exact generator and scoring

`0x4549d0` dispatches to `0x454cd0`, `0x454f90` or `0x4550b0`. Level one draws a template with `rand % 123`, a rejection-sampled permutation of six positions, a permutation of four trait categories, then four permutations of five trait values. The five stored distractors and implicit all-zero target are transformed by these permutations. The 123 unique authored records occupy 9,840 bytes at VA `0x4a47e0`, raw offset `0xa47e0`; each exported record carries its offset and hash. Every board contains six distinct tuples.

Levels two and three draw four values `rand % 5 + 1`; an exact duplicate of an earlier tuple causes all four values to be redrawn. After filling the board, one `rand % number_of_mirrors` selects the target. There is no solvability, information-gain or attempt-budget filter. All four trait categories use positional equality.

`0x455310` marks the selected mirror and returns the number of traits equal to the target. **On level one, hitting the initial target on the first shot changes the target to the first authored distractor before computing feedback.** The scene passes the prior shot count at `0x430db4`; the count resets for each new board. No random draw accompanies this change. A first-shot success is therefore impossible. Other shots cannot change the target. Invalid coordinates and repeated shots return -1 without modifying shot flags or the target. A read-only helper, `0x455410`, compares traits without retargeting.

The native generator's RNG state means state at function entry. The next-board callback `0x42f330` consumes a cosmetic `rand % 16 + 15` draw before the next generation; further time-dependent animation calls share the RNG. Generator parity is therefore not a claim of replay from one campaign seed.

## Attempts and success

Every launched shot spends a projectile, including a successful shot. Cannonballs are used first. Afterward the last remaining party member is automatically loaded as the next projectile, removed from the party when fired, and returned to the game's rescue pool. Native block `0x431095` performs ball decrement or vector removal. With no balls and only one character left, an unfinished board ends; that last character is not offered as another shot, and its success flag is cleared (`0x42fca0`). The exhaustion branch was tested separately. A final correct hit takes precedence over the reload/failure branch.

Level one requires six completed boards, with no refill between them (`0x42f330`, `0x42f850`). Completing an early board does not rescue a subset. The surviving party continues only after all six targets are found. Levels two and three require one target. Full success preserves every incoming character; partial success finishes the required boards after sacrificing some characters. Thus an eight-character party has at most seven sacrifice shots beyond its initial balls.

The rule generator also contains a fourth, diagnostic level: 72 mirrors and two distinct targets, with feedback encoded as first-target matches plus ten times second-target matches. It is separately tested but is not counted as a normal campaign difficulty.

## Reproduction and checks

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_magic_mirrors.py --validate --validate-actions --export
```

Unicorn native runs use the approved unsandboxed invocation on this macOS host. Source SHA-256 is checked before extraction or execution: `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`.

Passing original-function comparisons: 252 normal and 84 diagnostic generator/RNG cases; 18,816 mutating and 18,816 read-only evaluator cases; a further 738 level-one generations covering every template and every possible first-shot position, with 4,428 shot/state comparisons; 44 projectile costs, 64 exhaustion branches and 18 panel transitions. Generation retains the original allocator/constructor path with isolated allocation and thread-data hooks. Evaluators run without rule substitutions. The local specification binds 38 graphics resources with provenance.

This is complete for the declared discrete normal-puzzle boundary. Pixel hit testing, animation interpolation, asynchronous event races, generic save/menu/Go infrastructure, and a fourth-level scene replay are outside that boundary. Manual evidence is on PDF pages 21, 32 and 33.
