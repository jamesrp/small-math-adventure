# Pipes of Paloo: recovered puzzle specification

The three normal generators, scene shuffle, water predicates, and master-valve decision are executable in `tools/spec_mr_pipes_of_paloo.py`. The structured specification is `local/specs/mountain-rescue/pipes-of-paloo.json`. All source assets and generated test evidence remain under ignored `local/`.

The source is `INSTALL/HD/zoombini2.exe`, SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`. All addresses below are for that version; corresponding raw file offsets are VA minus `0x400000`. The tool refuses other versions.

## State, actions, and escape

Input is the actual arriving party of 1–16 characters and its four traits, each valued 1–5. Generation does not invent a replacement party. The state consists of the generated network, indicated trait on each labeled pipe, and an injective assignment of characters to basins. Characters can be moved between empty basins or back to the waiting group. Mismatches cost no attempts; rearrangement is unlimited while the valve remains uncommitted.

A pipe compares **the two occupants’ values on the indicated attribute**. It does not require the particular value stored in its generator record. That value records a generation witness; different matching values are valid.

The master-valve callback `0x4330c0–0x433192` requires an editable board, at least one eligible character, and at least one occupied basin. It immediately copies every eligible character’s water flag (`+0x79`) into its final escape flag (`+0x5c`), disables every character, and changes phase to 1. The exit animation removes characters afterward (`0x436ba0–0x437046`); it does not invalidate already committed rescues as basins empty. Full success means every arriving character is marked. A partial commit rescues the marked subset and strands everyone else. Pulling with no eligible character has no effect.

## Difficulty and exact generation

The CRT RNG recurrence is `s = (214013*s + 2531011) mod 2^32`, returning `(s >> 16) & 32767`. The seed parameter is the RNG state at this scene’s generation boundary, not a whole-game launch seed. First, scene initialization repeatedly samples `rand()%n`, rejecting indices already selected, until it builds a permutation. Levels 1 and 3 use that order. Level 2 consumes those calls but then passes the original party vector to its generator.

**Level 1: independent pairs.** There are `floor(n/2)` labeled pair connections and, for odd `n`, one free middle basin. The generator at `0x4387e0` greedily pairs compatible characters, taking the first equal trait in a freshly shuffled attribute list. This shuffle uses **400 random swaps, consuming 800 RNG draws per candidate comparison**, rather than a removal shuffle. It retries at most nine passes, giving deferred unmatched characters priority in reversed order. Remaining unmatched characters form unlabeled wildcard pairs. Finally, it draws two pair indices and swaps those records once. Physical pair `i` connects basins `i` and `i+ceil(n/2)` and uses record `floor(n/2)-1-i`. Full feedback at `0x438170–0x43856c` accepts each matching occupied pair independently; an occupied free middle basin is automatically eligible.

A nondefault integer in `zoombini2.cfg`, loaded at `0x463a14` into `0x576a58`, selects a second Level 1 generator. Default initialization sets it to zero (`0x463822`). The alternate generator makes up to ten passes, testing only the first available other character for each available parent, with random attribute draws. Equality on the fourth distinct tested attribute is rejected. Its reorder call always receives index zero, preserving order. This alternate branch is also modeled and compared to the original code.

**Level 2: five branches sharing one root.** The basin graph consists of paths `15–i–(i+5)–(i+10)` for `i=0..4`; shorter parties expose the first `n` positions in `[15,0,5,10,1,6,11,2,7,12,3,8,13,4,9,14]`. The generator `0x4369e0` makes at most 100 attempts. It chooses a random root character, then fills rows 2, 1, and 0 across `floor((n+1)/3)` branches, stopping after `n` processed slots. Partner search scans unused characters in index order and samples attributes with replacement. Here, too, a match on the fourth distinct tested attribute is rejected. A missing partner leaves `-1` fields; those unlabeled connections are wildcards. The first attempt without missing slots wins; otherwise the **last** attempt wins, not the best attempt. Water reaches only occupied matching paths connected to basin 15. The central occupant is independently eligible. Original water logic is `0x437480–0x437a53`.

**Level 3: a generated embedded tree.** The allowed geometry is a 16-node adjacency table at VA `0x492ab8`, file offset `0x92ab8`, 512 bytes. The tool extracts it locally under a source hash guard. The generator first counts each character’s possible partners with the exact helper and stably sorts by increasing count. It grows a tree by searching unused characters and occupied nodes in index order; after finding a shared trait it samples neighbor slots until an empty allowed neighbor is found. If no compatible extension exists, it randomly chooses an empty node adjacent to the current tree, assigns the first unused character, and creates an unlabeled edge with axis/value `111`.

The wrapper tries AX (first character as root), then BY (random root), accepting an attempt with no forced edges. If both fail, it tries ten AY candidates (first character as root) and keeps the minimum forced-edge count **among those ten**, excluding AX/BY from that comparison. It retains the best edge array; the final node-assignment scratch table can still belong to the last candidate. The renderer creates actual basins from the retained edge endpoints (`0x43487b–0x434af9`), so that scratch table is not the board definition. Generator entry is `0x435bf0`; generation ends before rendering at `0x4361e1`.

Level 3 feedback (`0x4336f0–0x43391f`) retains matching occupied edges in the component connected to source basin 0. Characters incident to retained edges receive water. The native code performs recursive connectivity checks across 50 passes; the model computes the equivalent source component, verified against the original function.

## Non-obvious boundary details

- Two small matching helpers differ: `0x433230` rejects equality on the fourth distinct tested trait; `0x433a30` accepts it. Both consume repeated attribute draws until their own termination rule is met.
- Axis 111 reads character byte `0x73`, rather than a visible trait. That is the high byte of the animation-state dword at `+0x70`. Scene initialization calls `0x45d520`, which writes state 33, so ordinary resting occupants have byte `0x73=0` and the edge behaves as a wildcard. The model also accepts raw character bytes to reproduce exceptional values; native tests deliberately varied that byte.
- Level 2 visual pipe state assumes normal pickup/recompute before replacement. Arbitrary direct memory swaps can retain stale visual flags and are outside the legal-action model.
- The Level 1 callback marks the sole character eligible even before placement, but the valve still requires an occupied basin. At Level 3 with one character, generation creates no edges; the checked callback gives no character water. The renderer does expose a single basin for zero edges (`0x434b03–0x434b68`). This is an exact isolated boundary observation, not a claim that an entire campaign necessarily reaches or becomes stuck in that situation.
- Uninitialized record padding and irrelevant unused stack fields are deliberately excluded from comparisons. This does not omit any tested pipe label or predicate.

## Verification and reproduction

From repository root, with the existing research venv:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_mr_pipes_of_paloo.py --validate-helpers --validate-generation --validate-prefix --validate-feedback --export
```

