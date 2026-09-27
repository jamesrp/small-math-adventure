# Chez Norf — discrete puzzle specification

The generator, all twelve authored answer/clue templates, meal validator, feedback bindings, tray limits, release quotas and three normal difficulty branches are recovered. The reusable model is `tools/spec_mr_chez_norf.py`; the full local specification is `local/specs/mountain-rescue/chez-norf.json`. Source-derived text and template data stay under ignored `local/`.

## Generation and difficulty

The scene calls `0x453640`. One `rand % 4` selects one of four templates for the current level (11–14, 21–24 or 31–34). `0x453cc0` then draws three independent permutations, rejecting previously used values within each course. It consumes the dessert permutation even at level 1. Each template applies fixed assignments to those permuted foods; no complete-board solver or regeneration check occurs. The seed denotes this function's entry; idle Norf animation also consumes the shared RNG during play.

| Level | Norfs | Courses | Total submitted trays | Spare trays for a full eight-character rescue | Rescue quotas, by successful meal count |
|---|---:|---:|---:|---:|---|
| 1 | 4 | 2 | 8 | 4 | 2, 2, 2, 2 |
| 2 | 4 | 3 | 7 | 3 | 2, 2, 2, 2 |
| 3 | 6 | 3 | 8 | 2 | 2, 2, 1, 1, 1, 1 |

There are 216 possible food permutations per template, with 36 visibly distinct assignments at level 1 because dessert is unused. The twelve templates and 335 concrete clue records are exported to `local/analysis/mountain-rescue-chez-norf/authored-templates.json`. These records are built by static initializer code into zero-filled `.data`; their runtime addresses are **not raw file offsets**. The export records each initializer range, template assignment entry, runtime record address and content hash. A restricted independent assignment/copy interpreter reconstructs these tables; the original initializers provide a separate native comparison.

The original clue selector and audio name constructor are modeled, including the extra `-a0` suffix for template 13/Norf 3 and `-c0` for template 33/Norf 2. Pointing metadata distinguishes left, right and both neighbors. English text is preserved exactly in the local corpus, including original spelling errors. Food IDs are sandwich/fish/salad, coffee/orange juice/milk, fruit pie/watermelon/ice cream.

## Actions, feedback and completion

Players can repeatedly request a Norf's clue, cycle independent order-pad marks through four states, and prepare trays by replacing individual course slots. Food cannot be removed once placed. A complete tray requires main and drink, plus dessert at levels 2–3. Picking up a tray and returning it to the workspace does not consume it. Serving an unserved Norf spends a tray before evaluation; both wrong and correct meals count. A served Norf cannot be served again.

`0x4535d0` accepts an exact three-field order. The level-1 unused dessert sentinel 9 also accepts submitted -1, which is the normal UI value. Incorrect feedback does not identify which course was wrong. Correct feedback marks the Norf served and rescues the next quota; rescue quota depends on number of successful meals, not Norf identity. A smaller incoming party stops when its remaining characters have been rescued. Prior rescues survive later failures.

The native tray counter starts at 5/4/3 and is decremented at `0x412191`. It terminates at -3/-3/-5, yielding 8/7/8 total meals. `0x4109f0` independently confirms these terminal predicates. The manual's four/three/two extras describe the slack for full success. Its level-3 “two incorrect meals” wording is not implemented as a separate rejection counter. For example, wrong meals can consume all eight trays; failure is not necessarily triggered by the third wrong meal.

After the last tray, all Norfs are served, or the incoming party is exhausted, only rescued characters continue. Full-eight success increments the campaign success counter at save offset `+0x1774`; every third such success increments difficulty `+0x13f0`, capped at 3 (`0x40f7b6`).

## Validation and reproduction

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_chez_norf.py --validate --validate-actions --export
```

Native Unicorn comparisons require the approved unsandboxed invocation on this macOS host. Pure extraction and export do not. Every run guards executable SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`.

Passing comparisons: 252 generator/RNG cases covering all twelve templates; 46,200 meal predicates; 1,176 clue text/audio/metadata outputs; all twelve static initializers byte-for-byte; 42 exhaustion checks; 456 notepad transitions; 114 food replacements; 23 tray decrements; 14 quota lookups. The spec links 81 graphics resources with hashes and preserves exact audio name derivation.

The complete boundary is discrete normal puzzle logic. Pixel hit testing, animation interpolation, asynchronous input interleavings and the shared Go/save engine are excluded. The authored English clues are not translated into an NLP constraint solver; the game itself evaluates meals against its generated exact answer table.
