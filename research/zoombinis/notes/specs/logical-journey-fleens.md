# Fleens

`tools/spec_lj_fleens.py` independently reproduces native generator `0x413990` and models sequential settled lure actions. **200 generator comparisons, 126 lifecycle scenarios containing 870 lures, and all 256 animation marker dispatch values passed against the original code.** The local reports, witnesses, executable slices and resource hashes are under `local/analysis/logical-journey-fleens/`; the machine-readable specification is `local/specs/logical-journey/fleens.json`.

The input is an ordered party of 1–16 Zoombinis, each with four trait values 1–5, a difficulty index, an RNG state at generator entry, and eight saved mapping bytes. Up to three distinct party identities are sampled with rejection. Their paired Fleens occupy the three target branches; missing positions are precleared for parties smaller than three. Pairing uses parallel actor identity arrays at runtime, rather than another trait search.

The generator first selects targets, then optionally draws four cyclic value offsets, then optionally draws the category permutation, then consumes one idle-phase draw per actor. Each visible Fleen value is `1 + ((Zoombini value + offset - 2) % 5)`, placed in the destination category. This is a cyclic value mapping, not an arbitrary permutation of the five values. Targets use `REGS 5000` and other Fleens use `REGS 5001`, each in party order.

UI levels 1–2 retain categories in their original positions. Levels 1 and 3 reuse saved value offsets when present; levels 2 and 4 draw fresh offsets every encounter. Levels 3–4 use a category permutation, retained at level 3 when present and regenerated at level 4. The first destination is drawn from 2–4; each remaining destination starts with a draw from 0–3 and scans cyclically to the first unused destination. This is neither uniform over permutations nor a requirement that every category move. The difficulty changes the inference problem and transfer of knowledge between visits; tree capacity and loss rules do not change.

Each available identity can lure once. Its paired Fleen chases it and becomes unavailable, and luring a target permanently increases progress. A later eviction of that target's Zoombini does not undo the cleared branch. New lures are disabled after all three targets clear. Ground repositioning does not change the hidden mapping. The settled API admits the next lure after the current chase and any eviction have finished; arbitrary input overlap during animation is outside that contract.

The tree is an ordered queue of six Zoombinis. The seventh distinct lure removes the oldest pair, shifts the remaining six, and starts the evicted Zoombini's escape chain. The chain ends at `0x415240(-1)` with that actor's active flag cleared. **Evicted Zoombinis are lost; the six still in the tree are rescued.** Once victory settles, `0x4153f0(-1)` calls `0x44b090(1,0)` to mark every still-active Zoombini successful, including those never lured. GO requires victory and a settled callback phase, and saves these flags. Original serialization `0x44a990` orders successful members first and excludes inactive evictees from success even when restoring their display state. Tree evacuation uses `0x414fa0` and `0x415070`, in last-in-first-out order.

If the third target is cleared on lure `k`, the number passing is `n - max(0, k - 6)`. Thus luring the three known targets first preserves everyone, while clearing the final target on the sixteenth lure leaves six survivors. There is no separate wrong-answer count, timer, or repeat lure of the same identity. There is no early GO before the targets clear. This characterizes outcomes for known mappings; it does not prove that every hidden-information strategy can infer the targets without loss.

The lifecycle harness runs the original queue, target, Fleen availability, overflow, escape, victory, tree-drain and party-serialization blocks. It marshals actor lookup and supplies callback events; graphics, sound and scene ordering are stubbed. The tested cases cover party sizes 1/2/3/6/7/8/12/16, every feasible final-target lure count, three identity orders, and targets evicted before the last target is lured. The callback provenance is explicit: original dispatch `0x4585f2–0x458614` sends nonzero marker low byte minus one, while zero emits no callback and stream completion separately sends `-1`. Hashed chase streams contain `ff85` (overflow event 132); evacuation streams contain `ff84` (next-member event 131). `animation-events.json` preserves the relevant resource IDs and frame indices.

Run from the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_fleens.py --validate-native
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_fleens_lifecycle.py
python3 research/zoombinis/tools/spec_lj_fleens.py --write-spec
```

The first two commands require the native dependencies and approved unsandboxed Unicorn execution on macOS. They execute bounded original code in memory; no game process or UI is launched. The pure model and spec export use the standard library. The specification is complete for puzzle mathematics and sequential settled actions; real-time animation scheduling, overlapping UI actions and whole-session RNG parity are excluded.
