# Island Odyssey player foundation audit

This bounded audit supports the player foundation and Garden practice slice in
`business/zoombinis/`. It records script evidence that the family reports alone
do not express as a campaign contract. It does **not** establish a complete
campaign, a full MPS interpreter, Catapult timing, or Greenhouse movement.

## Evidence and reproduction

The installed disc edition is identified by executable SHA-256
`619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2`.
Script paths below are relative to `local/discs/island-odyssey/HD/scripts/`.
Instruction indices use the existing lossless structural decoder
[`spec_io_mps.py`](../tools/spec_io_mps.py), rather than string-search offsets.
The decoder preserves opcodes and expression references; it is not a full VM.

| Script | SHA-256 |
|---|---|
| `main.mps` | `cf6b523b4a557e96a5c902da603ddf0d6f08c513f30564fc1d72081556f6f8bb` |
| `z3m2.mps` | `1c09b70c3401e48167fc06bedadf31b7a6e8cb824acecec9c15406d2e7432785` |
| `z3a4.mps` | `84735b42d4bf68a8782d9d5e940afa266e3d5ca1d992a9d35f7f54759571fc0d` |
| `z3a5.mps` | `c2bc69ff945b92330a31da1e1a5906fe9df9493fe83710e00a6bba8e33857578` |
| `z3a6.mps` | `5458dda51721962948d4d5ec264b284f6c29e121068269ad27e5e5a030d615e7` |
| `z3a7.mps` | `ad958a3a77ddcbff4d0dd8e6c3b182291dccbafa02adc938caa5def752969078` |
| `z3v3.mps` | `6410629a23048acf18cf31e2b2af80911c1a3bd2792cb7d678ca203c4154622e` |

The manual is `local/manuals/island-odyssey.json`, source PDF SHA-256
`9afb1390684753c42e3e719e9b783df3905dfe0b7af664cce906cb2fc8b3fc4f`.
Relevant PDF pages are 9–15 and 29. To inspect the new script findings:

```sh
python3 research/zoombinis/tools/spec_io_mps.py main --start 864 --end 894
python3 research/zoombinis/tools/spec_io_mps.py main --start 1203 --end 1315
python3 research/zoombinis/tools/spec_io_mps.py z3m2 --start 1818 --end 1940
python3 research/zoombinis/tools/spec_io_mps.py z3a5 --start 1724 --end 1737
python3 research/zoombinis/tools/spec_io_mps.py z3a6 --start 1665 --end 1687
python3 research/zoombinis/tools/spec_io_mps.py z3a7 --start 1634 --end 1717
python3 research/zoombinis/tools/spec_io_mps.py z3v3 --start 1627 --end 1637
```

## Campaign reservoir and transfer findings

The manual's production chain is recruitment → Catapult → Wall → Planetarium
→ Greenhouse → Garden → Corral → Barn → biomes. The visible inventory changes
from Zoombinis carrying caterpillars, to chrysalises, moths, pollinated plants,
berries, and finally Zerbles. Manual pages 9 and 15 explicitly retain successful
output when leaving and return unsuccessful items to the current reservoir.
Thus an apparent puzzle loss is generally not deletion from the campaign.

The compiled campaign initialization in `main.mps` 1244–1262 starts the picker
reservoir at **240**, the seven activity reservoirs and destination at zero,
and achieved activity levels at one. The usual entry threshold is one, with
these exceptions:

| Location | Initial campaign minimum | Evidence |
|---|---:|---|
| Greenhouse (`Z3A4`) | 12 | `main.mps` 1259 |
| Corral (`Z3A6`) | 12 | `main.mps` 1260 |
| Barn (`Z3A7`) | **2** | `main.mps` 1261 |
| Map (`Z3M2`) | -1, unconditional navigation | `main.mps` 1246 |