Unicorn needs execution outside this host’s restrictive sandbox because its memory mapping triggers SIGILL inside it. The original Windows executable is never launched. The harness emulates selected x86 functions in isolated memory; graphics, audio, allocation, and thread-state access have explicit stubs. The real arithmetic, selection logic, trait checks, connectivity decisions, and master-valve gate remain native.

Passing evidence under `local/analysis/mountain-rescue-pipes-of-paloo/`:

| Evidence | Cases |
|---|---:|
| Two small matching helpers | 320 |
| Normal generators, sizes 1–16 across all three levels, exact RNG trace | 144 |
| Scene shuffle, exact output and RNG trace | 80 |
| Alternate Level 1 generator, exact output and RNG trace | 80 |
| Full water-feedback states, including partial occupancy and fallback edges | 1,920 |
| Actual master-valve callback and final success flags | 1,920 |

The asset bindings include 41 source files under `Data/Bmp/waterslide/`, with hashes and frame counts in the specification. Full source offsets and decoded frame paths remain in `local/derived/mountain-rescue/manifest.jsonl`. Manual PDF pages 16 and 29 corroborate the visible mechanics; the procedural details above come from native code and parity tests.

This covers the normal puzzle-logic boundary, including the alternate Level 1 generator. Pixel hit-testing, animation timing, shared campaign/save progression, and malformed input records are outside this specification.
