# Mountain Rescue player audit — first slice

This bounded audit accompanies the Turtle Hurdle browser adapter. It does not recover a complete campaign. The matching executable is `local/discs/mountain-rescue/INSTALL/HD/zoombini2.exe`, SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. Addresses below are VAs; corresponding raw offsets are VA minus `0x400000` for these ranges. Static instructions are in `local/native-analysis/mountain-rescue/disassembly.txt`. All original media and source-derived fixture data remain in ignored local directories.

## Turtle rule and snapshot boundary

[The recovered Turtle contract](specs/mountain-rescue-turtle-hurdle.md) and `tools/spec_mr_turtle_hurdle.py` establish complete generator and settled placement behavior at constructor `0x401000`. This is the browser entry boundary: supplied party plus exact 32-bit CRT state. A generated practice party uses a separate derived RNG before entry and is a player convenience, not a reconstruction of native recruitment. The generator itself preserves every native draw, including modulus-one removal draws and the unused secondary clue-mask draw at level three.

Every wrong placement rescues its character at the highest-index currently free accepting slot and consumes one support. The final wrong move still rescues its character. A full sorted assignment is possible for every valid incoming party. Ties compare active trait values, never character identity. No animation or wall-clock event affects the settled rule boundary. Browser snapshots therefore represent completed placements, not intermediate flips, splines, or character layers. The initial browser slice must identify this limit rather than claiming native animation parity.

The level-three view must draw both ordering rows at the primary clue-mask index. The generator's independent secondary index is retained for exact RNG/state parity but never used to choose the second visible cell. Level two has four or five supports depending on whether it has two or one clues, respectively.

## Trait bindings: correction to a broad prose description

`tools/spec_mr_pipes_of_paloo.py` describes four incoming trait bytes as hair/eyes/nose/feet in prose. That description must not be used to label Turtle's native positional axes. Fresh inspection of the Turtle loader and the actual decoded icons yields **feet, nose, hair, eyes** for axes 0, 1, 2, 3.

The constructor at `0x416a19..0x416ab7` loads the four resource categories 1 through 4, five values per category, into rows starting at scene `+0xbc30` with stride 24 bytes. It formats `./bmp/mystic_marsh/traits/%d-%d.bmp` (VA `0x48c27c`) and its alpha companion (VA `0x48c254`), with no permutation of category indices. The clue renderer at `0x416646..0x416655` selects `scene+0xbc2c+4*(6*primaryAxis+value)`; the secondary row repeats the same indexing at `0x41667c..0x416693`.

The source RB files map to `local/derived/mountain-rescue/images/Data/Bmp/mystic_marsh/TRAITS/{axis+1}-{value}.RB.png`, with source hashes and per-image offsets/hashes in the extraction manifest. Inspection of all twenty icons established the following descriptive accessible labels (descriptions, not asserted original authored names):

| Native axis | Feature | Values 1 through 5 |
|---|---|---|
| 0 | Feet | Pink shoes; Green shoes; Spring; Wheels; Propeller |
| 1 | Nose | Blue; White; Green; Red; Purple |
| 2 | Hair | Tuft; Long fringe; Cap; Ponytail; Spiky |
| 3 | Eyes | Two eyes; One eye; Sleepy eyes; Glasses; Sunglasses |

This resolves a presentation-label conflict without changing any equality or sorting arithmetic in the existing models. It is source-loader plus icon evidence, not a complete native character-assembly recovery. Future campaign adapters must preserve native byte ordering or explicitly translate it at their boundary.

## Scene resources

The scene backdrop is **`images/INSTALL/HD/Bmp/crazy_turtle/background.bb.png`**, 800×600, source SHA-256 `e494124bbcda3d78ef01afb8ea3c74d1a0074c4942b9abcce93021ab04177f11`, output SHA-256 `7b82429e47bad5a341cd67b22f1e68fadd7624752f1e723979b909ebe0555371`. `Data/Bmp/crazy_turtle/Area.bmt` is an indexed area/control resource, not the painted backdrop. There is a distinct Booliewood attraction with its own `booliewood/crazy_turtle/AREA.BMT`; do not choose it by an ambiguous basename search.

