# Boolie Boggle: puzzle specification

The executable mathematical model and isolated native comparisons are in `tools/spec_mr_boolie_boggle.py`; structured data is in `local/specs/mountain-rescue/boolie-boggle.json`. Three lanes of Boolies behave as binary counters. A whole pinball cluster goes to one selected lane. Completing a group rescues one arriving Zoombini and the group's Boolies, then replaces that lane's group. The normal arrival is eight Zoombinis; the generator accepts other party sizes and the checks include 1–16.

## Exact rules and state

Each lane has k moods in low-bit-first order: native 1 is happy/binary 1, native 2 is sad/binary 0, and native 0 is an inactive slot. A positive ball flips a sad Boolie happy and stops; it flips a happy Boolie sad and carries to the next place. Overflow beyond the last active Boolie is discarded. Therefore a completed positive cluster of b balls maps `v → (v+b) mod 2^k`.

Success requires the **final** group value to be `2^k-1`. Passing through all-happy partway through a cluster does not secure a boat: another ball can overflow it. A completed all-happy group is committed only after pending mood changes finish. Native boarding selection scans lanes in order and chooses the first with no sad mood; any boarding/replacement lane or queued mood event postpones this check globally (`0x408a64..0x408aec`). In a settled state all three lanes are active and at most the newly selected lane has become happy.

The player chooses a lane for the current whole cluster. It cannot be split between lanes or directed to an individual higher bit. While a cluster is active, its lane selection is locked. All-happy or currently boarding lanes are not valid new targets (`0x40c371..0x40c5c8`). Waiting for the carry and boat/replacement animations gives the discrete action contract implemented by `settled_action`. Exact overlapping animation schedules are not needed for that contract and are not modeled.

A successful group marks the next arriving character's native `+0x5c` success flag at `0x408af4..0x408b05`. Each such character records k accompanying Boolies at `+0x60`. Boarding therefore yields one Zoombini and 2/3/4 Boolies, not k Zoombinis. The successful lane receives a new generated group while the other two keep their values. Full success rescues all n arriving Zoombinis. At exhaustion, already rescued characters continue and the remainder are left behind. Leaving the activity uses these success flags; the shared departure/dialog UI is outside the model.

## Difficulty and exact budgets

| Normal level | Bits per group | Target | Positive cluster size | Total launches for n arrivals | At n=8 |
|---|---:|---:|---|---|---:|
| Not So Easy (1) | 2 | 3 | 1–3 | `2n+ceil(n/4)+1` | 19 |
| Oh So Hard (2) | 3 | 7 | 1–4 | `3n+ceil(n/2)+1` | 29 |
| Very Hard (3) | 4 | 15 | 1–5 | `4n+1` | 33 |

The budget counts clusters/launches, irrespective of their number of balls. The used counter starts at zero; after a cluster completes, `0x40c28f..0x40c2b3` blocks another launch at `used >= budget`. There is no extra launch. The last cluster can still produce a successful group. This is a resource limit, not a solving-time limit. The budget is set once from initial party size and is not replenished after each rescue.

The original code also contains diagnostic level 4: four bits, signed cluster values `{-2,-1,1,2,3,4,5,6}`, and budget `3n+ceil(n/2)+4`. Negative balls perform binary subtraction with borrow modulo 16. Normal campaign progression caps at level 3, so the negative-ball art is not evidence of ordinary hardest-level subtraction.

The manual describes a next-cluster waiting area at the higher difficulties (PDF pages 23/34). The executable stores current and next cluster fields at every level; this recovery exposes the draw boundary and preserves its values, without claiming that every field is visible to the player. The finite-prefix planner is an offline reachability checker with supplied future increments, not a strategy restricted to the game's visible lookahead.

With all lanes settled and incomplete, there are `(2^k-1)^3` ordered mood configurations: 27, 343, and 3,375. This excludes the launch counter, current/next clusters, rescued count and random state. Increasing the bit width raises the target much faster than the maximum cluster size. Useful reasoning includes the exact deficit `2^k-1-v`, modular sums across successive clusters, and preserving different deficits in the three lanes so more future clusters have a useful target.

