# Snowboard Gulch

The recovered puzzle is a four-way classification problem with two initial unblocked examples. Higher levels hide the chart, increase the mistake allowance, and at level 3 change each equality test into membership in a two-value set. The native generator, including its 5,000-candidate fallback, is independently reproduced. An independent event model reproduces launch, opening, collision, arrival and rescue transitions given explicit movement and animation observations.

Sources: supplied Mountain Rescue executable SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`, manual PDF pages 22 and 33, and 51 extracted Snowboard asset records. Machine contract: `local/specs/mountain-rescue/snowboard-gulch.json`. Model: `tools/spec_mr_snowboard_gulch.py`.

## Rules and visible information

A hidden depth-two binary tree has three internal nodes. The root tests one trait axis. Both child nodes use the **same** second trait axis and values, distinct from the root axis. A match goes to child `2*i+1`; a nonmatch goes to `2*i+2`. Leaves 3–6 are the four routes. At levels 1–2 a match means equality to one value; level 3 accepts either of two distinct values on that axis. This is two trait tests, not three independent branching rules.

| Level | Values accepted per axis | Chart | Initial unblocked descents | Mistakes that close the slope |
|---|---:|---|---:|---:|
| 1 | 1 | Visible | 2 | 3 |
| 2 | 1 | Covered | 2 | 5 |
| 3 | 2 | Covered | 2 | 5 |

There are 300 distinct semantic rule pairs at levels 1–2 (`4*3*5*5`) and 1,200 at level 3 (`4*3*10*10`). Generation is conditioned on party spread, so these are candidate counts, not an assertion of equal output probabilities. The chart repeats the lower test at both child positions. Higher levels draw `board01.bmp`/`board01-a.bmp` over the chart; the ending reveals it.

The player selects a character to launch, rather than choosing a fork. Its traits determine the entire path. During the initial two descents, collision handling is disabled. The second arrival activates the blocking phase. Thereafter one route is open and three have Norfs. The open route is chosen by drawing `rand()%4` until a still-launchable character belongs to it. Thus known rules always provide a safe choice. Each later descent requests another opening only if it arrives in active phase 2. An arrival while speech phase 5 is still active does not make that request.

A collision spends one mistake, plays a randomly selected audio variant and pauses collision handling in speech phase 5. Every second collision also requests a blocker change while the descent is active. The moving character continues to the exit; its exit-completion callback marks it rescued. At descent completion, closure occurs if mistakes exceed 2/4/4. This disables later launches, and does not revoke the current character's eventual success flag. A partial departure retains successful characters.

The initial two free examples and rescue-on-mistake matter when measuring difficulty: an incorrect hypothesis can consume the shared budget without losing the tested character. At the event-model boundary, full known-rule rescue has a direct witness: launch any two characters, then wait for each requested opening and choose a remaining character on it. This assumes eventual arrival, idle and exit observations; it does not establish every physical timing interleaving.

## Exact generation

Setup at `0x42e99f` creates the four-route state; `0x42eaa6…0x42ede6` performs candidate search. `0x42bd00` computes the party histogram.

1. Draw the root axis with `rand()%4`. At levels 1–2 draw one value `rand()%5+1`. At level 3 draw two values; equality restarts the root axis and both value draws.
2. Draw the second axis until it differs from the root. Draw its values in the same way. At level 3 equal values restart second-axis selection and its value draws. Copy the complete second predicate to both child nodes.
3. Classify every launchable party member into one of four leaves. Start score at 10, subtract 3 for an empty bin, 1 for a singleton, and `count-5` for a bin larger than 5. Counts 2–5 incur no penalty.
4. Accept score at least 7. Otherwise repeat, up to 5,000 complete candidates. On exhaustion retain the **last** candidate, without requiring the target balance. This is not a best-so-far search.

The native helper `0x45be90` appears to seek a trait value present in the party. It samples once and scans for membership, but its unsigned byte 255 is then compared with integer −1. The retry branch cannot fire. The actual returned value is always the original single `rand()%5+1`, including values absent from the party. The independent port preserves this behavior; 400 native helper cases confirm one call per sample.

Identical parties and parties of fewer than five members cannot reach score 7. The bounded fallback still produces a valid classifier. Balance is a preference, not the mechanism guaranteeing safe play: the open-route selector separately conditions on remaining characters.

RNG is MSVCRT: `state=(214013*state+2531011) mod 2^32`, `rand=(state>>16)&32767`. Failed axis/value draws and failed complete candidates are retained in order. The model seed is the entry state, not a whole-session seed; speech, animations and later opening draws use the shared stream elsewhere.

## State transitions and boundaries

The scene stores mistakes at `+0x20`, the two-collision counter at `+0x34`, descent count at `+0x10d`, and phase at `+0x110`. Relevant phases are 0 introductory, 1 activate blockers, 2 active, 3 closing, 4 complete, and 5 speech. Character `+0x38` controls launch eligibility and `+0x5c` records rescue.

The preferred API is `tools/spec_mr_snowboard_events.py`: `new_state`, `launch` and `tick`. Launch immediately removes the active character from the population used to select openings. A tick receives speech/Norf animation busy flags, arrival or collision, and completed exits. It applies exit success first, including after closure; processes an eligible pending opening before phase changes; processes speech completion; then handles the moving character. This ordering is compared against the original native branches, including RNG draws.

An arrival during speech does not request a new opening, and speech completion alone does not create a request. A request already pending during speech cannot run before the following tick. Every second collision requests another opening; the logical core has no one-collision-per-descent guard. Actual contacts remain supplied movement observations. The original opening selector has no empty-population fallback: the API exposes that rejection loop explicitly. The diagnostic states demonstrating it are not claimed reachable with ordinary shipped timing.

`settle` in the generator tool remains an offline convention receiving `next_open` explicitly. Use the event API when studying interleavings. Actual spline contacts, audio duration and Norf animation completion are outside the recovered event model; a whole-engine movement trace has not been compared. The source fields, exact tick order, native stubs and event witnesses are preserved in `event-contract.json`, `event-validation.json` and `event-witnesses.json` in the family analysis directory.

Normal campaign advancement checks exactly eight successful members. Save counter `+0x177c` increments and resets when it reaches three; difficulty `+0x13f8` then increases, capped at three (`0x42d2ec…0x42d361`). This source block does not establish that the successes must be consecutive.

## Validation and reproduction

The original x86 setup, full candidate search, random helper and histogram are executed in isolated memory. Allocation and free are stubbed; no original OS process or UI is run. Passed:

- 336 generator cases with exact predicates, counts, attempt counts, final RNG state and complete ordered random trace; 300 balanced cases and 36 original 5,000-attempt fallbacks.
- 1,875 character partition comparisons covering all 625 trait tuples at each level.
- 400 value-helper cases and 765 opening-selection cases covering every nonempty subset of eight characters.
- 42 collision-counter, 84 closure, 48 arrival and 48 exit-success cases.
- 57 native launch and 696 ordered event cases, plus nine bounded empty-population rejection diagnostics.

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_snowboard_events.py --validate
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_snowboard_gulch.py --validate --validate-actions --export
python3 research/zoombinis/tools/spec_mr_snowboard_gulch.py --level 3 --seed 42 --party-json '[[1,2,3,4],[2,3,4,5],[3,4,5,1]]'
```

Native execution uses the existing Unicorn environment and its approved JIT context. Pure generation uses standard Python. Source slices and result reports are in `local/analysis/mountain-rescue-snowboard-gulch/`. Original `.pat` curves, coordinates, timing fields and source hashes remain in the decoded asset corpus; they are not flattened into an assumed movement speed.
