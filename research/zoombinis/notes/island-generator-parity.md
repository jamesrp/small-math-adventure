# Island Odyssey: Greenhouse generator parity

The Greenhouse packed-board generator and its four subsequent random-list
operations are reconstructed in `tools/island_generator.py`. The isolated x86
oracle in `tools/island_oracle.py` matched **3,012 generated boards**, all random
outputs in order, final RNG states, and all four lists. Five separately labeled
matrix cases also matched the native transform helper. This is core generation
parity for the version below; moving moth/beetle behavior remains outside the
claim.

## Version and evidence

All source files remain under ignored `local/`. No original game process,
installer, Windows environment, or UI was launched.

| Source | SHA-256 |
|---|---|
| `local/discs/island-odyssey/HD/Win/Zoombinis Island Odyssey.exe` | `619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2` |
| `local/discs/island-odyssey/HD/scripts/z3a4data.xml` | `cc09b738e07999301cc96555840d9e1cc6a738457560d8fc9e636e9618269274` |
| `User's Guide.pdf` (extracted in `local/manuals/island-odyssey.json`) | `9afb1390684753c42e3e719e9b783df3905dfe0b7af664cce906cb2fc8b3fc4f` |

Executable addresses below are virtual addresses with image base `0x400000`.
For these `.text` locations, file offset is VA minus `0x400000`. The annotated
listing is `local/derived/island-odyssey/native/island-odyssey.disassembly.txt`.
Both tools guard the source version; the model's default template loader also
rejects an unrecognized template hash.

| Routine/evidence | Address | Recovered behavior |
|---|---|---|
| Outer setup | `0x405340` | Seed, level cardinalities, core call, random lists, moth trait assignment |
| Core generator | `0x405110`–`0x4052b7` | Clears and constructs the packed board, fills zeros, scrambles |
| XML template combine | `0x404ea0`–`0x40506d` | Reads `Num`, `T#`, rows and optional `BE`; consumes template/transform RNG |
| Transform | `0x404c10`–`0x404d5f` | Identity, two reflections, both reflections, clockwise rotation |
| Generation swap predicate | `0x405070` | Rejects same position; level 3 also requires equal leaf count |
| Random list | `0x4052d0`–`0x40532f` | Initializes consecutive integers, performs `10*n` random swaps |
| Trait assignment calls | `0x40546a`–`0x405629` | Which traits belong to the twelve moth objects |
| Display trait mapping | `0x4056da` onward | Extracts leaf/shape/color fields for plant artwork |
| Player selection/swap | `0x406d10`–`0x406f05`, `0x406c70` | Occupied plants cannot be selected; player swaps lack the generator's equal-leaf restriction |
| Initial wand budget / decrement | `0x403ac7`; `0x406ebf`–`0x406ec6` | 30 initial swaps, decrement once per accepted player swap |
| Path annotation | `0x407a70` | Subsequent deterministic helper; outside current parity boundary |

## Exact generation sequence

`generate(seed, level)` accepts the uint32 value supplied to `srand`. The original
outer setup substitutes current time when its requested seed is zero. This pure
API deliberately permits explicit `srand(0)`, including in the boundary tests.

1. Allocate a 12 × 12 row-major board. Each uint32 packs leaf count in bits 0–1,
   flower shape in bits 2–4, and flower color in bits 5–7. The shift table at
   `0x44f4a8` is `(0, 2, 5)`. Attribute names are supported by the manual (PDF
   pages 22–23, 36), the renderer, and the level-3 help text's extra two flower
   shapes/one flower color; these names are semantic identifications, not debug
   symbols preserved in the executable.
2. Choose cardinalities `(3,4,5)` at levels 1–2, `(3,6,6)` at level 3.
3. In channel order leaf, shape, color, consume `rand()%Num+1` and read that
   `T#` child from `TemplateN`. Every shipped `Num` is **1**. Thus this version
   always uses `T1`; the two additional `Template3` children are dormant in this
   path. The modulo-one selection still consumes a random value.
4. At levels 1–2, independently select each channel's orientation with
   `rand()%4`: 0 identity, 1 horizontal reflection, 2 vertical reflection,
   3 both. At level 3, leaf count instead uses fixed clockwise rotation 90
   without consuming a transform random value. Shape and color each select a
   reflection of `Template6/T1`. Superimpose the three shifted matrices.
