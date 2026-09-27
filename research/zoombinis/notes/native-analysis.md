# Static native analysis

`tools/native_analysis.py` reads the three main Windows executables with LLVM `objdump`, preserving PE information, full x86 disassembly and printable strings. Every result records the source hash. Original code was not executed.

Two random helpers have been decoded. This is a dependency of generator recovery, not a claim that the puzzle generators have been reimplemented.

| Game | Native address | Recovered behavior |
|---|---|---|
| Logical Journey | `0x40f9a0` | Update 32-bit state with `214013 * state + 2531011`; return the high 16 bits modulo `uint16(maximum) + 1`. The bound is inclusive. A zero bound returns zero without advancing after optional lazy seed initialization. |
| Mountain Rescue | `0x46c7c0` | Same 32-bit state update; return `(state >> 16) & 0x7fff`. A distinct routine at `0x46c7b3` stores the seed in thread data. |
| Island Odyssey | PE imports | Imports `rand` and `srand` from `MSVCRT.dll`. No implementation parity is inferred from those names alone. |

Logical Journey stores state at `0x4959d0`, checks a lazy-initialization flag at `0x48bc28`, and initializes through `0x40fa10`. Its multiply is compiled as shifts and adds. Mountain Rescue uses explicit multiply/add instructions and thread storage at offset `0x14`.

The disassembly contains **91 direct call sites** to the identified Logical Journey random/seed helpers and **267** to Mountain Rescue's helpers. `local/native-analysis/<game>/analysis.json` includes nearby instructions for each site. These counts include initialization/seed calls and do not imply 91 or 267 generators. Indirect calls and inlined code are outside this call-site index.

Pure Python equivalents are included for studying these isolated transitions. The tests check known states, overflow, inclusive bounds, zero bounds, and the different 15/16-bit output behavior. Seeding, caller order and per-puzzle setup have not been modeled by this shared module.

The executables recognized by the address-specific analysis are:

| Game | SHA-256 |
|---|---|
| Logical Journey | `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3` |
| Mountain Rescue | `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa` |
| Island Odyssey | `619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2` |

Per-puzzle discoveries such as Beetle Bug Alley's weighted table selection and the Greenhouse's template transformations are documented in the corresponding game notes.
