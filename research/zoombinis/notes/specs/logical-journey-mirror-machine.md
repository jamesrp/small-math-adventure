# Mirror Machine: puzzle and difficulty specification

The executable rules are in `tools/spec_lj_mirror_machine.py`; structured data is in `local/specs/logical-journey/mirror-machine.json`. Addresses refer to Logical Journey SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. The model accepts the original RNG state at the stated function boundary. It does not treat that state as a new-game seed.

## State and legal play

A Zoombini is four values in `1..5`. A filter contains four channels: zero leaves a trait unchanged; a nonzero ordinary channel overwrites it with that value. At most one channel on a filter can cycle: `v -> (v mod 5)+1`. The picture initially displayed in a cycling channel is not its eventual fixed output. The native helpers recompute it from the incoming image every time the arrangement changes.

The machine has an input on the far left, a crystal image on the far right, and two images to compare at the center. Left filters act from left to right; right filters act from right to left. Equality requires all four resulting traits to agree. There is no restriction to the generator's intended solution; every equal-output arrangement passes (`0x442f20`).

At levels 1–2 the player chooses an unprocessed party member and one of eight crystal images. Level 2 has two immovable ordinary filters per side. At levels 3–4 the machine supplies the input and target, and the player inserts, removes or reorders six available filters, with at most three on each side. A card can only occupy one position. Insertion shifts later cards; removal closes the gap (`0x4416fb..0x441a17`). Consequently the solver represents each side as a contiguous ordered sequence. Empty-slot positions do not create additional mathematical solutions.

Pulling the lever commits the current comparison. A matching image rescues that character; a mismatch consumes that character's opportunity and leaves it behind. There is no independent pool of wrong attempts. In levels 1–3 the processed character is removed from the available list at `0x4428d4..0x44293a`; only a match is recorded among the rescued party at `0x440b2e..0x440bc2`. Both outcomes advance the processed counter at `0x440c42`. Completion means the whole incoming party has been processed; full success means all were rescued. There is no puzzle time limit.

Level 4 runs the same arrangement successively against two input/target pairs. Its second comparison follows automatically with the filters retained (`0x442c10`, `0x4432d7`). Results apply to the individual characters, so a setup can rescue one and fail the other. After the pair, the machine constructs another puzzle. An odd final party member has an absent second input, represented by four zero bytes.

## Difficulty branches

| UI level | Required inference | Available objects | Generator |
|---|---|---|---|
| 1 | Direct four-trait equality | Eight candidate crystal images | Random distractors plus one guaranteed match for a selected remaining character |
| 2 | Equality after overwriting traits | Eight images; two fixed filters on each side | Each fixed filter attempts to set one or two channels; masks on the right erase constraints on the chosen crystal |
| 3 | Ordered composition of constants and cyclic increments | Six movable filters; one target | Construct four useful filters, derive a target, add two independently sampled decoys |
| 4 | One composition working for two inputs | Six movable filters; two targets | Same four-filter construction; one perturbed useful filter plus one single-channel decoy |

This is a small algebra of transformations, not a requirement to use every card. A later constant can erase an earlier constant or increment. Cyclic increments preserve differences between two inputs; constants erase them. That is the structural reason the two-input test adds difficulty.

## Exact generation and round changes

`basic(level,state,first,refresh_remaining=...)` implements `0x443710`, the initial image construction in `0x443bc0`, and refresh `0x4435b0`. Every random bound, conditional draw, discarded draw and exit state is preserved.

Initial level-1/2 setup chooses a random incoming character. Eight random images consume four draws each; one randomly chosen position is overwritten with the required trait mask, filling zero channels with additional draws. Duplicates are allowed and there is no uniqueness test. Initial images use values **1–5**. After processing a character, refresh images use **1–4** for their random channels, though copied required traits can still be 5. Refresh's guaranteed index is drawn from `0..min(remaining,8)-1`, while all eight images are regenerated. This difference is native code, not a simplified sampler.