The twelve-item minimum is **not permanent**. During scene transition,
`main.mps` 871–880 sums the picker plus activity reservoirs 1–4. If this sum is
less than twelve it changes Greenhouse's minimum to one. It then adds activity
reservoirs 5–6 and, if the enlarged sum is still below twelve, changes Corral's
minimum to one (882–890). This is a concrete last-items drain path omitted by
the manual's broad threshold summary. Preserve the changed minima; do not
reconstruct them solely from a static table when restoring a campaign.

`z3m2.mps` 1818–1864 reads the actual current minimum and reservoir count for
each location before enabling its map button. Visibility and enabled state are
separate: 1835–1837 records the last nonempty activity and 1880 onward exposes
the reached portion of the route. A visited flag alone cannot implement access.

Garden (`z3a5.mps` 1724–1735) consumes `nextToken(-1, currentLocation)` for each
success. It does **not** use the selected plant index as a reservoir token tag.
Greenhouse uses the same next-token pattern (`z3a4.mps` 1796–1807). The visible
plant/moth identity and underlying reservoir identity are separate concepts.
The Garden standalone practice adapter preserves local displayed-plant IDs;
a campaign adapter must map each success to the next source reservoir token.
Its ordered reservoir must not be replaced by a count or by placement order.

Corral has an additional material transfer: `z3a6.mps` 1668–1676 obtains the next
reservoir token, writes attribute 0 = 0, attribute 1 = the fed animal's feet,
and attribute 2 = its tail, then moves that token. It enables Go only once
Barn's reservoir reaches Barn's current minimum (1678–1682), which is initially
two. Barn reads incoming tags and attributes while alternating the two parent
sides (`z3a7.mps` 1639–1705); successful parent tags are passed explicitly
(1708–1713, 1753–1755). Its generator uses `floor(count / 2)` pairs. Preserve an
odd leftover in the reservoir. See the stronger native-tested
[Barn report](specs/island-odyssey-barn.md) and
[Corral report](specs/island-odyssey-corral.md).

The end scene tests destination count **equal to 240** before its LastZerble
speech (`z3v3.mps` 1633–1635). This identifies a terminal presentation trigger,
not a complete proof of biome population and family assignment. The biome
assignment code, full picker constraints, `RWorldPort` ordering/transfer
implementation, and native automatic-leveling counters still require their own
audit and conservation fixtures before the campaign can ship.

Practice initialization is separate: `main.mps` 1206–1241 supplies twelve items
per activity, sets achieved levels to three, and resets Catapult history flags.
Campaign initialization resumes each activity's selected level from its achieved
level (`main.mps` 1290–1298), and `gSetHighestLevel` only raises the achieved
level (1306–1313). Do not merge selected and achieved difficulty fields.
The source's common automatic-leveling call is an unresolved engine contract;
the manual's three perfect rounds is not sufficient to infer all native counter
updates. Garden completes smaller parties; other families require twelve.
Greenhouse additionally calls `autoLevel` during setup (`z3a4.mps` 1634–1645),
and tests `mothsCrossed == 12` for its completed-all progression branch
(1557–1569), even though entry may eventually contain fewer tokens.

## Catapult timing spike: bounded result

The [Catapult report](specs/island-odyssey-catapult.md), its native validation,
and `local/analysis/island-odyssey-catapult/authored-configurations.json` provide
39 complete normal parameter sets and verified frame predicates. Catchers test
frames 29/59/89 in ascending order with a per-catcher consume flag; the flag
resets during the preceding three-frame open interval. Bucket windows are
154–162, 153–162, and 77–84 by level. Chute entry waits for frame 4; paddle
interception depends on the configured cam interval and falling-object height.

These boundaries show why simply advancing every sprite once per animation
frame is not a verified timing port. Still missing are animation sequence frame
durations and normalization of initial offsets, rolling/bucket motion completion
callbacks, and their ordering against catcher, bucket, paddle and player input.
The existing model intentionally receives frame observations externally.
A bounded next native test must drive one rock and one mudball through adjacent
catcher/window boundaries, record old/new frame and flags, and capture callbacks
at the same simulation tick. The required save fixture includes wheel/cam
phases, chute queue/reservations, each airborne item, catcher consume flags,
movement interpolation and pending callbacks. No wall-clock period or successful
input-to-rescue trace was inferred in this audit.

