# The Planetarium — recovered specification

`tools/spec_io_planetarium.py` implements all three normal generators, item eligibility and queued advances, the discrete hour/day callback rules, and the script's reward accounting. The local machine-readable spec is `local/specs/island-odyssey/planetarium.json`. This is a callback-boundary puzzle model, not an animation engine or full-game replay.

The mathematical task uses two private finite multisets. A coin adds its number of hours modulo 24; a bill adds its number of days modulo 28. The two exhibits have a shared target hour and, at level 3, a shared target date. Their current values are represented differently: Earth rotation on the left and Sun/Moon position on the right. Internal hour zero corresponds to 6 a.m.; date rollover occurs there. The visible calendar is internal day plus one.

Level 1 gives each exhibit the six usual coins plus helper coins 1 and 2. Level 2 removes the helpers and adds moon information, using one of four cardinal phases. Level 3 uses any of 28 dates, adds seven day bills per exhibit, and requires reasoning about hour advances changing the date. It has four individual compartments and two shared bonuses, instead of two individual compartments and one bonus.

The native generator at `0x4320a0` takes `(doTargetHour, doTargetDay, showMoon, addHelperSet)`: flags are `(1,0,0,1)`, `(1,0,1,0)`, `(1,1,1,0)`. It consumes exactly 3, 4, or 6 MSVCRT `rand` calls. At level 3, target day and two start days precede the target hour and two start hours. Level 2 starts with one shared phase draw. Starts use biased increment-on-equality sampling, not rejection sampling. The right exhibit uses a 28-row phase restriction table. One branch of that sampler does not exclude the target hour: native parity confirms initial-target examples at level 2 seed 52 and level 3 seeds 16 and 45.

Hour coins are `[4,5,5,7,10,10]`, except initial forward differences 18 or 23 use `[4,5,7,7,10,10]`. Day bills are `[1,4,5,5,7,10,10]`. Level 1 prepends `[1,2]`. Lists are fixed in that order; there is no shuffle or final solvability check. Source tables and exact offsets are exported to `local/analysis/island-odyssey-planetarium/native-tables.json`.

An item belongs to one exhibit and one denomination slot. Inserting it consumes it. Same-denomination items may extend an ongoing advance; the opposite denomination is rejected until that exhibit stops. Forecasting an exact target disables remaining items of that denomination immediately. The forecast subtracts the modulus once, preserving the original behavior even for unusually large queued totals.

Every completed unit is tested. Passing through a target initially transforms half of the individual compartment, rounded down with a minimum one for a nonempty compartment. Stopping exactly transforms the whole compartment. A second encounter awards the remainder. An exact stop also checks whether both current exhibit values match and awards the shared compartment. Token distribution for groups smaller than twelve is implemented explicitly by `allocation`.

A date reached during hour rollover is treated as exact, even when more hours remain: the native date callback asks whether *day* units remain. It also disables that exhibit's remaining day bills. Therefore apparently sensible hour-first play can create a dead end. For example, level 3 seed 19 has a coin subset that wraps through the target date, disables bills, then moves beyond it before stopping at the correct hour. The move searches retain alternative sequences and do not infer gameplay solvability from independent subset-sum coverage.

The decoded script has a second edge case: shared bonus counts are neither cleared nor guarded after payment. Repeated qualifying events can increment the script's passage counter beyond the group size. For level 2 seed 52, solving the other exhibit before cycling the initially-correct right exhibit can produce sixteen local passage calls for twelve incoming tokens. The spec preserves this script behavior without claiming sixteen physical tokens or duplicated moth sprites. Completion checks equality with the incoming count, while progression checks whether the counter exceeds eleven.

No timer or separate mistake budget exists. Exhaustion means both exhibits have stopped and no enabled items remain. Go becomes available after the first passage, retaining partial progress.

Validation compares 309 generator cases, 4,104 original discrete unit steps, and 144 original main-game target callbacks. It also checks nonempty subset witnesses for all 24 hour residues and 28 day residues, then searches 300 generated boards using the actual disable/reward rules. Detailed witness actions and passage events are retained. These are bounded model witnesses, not a universal proof for every seed or an original script-interpreter run.

Native tests skip resource construction, graphics, sound, and event transport. The generator's arithmetic, branches, item-list selection and RNG call order execute as original x86. The right exhibit's entire discrete unit handler executes with visual callbacks stubbed; the main game's hour/day handlers execute with visual and script event transport hooks. All source revisions are SHA-256 guarded. Full-session RNG history, precise interpolation timing, and downstream port/visual handling of repeated bonuses remain outside this contract.

Reproduce from the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_planetarium.py --validate --samples 100
python3 research/zoombinis/tools/spec_io_planetarium.py --export
```

Unicorn requires the approved unsandboxed process on this host because its JIT cannot map memory inside the macOS sandbox. This does not start the game, installers, or network services. Pure model generation and export use standard-library Python. Primary evidence is the guarded EXE, MPS instructions 1547–1787 and 1806–2088, and the shipped XML; manual pages 20–21 and 35 are corroboration.