Other useful resources are the dock `Data/Bmp/crazy_turtle/PONT.RB`, broken dock `pontKC.rb`, supports `poutrelle.rb`, mother turtle `TORTUES/MERE/meredebut.rb`, the four `TORTUES/ATTENTE/{n}/{n}.AN` idle sequences and four `TORTUES/tourbillonne/{n}/{n}.AN` flip sequences. All are decoded and indexed by `local/derived/mountain-rescue/manifest.jsonl`. Exact turtle placement records are at `0x48be60` (16 records of 12 bytes); clue coordinates are at `0x48bd90`. Treat those original tables as private imported pack data.

AN frame order is available; the AN containers do not identify timing. ANM's 3,000 component slots preserve indices but do not yet establish layer names, trait-to-slot mapping, anchors, and assembly order. PAT retains control points, step, and wait; source curve evaluation and timing remain unresolved. Using a source backdrop and trait icons is supportable now; complete animated character fidelity remains separate work. See [format boundaries](mountain-rescue.md).

## Campaign audit

The source manual (`local/manuals/mountain-rescue.txt`, extracted from the hashed PDF identified in the Turtle contract) supports:

- PDF pages 12–13: start from Zoombiniville with 16 characters; player-defined or automatically generated traits; native recruitment restricts matching characteristics. Those recruitment restrictions and name allocation are not reconstructed by the first practice generator.
- Page 13: Rescue Site I and II hold surplus characters; eight must stand in departure circles before leaving either site. Site I offers a route choice; Site II has Go. Page 9 allows revisiting junctions containing waiting parties through the map.
- Page 14: characters lost in a mission return to their most recent rescue site or Zoombiniville. Opening the map mid-activity also returns the party. Loss is not permanent deletion. A campaign must retain IDs and attributes across these transfers.
- Page 10: normal difficulties are Not So Easy, Oh So Hard, Very Hard; advancement is described as three consecutive full-party successes. Native per-family evidence supersedes this broad description where it conflicts.
- Page 24: Booliewood grows with delivered Boolies, and 400 triggers the mayor's return. This is a Boolie threshold, not a Zoombini threshold or an ordinary tenth puzzle.

The native [Bubble Bumpers report](specs/mountain-rescue-bubble-bumpers.md) supplies a concrete exception to the manual's word “consecutive”: `0x4251d5..0x42524b` increments `save+0x1768` only for exactly eight incoming characters all rescued; the third success resets that count and increments `save+0x13e4`, capped at three. A partial crossing neither increments nor resets the count. Reusing an assumed global “consecutive wins” implementation would be incorrect.

Still needed before enabling campaign mode: the exact directed scene/route table and gates, reservoir ordering and recruitment constraints, per-family counters and partial/return transitions, Boolie award quantities and identity rules, and atomic ending/reward transitions. The manual supplies intent, not those implementation contracts. No route bypass or aggregate-only inventory is justified by this audit.

## Bubble Bumpers risk decision

The [current detailed report](specs/mountain-rescue-bubble-bumpers.md) is newer and more precise than early coverage summaries. Its independent logical movement model is substantial, but it is not a complete browser scheduler: the native launch has a one-second pending phase; movement ticks wait for pending launch and animation settlement. Full runtime work needs source-derived schedules and serializable pending launches, cell occupancy, held bubbles, collisions, device cycles, and ordered magnet propagation. The source's final-eligible-magnet result and `old_id + 1000*new_id` temporary cooccupancy, including character-zero asymmetry, must remain literal.

Level one's candidate builders `0x441d70` and `0x442a30` still execute original instructions. An independent best-of-30 selector and trait prefix do not make them independent browser generators. Four uninitialized value-five words, old BL, unwritten predicate-B output slots, and an extra existence-scan caller word are replay inputs. Two documented original calls exhausted 20,000-instruction budgets; `NoCandidate` is an independent-model signal, not an original termination branch. Level two separately reads the uninitialized character byte +4 if category zero is selected; the model exposes `pretrait_bytes`. Level-three singleton/identical-trait fallbacks also need a concrete-memory boundary.

**Compatibility decision for the first player slice:** Bubble Bumpers stays unavailable. Do not reroll a failing board, normalize scratch bytes silently, call original code at runtime, or describe zero-filled-memory fixtures as full native parity. A future separately versioned profile must explicitly fix all scratch/heap inputs, bound unsuccessful generation, export known bad-path fixtures, and distinguish a reported unsupported instance from a changed distribution. That profile requires an independent candidate-builder port and timed-resume fixtures before player exposure.