## Greenhouse movement spike: bounded result

The [generator report](island-generator-parity.md) supplies exact packed plants,
templates, scramble and trait permutations. Its oracle deliberately stops before
path annotation at **0x407a70** (called at 0x4052b7). That deterministic helper
must be ported before autonomous movement can be claimed. The known player swap
path at 0x406d10–0x406f05 rejects occupied plants and spends one of thirty wand
uses. It does not enforce the generator's equal-leaf restriction at level 3.

The script binds `mothDone` to `mothCrossedOver` and `mothStuck` to
`semiSolution` (`z3a4.mps` 1630–1632). These callbacks, plus twelve-crossing
completion and partial token passage, define concrete trace endpoints for a
movement harness. Remaining internals are the path-annotation representation,
moth branch selection, beetle occupancy/reservations, spawn timing, collision
ordering and stuck detection. Reversing the twenty scramble swaps proves a
static path arrangement only. It is not an operational schedule or campaign
completion witness. No guessed movement implementation was added.

## Garden player boundary, assets and comparison

The [Garden contract](specs/island-odyssey-garden.md) already establishes every
normal generator and settled mathematical action. The player port keeps all
twelve generated appearances, hidden axes, per-hole masks, accepted placement
order, mistakes, entry/current RNG state and active local plant identities.
All levels and partial visible groups consume exactly 51 generator calls.
Its rejection callback settles in one atomic action; Garden's sun is an error
counter. No animation timing parity is claimed.

The private fixture exporter
[`export_player_garden_fixture.py`](../tools/export_player_garden_fixture.py)
uses the existing native-validated Python model and guards source hashes. It
exports 54 cases: three levels, six entry seeds including signed/unsigned
boundaries, and incoming counts 1/5/12. Every next witness plant is tested in
every hole, retaining the complete resulting masks and original feedback code.
The TypeScript suite compares generation, RNG exit, acceptance, propagation,
feedback and serialization after every witness step. Regenerate from the
`business/zoombinis/` player directory:

```sh
python3 ../small-math-adventure/research/zoombinis/tools/export_player_garden_fixture.py --output tests/local/garden.json
node --import tsx --test tests/garden.test.ts
```

All media paths below are relative to `local/derived/island-odyssey/`:

| Use | Levels 1–2 | Level 3 |
|---|---|---|
| Background | `assets/z3bkgd/18000.jpg` | Same |
| Root traits | `frames/z3a5/18174/0000.png`–`0003.png` | `frames/z3a5/18151/0000.png`–`0003.png` |
| Stem traits | `frames/z3a5/18175/0000.png`–`0003.png` | `frames/z3a5/18155/0000.png`–`0003.png` |
| Leaf traits | `frames/z3a5/18176/0000.png`–`0003.png` | `frames/z3a5/18159/0000.png`–`0003.png` |
| Flower traits | `frames/z3a5/18177/0000.png`–`0003.png` | `frames/z3a5/18167/0000.png`–`0003.png` |
| Hole AO | Level 1: `assets/z3a5/18173.ao`; level 2: `18172.ao` | `assets/z3a5/18150.ao` |

Source animation frame numbers are one-based (`trait + 1`); exported filenames
are zero-based. Resource bindings come from Garden's executable tables
0x4503fc–0x45042c and are retained in the family specification. PNGs have
provenance and dimensions in `animations-manifest.json`; raw resources have
archive offsets/hashes in `assets-manifest.json`. Displaying the components in
legible cards is a usable first renderer; exact composite anchors, AO events,
dialogue timing and the original scene's hit geometry remain separate work.

No existing family contract, native evidence report, or catalog snapshot was
modified by this audit; their documented comparison boundaries remain intact.
