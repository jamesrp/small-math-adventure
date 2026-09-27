# Mudball Wall: complete puzzle specification

`tools/spec_lj_mudball_wall.py` is an executable specification of board generation, the control-to-cell mapping, target rewards and settled shot actions. It reproduces the supplied Logical Journey executable, SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. The structured companion is `local/specs/logical-journey/mudball-wall.json`.

## State, actions and outcomes

The visible wall has targets bearing one, two or three dots. Each dot represents one arriving Zoombini rescued when that target is first hit. All targets together sum to the actual incoming party size, not necessarily 16. The player selects categorical controls with five values each, then fires. The complete control tuple identifies exactly one cell. The impact location is visible, so a miss is also information about the hidden mapping. Previously hit cells remain marked. Changing controls is free; each launched mudball spends a shot, whether it hits a target, an empty cell or an already hit cell. A repeated hit awards nothing.

Level 1–2 controls are mudball color and shape. Levels 3–4 add the shape's color. The model uses native control-bank order `(extra, middle, last)` at `0x49b3fa/0x49b422/0x49b41c`. Initial values are independently drawn from `0..4` before the board generator, so the machine begins with valid selections. Changing a control selects a value, not a relative movement. A shot is legal only when the required controls are selected, the previous animation has settled and the shot-exhaustion flag is unset (`0x42dcf0`).

A target hit awards its dot count once, marks the cell `-1`, and dispatches that many characters over the wall. An empty/repeated hit also marks `-1` and awards zero (`0x42f0f0`). Full success is rescuing every arriving character. Once ammunition is exhausted, only those already rescued can continue. There is no timed solving requirement. The animation can take time to move all members of a three-dot group; this does not create an additional decision.

The **total usable shots** are `number_of_targets + 8`, or `number_of_targets + 9` at level 4. The initialized native reserve counter is one less (`targets+7`, or `targets+8`); firing is disabled when it decrements **below zero**, not when it reaches zero. This matters when translating the native counter into an actual attempt budget. For a 16-character party, eight targets yield 16/16/16/17 shots. Initialization and decrement/exhaustion are at `0x42c345..0x42c37a` and `0x42c7e9..0x42c7f9`. Developer-key handling at `0x42d380` can refill this reserve when the shared debug flag is enabled; this is outside ordinary play.

## Four exact difficulty branches

Let P and Q be permutations of `[0,1,2,3,4]`. Let `s` be 2 or 3. All modular arithmetic below is modulo 5. Cell indices are row-major.

| UI level | Board | Native coordinate labels A, B, C |
|---|---|---|
| 1 | 5 rows × 5 columns | `A=P[row]`, `B=Q[col]` |
| 2 | 5 × 5 | `A=P[row]`, `B=Q[col-s*row]` |
| 3 | 5 rows × 25 columns; `col=5*group+subcol` | `A=P[row]`, `B=Q[group]`, `C=Q[subcol]` |
| 4 | Same 125 cells | `A=P[row-s*subcol]`, `B=Q[group]`, `C=Q[subcol]` |

At levels 1–2 the two visible controls are randomly assigned to A/B. At level 3 the native matching selector stays at 0; at level 4 a separate selector chooses one of the six assignments of the three native banks to A/B/C. Exact bank tuples `(extra,middle,last)` for selectors 0–5 are `(C,B,A)`, `(C,A,B)`, `(A,C,B)`, `(B,C,A)`, `(B,A,C)`, `(A,B,C)`.

The executable also generates display color bindings. They are preserved independently from the logical matching selector: levels 1–3 select `[1,2,0]` or `[2,1,0]`; level 4 rejection-samples a permutation of `[0,1,2]`. They control RGB palette choices in `0x42e090`, while `0x42e540` performs the bank comparison. They must not be silently combined into a different logical sampler.

The main structural changes are a modular shear at levels 2 and 4, and an extra categorical coordinate at levels 3 and 4. The mapping remains bijective. Systematically vary one control while fixing the others to identify which coordinate or diagonal it controls. The shot allowance above the minimum target count remains eight exploratory shots, nine at level 4; it does not grow with the 125-cell board.

## Exact generator and target quotas

Group construction `0x42ee60` is deterministic. Append rewards in the order `3,2,1,3,2,1,...` until their total reaches/exceeds party size. Remove any excess by decrementing each reward of at least 2 once, in order. The one-character case falls back to `[1]`. For 16 characters the result is `[2,2,1,3,2,1,3,2]`. The model and native tests cover every incoming size 1–16.

Board generator `0x42d6b0` first constructs five accepted triples. Every trial draws three independent values with native inclusive bound 4. At levels 1–2, accept only if the first and second values are unused. At levels 3–4, require all three values to be unused. Rejected triples still consume all three draws. The third sequence is **not** used in the coordinate arrays: the native store at `0x42d866` uses the second value again, so B and C share Q. The unused third sequence still changes rejection behavior and RNG consumption.

Level 2 then draws `s=R(1)+2`. Level 4 draws this same shift plus another bound-1 value whose result is unused. The core does not independently choose the direction: the two shifts encode the two distinct directions/speeds in the five-cycle.

For each reward, draw a cell index in `0..24` or `0..124`, retrying while occupied. Put the next reward in that cell. This preserves reward order and exact collision draws; no solvability filtering is necessary because every cell has one control preimage. Then generate the display bindings, and finally the level-4 matching selector with bound 5. The exact RNG is the recovered LJ recurrence in `native_analysis.py`; every consumed value and the exit state are compared with the native function. Ambient/menu random calls before this boundary are excluded.

Knowing the mapping, a solution needs exactly one shot per target. The model supplies a witness by inverting `controls_at` for each positive target. Any order is valid. A smaller party changes target count, reward pattern and ammunition, but leaves the mapping family unchanged.

## Evidence, assets and validation

`net.mhk` contains the scene's art, frame sequences, target and control imagery. `zoombini.mhk` contains shared characters and help. The JSON spec binds the original archives by SHA-256 and references the existing extraction manifest for resource-level offsets and decoded files. Help STRL 2500/2520/2540/2560 and manual PDF pages 27/41 corroborate the four difficulty descriptions. The native coordinate tables at `0x48df00` (25 cells) and `0x48df64` (125 cells) bind logical indices to wall positions; they are presentation data, not alternate rules.

The native tests compare all meaningful generated arrays, reward groups, display bindings, selector, full random trace and exit state in **1,600 cases**. Every cell on sampled boards is checked against original `0x42e540` (**4,800 mappings**). The original target-hit helper is checked for target, empty and repeated hits; complete-solution witnesses are run through the model. All 64 level/party-size quota and reserve branches are exercised. See `local/analysis/logical-journey-mudball-wall/validation.json` for exact counts and fixtures.

Run `research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_mudball_wall.py --count 100`. Graphics factories and entity lookup are inert in the generator/hit oracle; RNG, arithmetic, comparison and target-state writes run unchanged. Pixel hit testing, animation scheduling and shared campaign persistence are excluded. There are no unresolved mapping, quota, reward or difficulty branches within the ordinary 1–16-character puzzle boundary.