5. Traverse cells row-major, and within each cell visit channels leaf, shape,
   color. Replace each zero field by `rand()%cardinality+1`. Leaves have no
   zeros. Levels 1–2 fill 24 shape and 24 color fields; level 3 fills 28 of each.
6. Level 1 ends without scrambling. Levels 2–3 accept exactly **20 swaps**.
   Every candidate consumes two independent `rand()%144` positions. Reject
   equal positions; level 3 also rejects pairs with unequal leaf fields.
   Accepted swaps exchange the entire packed plant. Distinct positions with
   identical packed values still count as an accepted swap. The algorithm has
   no subsequent path, uniqueness, optimality, or difficulty rejection filter.
7. The original invokes path annotation at `0x4052b7`. The oracle stops before
   this call. Static inspection separates it from random generation; it uses
   temporary connectivity structures and contains no random call.
8. Reconstruct the following four random lists in the original order: leaf
   IDs `1..3`, shape IDs `1..4` or `1..6`, color IDs `1..5` or `1..6`, then an
   order permutation `0..11`. Each list uses exactly `10*n` swaps with two
   `rand()%n` calls each, including self-swaps. It is not Fisher–Yates. These
   consume 480 additional random values at levels 1–2, 540 at level 3.

The three trait permutations set moth traits, rather than relabeling the
board. At levels 1–2 the twelve moths comprise three leaf, four shape and five
color traits. At level 3 they comprise six shape and six color traits; leaf
counts support beetles. Trait IDs passed to the moth setter are leaf `v`, shape
`v+3`, color `v+9`; encoded matching values are `v`, `v<<2`, `v<<5`. The fourth
list is retained as `moth_order_permutation`; downstream timing/order of use
has not been validated.

