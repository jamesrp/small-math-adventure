# Island Odyssey — The Catapult

The normal apparatus is authored, not procedurally assembled: thirteen datasets, each used at three difficulties. `tools/spec_io_catapult.py` reproduces all 39 parameter sets and the exact history-dependent script selector. The local specification is `local/specs/island-odyssey/catapult.json`; `local/analysis/island-odyssey-catapult/authored-configurations.json` contains every numeric table, executable VA/file offset, resource binding, frame count, and source hash.

The mathematical input is an ordered word of boulders and expendable mudballs fed through periodic transfer gates. One boulder is supplied per incoming Zoombini (at most twelve); mudballs replenish indefinitely. A successfully delivered boulder passes one Zoombini; a lost boulder cannot be replaced. The player can stop/start the apparatus without resetting its phase while filling the chute. Chute entry is blocked until the previous queued item's animation reaches frame 4. Queue collision holding, initial frame offsets, rolling/bucket callbacks, cam intervals and paddle height all matter; the model exposes their native decision boundaries rather than guessing a wall-clock timing constant.

The first gate examines catchers in ascending order and consumes a waiting chute head only at frame 29, 59 or 89, depending on catcher type. A per-catcher flag prevents duplicate consumption on that frame; it resets in the preceding three-frame open interval. Three special catcher layouts use four-way spacing with one missing slot. Bucket capture is an inclusive current-frame test: 154–162 at level 1, 153–162 at level 2, and 77–84 at level 3. The first eligible bucket wins. The cam controls whether the final paddle intercepts a falling object before its threshold. Rock and mud follow the same gate rules but have different outcome effects.

| Level | Big-wheel period | Cam | Required planning contrast |
| --- | ---: | --- | --- |
| 1 | 216 frames | Fixed type 0; 39 active frames out of 72; reverse sequence | Match the small-wheel input rhythm to bucket arrivals. |
| 2 | 216 frames | Dataset chooses 43/72, 39/108, 37/144 or 80/144 active frames; reverse sequence | Coordinate bucket transfer with a second periodic paddle condition. |
| 3 | 108 frames | Same cam choices, forward sequence; some paddle heights change | Recompute phase relationships after doubled bucket rotation and changed cam direction. |

These duty counts are direct interval counts, not measured win probabilities. The apparatus LCM in each configuration assumes simultaneous one-frame advances; it is not a wall-clock duration or proof of a winning input sequence.

The selector is unusual. It repeatedly draws an inclusive integer from 1 through 65, scans dataset numbers i=1..13, and accepts when `draw < 5*i` and that dataset is unfinished, or whenever `draw == 5*i`. Used ranges therefore flow forward to the next unfinished dataset; trailing used-range interiors trigger a retry. It is not an ordinary 5:1 weighted sampler. All thirteen done flags reset only when all are true. The script reads the current dataset before selecting the next visit's dataset. The first normal level-1 tutorial uses native level 0, which forces level 1/dataset 8; practice bypasses that override.

A correct rock emits `correct` or, for the final unresolved rock, `finishedCorrect`; failures emit the analogous incorrect event. A smaller incoming group can complete, but difficulty progression and tutorial completion require twelve passed Zoombinis. Go permits partial departure after the first success. No independent time limit or mudball limit exists.

Validation runs the original parameter loader and unmodified gate instruction blocks with explicit animation frames: 52 loader cases (including all thirteen tutorial-override inputs), 5,400 catcher cases, 540 bucket cases, 3,966 paddle cases, and 52 chute-spacing cases. Pure-model checks exhaust all 532,480 history/draw pairs and 21 finite-boulder outcome scenarios. The JSON report preserves the exact scope and source executable hash. Script-selector coverage is not a second implementation of the native script VM.

The parameter tables, selection, native frame gates, and scene outcome rules are recovered. **Full input-time-to-rescue parity remains incomplete:** external animation advancement, movement interpolation, normalization of initial frames outside the sequence, and callback ordering are not emulated. This limitation matters for an eventual player, and the spec does not hide it behind a complete-game claim.

Reproduce from the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_catapult.py --validate
python3 research/zoombinis/tools/spec_io_catapult.py --export
```

The emulator invocation needs the existing macOS JIT permission. It runs bounded code in emulated memory; no original executable process or game UI is launched. The normal export and model are standard-library Python. Source guards cover the original executable, MPS script, and XML; archive/frame provenance remains in the existing local asset manifests. Manual corroboration: PDF pages 16–17 and 33–34. Native entry points and exact compiled-script instruction references are in the specification.