Level 2 regenerates its fixed filters every round. For each filter it draws a desired count of 1 or 2, then makes at most four attempts. Attribute and value candidate pools shrink after **every attempt**, including failed attempts. Left filters avoid repeating the accumulated value of a channel. Right filters independently probe an attribute, retain a left-side overwrite with a `>65` draw, or take an untouched target trait; a last-attempt rule prevents an entirely failed card. Repeated probes can overwrite an already chosen channel, so desired count is not guaranteed to equal the final number of nonzero channels. The resulting right composition zeroes unconstrained channels of the required image mask.

`advanced(level,state,first,second)` is the full `0x444070` generator. Its native matrices A/B/C retain their row numbers: row 0 inputs, rows 1–2 left construction, rows 3–4 right construction, rows 5–6 decoys, row 7 first target, B row 8 second target. Each useful filter visits the four attributes and chooses up to two channels, with threshold branches `>40` and `>70`, no replacement of sampled values, and a forced final channel if none has been selected. Forward filters update the first and second images together. Right filters are constructed backward with predecessor values for cyclic channels; target channels hidden by constants are randomized. The intended witness is left `[1,2]`, right `[3,4]` in native row numbering.

Level 3 samples the two decoys independently with the same one-or-two-channel shape. Level 4 chooses one side, copies one of its two useful filters, preserves its cyclic channel but increments every ordinary nonzero value, then gives the other decoy one random constant channel. Two apparently unnecessary source-index draws are retained because they advance RNG state.

The scene wrapper `0x441e30` separately permutes the six card display positions by sampling/removing indices `1..6` with bounds `6,5,...,1` before regenerating their contents. Identity display order is used when the native `0x49ccf0` flag is set. Initial object construction `0x443b20` consumes an additional group-index draw before entering the advanced core and creates the target/display objects afterward. These wrapper draws are explicitly separate from the core's entry-state API. Future levels 3–4 inputs are successive party entries (`0x4434c0`); levels 1–2 choose randomly among remaining entries (`0x4433a0`). Rendering, speech and animation may consume additional random values outside these boundaries.

## Native edge case and measured difficulty

The absent-second-input branch at `0x444290` writes the second input's increment into **A**, not B. This can break the constructed witness for a one-character final round. It is preserved in the model. Exact enumeration found no valid filter arrangement for level-3 core states `4,28,31,69` and level-4 states `4,28,31,33,38,69`, for first input `[1,2,3,4]`, absent second input, and tested states `0..99`. This establishes a generator-boundary defect; it does not establish how often those entry states occur in a complete playthrough.

For the same 100 states with first `[1,2,3,4]` and second `[5,4,3,2]`, all instances were solvable. Level 3's minimum filter counts were 0:2, 1:12, 2:35, 3:38, 4:13 instances. Level 4's were 2:19, 3:54, 4:27. These are exact minima for these instances, obtained by enumerating every pair of disjoint ordered sequences of at most three cards per side. They are not population estimates or a uniqueness claim. Data and witnesses can be reproduced with `--analyze`.

## Evidence, assets and verification boundary

`smoke.mhk` supplies scene art/animation; `zoombini.mhk` supplies shared character/help resources. Help STRL resources 2700/2720/2740/2760 describe the four difficulties; manual PDF pages 31 and 42 describe play. The structured spec binds extracted archives by hash and the corpus manifest gives resource IDs, offsets and decoded files. Scene initialization is `0x43fde0`, fixed filters `0x443710`, advanced generator `0x444070`, cycle refresh `0x442400/0x4424f0`, equality `0x442f20`, and round generation `0x441d20/0x441e30`.

Validation: **1,600** initial/refresh level-1/2 cases; **816** advanced cases including **204** absent-second-input cases; **2,448** native transformation/equality checks; **612** constructed-witness checks for nonzero second inputs. Generators match their complete random traces, exit states and relevant output fields. The native comparator and both cycling helpers run unchanged. Entity lookup and graphical allocation are replaced with isolated memory/descriptor recorders. The native game is not launched.

Run `research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_mirror_machine.py --count 100` for parity and add `--analyze` for exact difficulty enumeration. The puzzle-state rules and generator boundaries above are specified; pixel hit testing, animation event timing and shared campaign persistence remain outside this work's scope.