The RNG compatibility dependency is explicit:
`state = (state*214013 + 2531011) mod 2^32`, then
`rand = (state >> 16) & 0x7fff`. This executable imports MSVCRT `rand`/`srand`.
The compatibility recurrence is corroborated by the [Wine MSVCRT implementation,
version 1.3.31](https://goma.googlesource.com/wine/+/refs/tags/wine-1.3.31/dlls/msvcrt/misc.c).
The emulator hooks that dependency; it does not independently verify the absent
original MSVCRT DLL. The comparison does independently verify how many values
the original puzzle consumes, their ordering and every resulting board/list.

## What difficulty changes

All three levels keep the same board dimensions. The main change is the
required operation on three overlapping attribute graphs, not board size.

| Property | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Leaf / shape / color counts | 3 / 4 / 5 | 3 / 4 / 5 | 3 / 6 / 6 |
| Moth matching traits | 3 leaf + 4 shape + 5 color | Same | 6 shape + 6 color |
| Guaranteed paths before scramble | 12 horizontal | 12 horizontal | 12 horizontal + 3 vertical leaf |
| Accepted generation swaps | 0 | 20, any distinct positions | 20, distinct positions with equal leaves |
| Initially preserved structure | All twelve moth crossings | No crossing guarantee after scramble | All three vertical leaf corridors |
| Required thinking suggested by structure | Trace a matching path and choose its entry | Repair paths by exchanging whole multi-attribute plants | Repair shape/color paths while preserving vertical beetle routes and handling traffic |

The level-1 puzzle is principally identification/routing on an already solved
attribute layout. Level 2 introduces coupled changes: a swap that repairs one
attribute can damage another. Level 3 changes both the trait distribution and
the direction of a preserved subsystem. The generator keeps every leaf at its
original position by only swapping plants with equal leaves; **player swaps do
not have this restriction**, so careless repairs can damage the vertical routes.
The manual adds the dynamic complication of beetles blocking moth movement
(PDF pages 23 and 36). That timing/occupancy burden is documented rather than
simulated here.

This is template perturbation, not free-form random maze generation. Fixed
orientations and blank fills vary a known solvable framework. Both high-level
shape and color use the same six-value template with independent orientations.
Level 3 retains a particularly strong invariant: its complete leaf layout is
identical for every seed, because the fixed rotated template has no holes and
the accepted scramble preserves each position's leaf value.

### Measured structural difficulty

`greenhouse-difficulty-analysis.json` records seeds 1–1000 at every level. A
crossing means at least one orthogonal same-trait connected path between the
relevant borders, measured by independent breadth-first search. It is **not** a
claim that the original autonomous moth will choose that path or that its
entrance is unambiguous.

| Measure, 1,000 seeds each | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Mean initial moth traits with a crossing (out of 12) | 12 | 0.566 | 0.351 |
| Range of initial moth crossings | 12 | 0–5 | 0–3 |
| Seeds with at least one initial moth crossing | 1,000 | 420 | 277 |
| Vertical beetle crossings | N/A | N/A | 3 in every seed |
| Mean cells changed by scramble | 0 | 34.408 | 33.040 |
| Core random calls, min–max | 54 | 94–98 | 117–257 |

Level-2 crossing histogram: `0:580, 1:298, 2:100, 3:21, 5:1`.
Level-3 crossing histogram: `0:723, 1:211, 2:58, 3:8`.
The manual's blanket assertion that level 2 has no complete pathways is
stronger than the implemented generator supports: 42% of these seeds retain
at least one structural crossing. No whole-board reroll removes such cases.
These frequencies describe the stated seed sample, not uniform probabilities
over the RNG's full state space, and they do not measure human solve time.

### Solvability certificates and their limits

`greenhouse-template-path-certificates.json` has **75 independently checked
paths**, exhausting every trait of every used template under every permitted
orientation (including the rotated leaf template). Every path uses only fixed
nonzero template cells. Random fill cannot remove these paths, so all seeds
have the required structural crossings before scrambling.

Every generated example includes `metrics.scramble_undo_witness`: the accepted
scramble pairs in reverse order. Applying it restores that solved layout in at
most 20 swaps, within the initial 30-swap budget. This is an explicit static
solution certificate, not an optimum or uniqueness claim. It does not certify
a schedule around moving occupants or every choice made by autonomous agents.
At level 3 the certificate also preserves the leaf layout throughout.

## Native oracle boundary and reproducibility

The oracle maps the PE into Unicorn and invokes isolated functions in emulated
memory. Imports fail closed unless explicitly provided. Only `rand`, XML
accessors, `atoi`, `sprintf`, and `sscanf` are hooked, with XML values read from
the source file into memory. No native filesystem, network, process creation,
rendering, sound, or game event loop is provided. XML selection, integer parsing
and the external RNG are compatibility boundaries; arithmetic, transform
instructions, RNG call sites, zero detection, rejection conditions, swaps and
list operations execute from the original executable.

Entry signatures, using x86 `thiscall` with `ECX = object`:

- `0x405110(shape_count, color_count)`, callee pops 8 bytes. Object allocation
  is `0x1500` bytes; set XML tree pointer at `+0x1300` and level at `+0x1340`.
  Output is 144 little-endian uint32 values at `+0xc28`. Stop at `0x4052b7`.
- `0x404c10(transform_code, grid_pointer)`, callee pops 8 bytes.
- `0x4052d0(count, destination_pointer, start)`, callee pops 12 bytes.
- The XML tree stub's first uint32 points to the root node. The template loader
  writes its `BE` triple to object `+0x1448..+0x1450` (shipped `T1`: `3 5 9`).

The 3,012 board cases cover seeds 1–1000 plus `0`, `0x7fffffff`, `0x80000000`,
`0xffffffff`, at each level. The output includes each grid's SHA-256. For each
case it checks all 144 cell values, core RNG count/state, all four permutations,
final RNG count/state and the complete ordered random-value trace. Transform
tests use a matrix of distinct labels so symmetry cannot hide a wrong direction.

Run from the repository root:

```sh
python3 research/zoombinis/tools/island_generator.py --certify-templates
python3 research/zoombinis/tools/island_generator.py --samples 1000
python3 research/zoombinis/tools/island_generator.py --seed 1 --level 3 --trace
research/zoombinis/.venv/bin/python research/zoombinis/tools/island_oracle.py --samples 1000
```

On this macOS host Unicorn's JIT needs the agent's approved execution permission;
the sandbox crashes even on an empty emulator mapping. The model, template
certificates and statistics use only Python's standard library and work inside
the sandbox. Outputs are under `local/analysis/island-odyssey/`, including the
three level/seed-1 examples with full random traces.

Remaining parity work is the deterministic path-annotation helper, the moth and
beetle movement/state machines, spawn scheduling and the exact operational win
condition. Those are deliberately distinct from the now-validated initial board
and random-list generator; they should be recovered before claiming full puzzle
behavior parity or interpreting graph witnesses as executable play traces.