## Exact generation and random calls

`0x40de40` sets the launch budget, draws the first cluster through `0x40db20`, copies it to current, and generates three initial mood rows with `0x40d920`. No solver, rejection against a future sequence, or party-trait balancing is called. The only inputs from the party are its count and subsequent rescue recipients. Native random values are the executable's 15-bit MSVCRT-style LCG results; bounded choices use remainder, retaining its small modulo biases.

Cluster sampling uses one raw random call at each normal level:

- Level 1: `(rand()%30)//10+1`.
- Level 2: `rand()%4+1`.
- Level 3: `rand()%5+1`.
- Diagnostic level 4: `rand()%9-2`, redraw only if zero.

Every mood-generation invocation produces **three** four-word rows. For level 1, draw r=`rand()%3` and output the two low bits of `~r`, each plus one, then two zeros. Equivalently the binary starting value is r in 0–2. For level 2, draw the first two moods independently as `rand()%2+1`. If both are happy, force the third sad without a random call; otherwise draw it the same way. Append one inactive zero. Levels 3–4 similarly draw the first three moods, force the fourth sad only when those three are happy, and otherwise draw it. This excludes an initially all-happy group by construction and is **not** uniform sampling over incomplete values. The special forced cases also change random consumption.

For each successful group, `0x40dc20` runs the same three-row algorithm into a reserve buffer at `0x4ac178`. The insertion callbacks `0x406390` / `0x4064a0` use the **first row** to refill the completed lane. The other two rows still consume randomness. On initial scene arrival, the third initial row is temporarily moved through that reserve buffer before insertion into the third lane; it does not require a fresh generation call. The model's initial values describe the fully settled three-lane state.

Subsequent cluster draws occur through `0x40db20` as the preceding cluster is processed, and ambient speech/animation also consumes the shared RNG. Exact generator entry states and call traces are supported; assigning a whole-session deterministic seed without those extra calls would be incorrect. The action model accepts explicitly supplied current clusters and replacement values, keeping that boundary visible.

## Solvability, progression and evidence

No unconditional solvability guarantee is present. For example, with two-bit lane values `[0,2,0]` and the four-cluster prefix `[2,2,2,2]`, every lane remains even, so none can reach target 3, regardless of choices. The exact finite-state solver confirms this obstruction. These are legal mathematical inputs; the example does not assert a particular complete gameplay session seed. Conversely, a sufficiently long all-ones prefix supplies a first-boat witness for every incomplete mood configuration. The model checks all 3,745 configurations across the normal levels, without claiming that the real game guarantees that prefix.

Campaign cleanup at `0x406d48..0x406dbe` awards difficulty progress only when exactly eight characters are present and every success flag is set. It increments save counter `+0x1780`, resets it upon reaching three, and increments difficulty `+0x13fc` only below three. This branch does not reset the counter on a partial result, so it does not support the manual's stronger “consecutive” wording by itself.

Validation covers 2,000 full native initial generators and random traces, 400 native replacement generators, all 756 applicable mood/cluster/lane carry cases including diagnostic subtraction, 160 exhaustion gates, 256 boarding-eligibility cases, and 3,745 independent first-boat witnesses. Native source SHA-256 is `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. The oracle retains original arithmetic and decision instructions; only CRT thread-state access is substituted. It never launches the game process.

Run `research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_boolie_boggle.py --count 100`. Results are in `local/analysis/mountain-rescue-boolie-boggle/validation.json`. Assets bind to `Data/Bmp/BOOLIES`, `INSTALL/HD/Bmp/Boolies`, and associated Boolie scene sound paths through the disc manifest. The shipped `tempo_boolies.txt` is historical evidence, not the final runtime timing contract: for example, the native callback at `0x40673a..0x40674a` schedules the completion check 2,000 ms later, rather than the note's 1,000 ms. Rendered motion, precise frame scheduling, full session RNG replay and campaign menus are excluded from this settled puzzle specification.
