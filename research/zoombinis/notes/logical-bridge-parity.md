# Allergic Cliffs: recovered generator and validation parity

The complete Allergic Cliffs rule generator and rule validator have been reconstructed for the Logical Journey executable whose SHA-256 is `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`.

The model reproduces the native rule bytes, candidate enumeration, per-candidate matching counts, final RNG state and ancillary unique-rule fields at an explicitly supplied generator-entry state. This is **function-level parity**, not an end-to-end game replay. The generator is `0x407180..0x407916`; the validator is `0x407950..0x4079d9`. `bridge.mhk` is referenced by initialization at `0x405cde`, and that initialization calls the recovered generator at `0x405f3d`.

## Exactly what changes with difficulty

A Zoombini has four categorical attributes, each taking one of five values. Rules always use **OR**, and the two bridges have complementary predicates. The executable's attribute IDs are 1–4, with values 1–5. The Python API preserves those IDs; this pass does not assign unverified hairstyle/eye/nose/feet labels to individual native IDs.

| Displayed level | Native level | Candidate rule family | Exact candidate count |
|---|---:|---|---:|
| Not So Easy | 0 | One selected value of one attribute | `4 × 5 = 20` |
| Oh So Hard | 1 | Either of two distinct selected values of the same attribute | `4 × C(5,2) = 40` |
| Very Hard | 2 | One selected value in each of two distinct attributes; either can match | `C(4,2) × 5² = 150` |
| Very, Very Hard | 3 | One selected value in each of three distinct attributes; any can match | `C(4,3) × 5³ = 500` |

This settles the previously unresolved connective at levels 3–4: the native validator accepts a matching Zoombini when **any** selected feature matches. No conjunction or XOR is generated.

The four level families were already suggested by STRL 1700/1720/1740/1760. The native code establishes their exact parameter space and sampling order. It does not simply choose features independently at random.

## Exact generation procedure

1. Enumerate the entire level-specific candidate family in the fixed order below.
2. Count how many members of the **current incoming party** match each candidate's OR predicate.
3. Search the matching-count buckets using the native balancing procedure.
4. Draw a rank within the first nonempty bucket and choose that candidate, retaining original enumeration order.
5. Draw one orientation bit to decide which bridge accepts the matching set.
6. Write the native rule structure and ancillary bookkeeping fields.

There is no random rejection loop and no independent sampling of attributes/values. Incoming party composition directly controls which candidate rules can be chosen.

The balancing procedure has a subtle asymmetry. Set `h = floor(party_size / 2)`. The machine probes:

```text
h, h+1, h-1, h, h-2, h-1, h-3, h-2, ...
```

The step alternates `+1, -2`; it does **not** alternate ever-larger positive and negative offsets. Ignoring repeated buckets, the preference is `h, h+1, h-1, h-2, h-3, ...`. Only matching counts from 1 through 15 are eligible, independently of actual party size. The first nonempty bucket wins.

This is not symmetric nearest-to-half optimization. The native tests include a legal 16-member party with one rule matching 11 Zoombinis, yet the generator chooses a rule matching only 4: it never examines the 11-match bucket. The exact party and all candidate counts are saved in `parity-results.json`.

A synthetic party of 16 identical Zoombinis has only 0-match and 16-match candidates, so the original balancing loop has no terminating candidate. That party violates the game's two-identical-Zoombinis limit. The model rejects inputs with no reachable eligible bucket, while the native test confirms budget exhaustion for the pathological input. It does not claim to reproduce an infinite loop.

### Candidate ordering and encoding

Candidates are 32-bit words. Native attribute 1 occupies the high byte, and attribute 4 the low byte. Zero denotes an unused attribute. At native level 1, a byte contains the two accepted values in its high and low nibbles.

- Level 0: attributes in order 4, 3, 2, 1; values 1 through 5.
- Level 1: attributes 4, 3, 2, 1; pairs `12,13,14,15,23,24,25,34,35,45` in hexadecimal/nibble notation. The emitted rule lists the low nibble before the high nibble.
- Level 2: attribute pairs `(4,3),(4,2),(4,1),(3,2),(3,1),(2,1)`. Within each pair, the first attribute's value changes fastest, 1 through 5.
- Level 3: triples `(4,3,2),(4,3,1),(4,2,1),(3,2,1)`. The first attribute changes fastest, then the second, then the third.

The generator makes exactly two calls to native range RNG wrapper `0x401070`: rank in `[1, tied_candidate_count]`, followed by orientation in `[0,1]`. The wrapper ultimately uses the previously recovered LCG:

```text
state = (214013 * state + 2531011) mod 2^32
bounded_value = (state >> 16) mod (maximum + 1)
```

The rank call does **not** advance the state when there is one tied candidate. The modulo operation is preserved; the model does not replace it with an ideal uniform sampler. Both calls use the shared RNG state, so gameplay or audio code executed before entry can affect the resulting instance. The model accepts the initialized state at generator entry rather than pretending that a user-provided number reproduces the original wall-clock startup seed.

### Native rule and validator

The rule occupies a cleared 30-byte structure at `0x4945b0`:

| Relative offset | Field |
|---:|---|
| 0 | 16-bit constant 1 |
| 2 | 16-bit orientation: 0 lower accepts the matching set, 1 upper accepts it |
| 4 | Number of OR terms |
| 5 onward | Native attribute IDs |
| 10 onward | Corresponding native feature values |

The validator takes `(rule_pointer, bridge_id, entity_pointer)`. It reads four trait bytes from `entity_pointer + 0xc0`. Bridge ID 1 is lower and ID 2 upper. Any other signed 16-bit bridge ID is normalized to 1; that normalization was tested explicitly. It returns 1 for acceptance and 0 for rejection.

Native level 0 also stores the selected packed rule at `0x4a21d0` and matching count at `0x4a21e0` when the chosen bucket contains exactly one candidate. Other cases clear those fields. Their later gameplay use is outside this reconstruction.

A separate static observation identifies the six-step rejection counter at `0x4945aa`: initialization clears it, `0x4070a3..0x4070ad` saturates it at 6, and input handling at `0x4068b5` stops new processing once it reaches 6. These instructions do not branch by difficulty. The complete mistake/animation/session state machine was not emulated, so this observation is not included in the function-level parity claim.

## Verification and boundary

`test_logical_bridge_generator.py` completed without mismatches:

| Check | Count |
|---|---:|
| Complete native generator comparisons | 1,560 |
| Native candidate words compared | 276,900 |
| Native per-candidate party counts compared | 276,900 |
| Native validators on generated incoming parties | 26,880 |
| Native validators covering all 625 trait tuples on representative level rules, both orientations and six bridge inputs | 30,000 |
| Python complement invariants over every candidate and all 625 trait tuples | 443,750 |
| Single-tie generator cases, covering the no-rank-RNG-advance behavior | 96 |

The generator cases cover 65 parties, all four difficulty levels and six initial states: 0, 1, 2, `0x12345678`, `0x7fffffff`, `0xffffffff`. Party sizes range from 1 through 16, including uniform sampling, a constant attribute, duplicate pairs and a dominant trait. Each test party respects the maximum of two identical Zoombinis. Thirty-six full native/model witnesses are retained locally.

The oracle executes the original x86 instructions in Unicorn, with no Windows process, game UI, filesystem or network calls. Only three dependencies are replaced:

- `0x476e50`: allocation from a private memory region.
- `0x476de0`: free as a no-op during the bounded experiment.
- `0x44a920`: supplies a fixed party buffer with a 16-bit count, two padding bytes and four trait bytes per member.

The original RNG routines execute unchanged. Lazy seeding is disabled through `0x48bc28`, the state at `0x4959d0` is explicitly supplied, and rule storage is cleared as in bridge initialization. The executable hash is checked before any oracle call. The remaining boundary is actual party extraction from live entities, wall-clock seeding and previous RNG consumption, difficulty progression, and the complete crossing/failure state machine.

## Files and commands

- Model and CLI: `tools/logical_bridge_generator.py`.
- Isolated native boundary: `tools/logical_bridge_oracle.py`, using the shared `native_oracle.py`.
- Differential test: `tools/test_logical_bridge_generator.py`.
- Evidence: `local/analysis/logical-journey-bridge/{generator,validator,bridge,party}-disassembly.txt`.
- Results: `local/analysis/logical-journey-bridge/parity-results.json` and `parity-witnesses.jsonl`.

From the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/test_logical_bridge_generator.py
python3 research/zoombinis/tools/logical_bridge_generator.py --party /absolute/path/party.json --difficulty 3 --state 0x12345678
```

The party file contains a JSON array of four-value tuples, for example `[[1,2,3,4],[5,4,3,2]]`. The CLI emits a rule and provenance-compatible native fields without reading copyrighted assets. The oracle test requires the local original executable. On this Mac, Unicorn's executable-memory mapping fails inside the restrictive sandbox; the bounded tests were run through approved unsandboxed execution.

## Finite-party difficulty structure

`tools/logical_bridge_difficulty.py` exhaustively enumerates all four rule families on the same 65 deterministic parity-test parties: 260 cases and 46,150 candidate evaluations. The fixed fixtures cover sizes 1–16, sampled distinct tuples, a constant first attribute, duplicate pairs, a dominant first-attribute value, and the asymmetric-balancing counterexample. Each contains at most two identical Zoombinis. They are an analysis corpus, not a representative sample of live gameplay.

The resulting hypothesis is a **membership vector for this party**: bit `i` indicates whether the lower bridge accepts member `i`. Distinct syntax can produce the same vector. The analysis first applies the exact native match-count filter, collapses predicates agreeing on every current member, then includes both bridge orientations and removes duplicate vectors again. Recovering the hidden syntactic rule is a different problem: observations of this party cannot distinguish rules that agree on the party. Display/UI levels 1–4 correspond respectively to native indices 0–3.

Across all 65 fixtures, these are exact ranges rather than probability estimates:

| Display level | Total syntactic candidates | Candidates in selected bucket | Distinct matching vectors in bucket | Distinct classifications including orientation |
|---|---:|---:|---:|---:|
| Not So Easy | 20 | 1–10 | 1–4 | 2–8 |
| Oh So Hard | 40 | 2–24 | 1–15 | 2–30 |
| Very Hard | 150 | 5–84 | 1–25 | 2–50 |
| Very, Very Hard | 500 | 30–296 | 1–113 | 2–222 |

The selected buckets contain 11,799 syntactic candidates in total across the 260 cases. The machine-readable report also records the prefilter distinct-vector counts, every candidate-count histogram, the chosen split sizes, selected candidate indices, all surviving membership vectors, and their syntactic multiplicities. A multiplicity is not a probability: the native modulo RNG and the entry-state distribution require separate treatment.

### Why 500 rules can describe far fewer distinguishable situations

For the 16-member duplicate-pair fixture `n16-variant2` at display level 4:

- There are 500 syntactic rules; only 118 different matching vectors occur even before balancing.
- The selected 8/8 bucket contains 133 rules, which collapse to 33 matching vectors.
- Adding both orientations gives 266 syntactic rule/orientation pairs but only **48 distinct classifications**. Eighteen of the 33 matching vectors already have their complement among those 33, so adding orientation does not simply double the count.
- The vector `0x3f30` alone is produced by 12 different selected rules before orientation. For example, native predicates `(attribute 4 = 3) OR (attribute 3 = 3) OR (attribute 2 = 1)` and `(attribute 4 = 4) OR (attribute 3 = 3) OR (attribute 2 = 1)` accept exactly the same party members. On this fixture, the last two terms already cover everyone added by either first term.

Absent values, correlated traits, overlap between OR terms, and duplicate members all permit this collapse. For comparison, the distinct-tuple 16-member fixture at the same level has 105 selected rules, 73 matching vectors, and 146 oriented classifications. A syntactic family size alone does not determine the classification problem faced by a particular party.

### One-query diagnostic structure

For every case, the oriented hypothesis set is closed under complement. Therefore any individual member's bridge test partitions that initial set into two equal halves: for each possible vector accepting that member, its complement rejects them. In the 48-classification example, every first query leaves exactly 24 possible classifications, whichever result occurs. This is a cardinality statement with **no prior distribution over hypotheses**; it does not mean the native game gives each hypothesis equal probability. The report includes the two exact outcome counts for every member.

The model's RNG support also does not remove any candidate/orientation combination: a constructive inverse-LCG calculation supplies an initialized 32-bit entry state for every rank and either orientation. The tool checks 14,944 such witnesses against the recovered generator, covering all 94 distinct selected-bucket sizes observed in these fixtures. This establishes possibility at generator entry; it does not establish that real wall-clock startup and preceding gameplay visit those states with any particular frequency.

### Exact ideal classification query counts

For the five 16-member fixtures, a bounded exact decision-tree search completed all 20 difficulty cases. A query may select any remaining unqueried party member for a test on the lower bridge. Both binary outcomes are observable; acceptance and rejection attempts each cost one query, with free deductions between queries. The objective is to identify the complete party classification, not its syntactic rule. The solver is given the visible party, difficulty, native candidate families and native balancing filter.

| 16-member fixture | Not So Easy | Oh So Hard | Very Hard | Very, Very Hard |
|---|---:|---:|---:|---:|
| Distinct tuples (`variant0`) | 3 | 3 | 6 | 8 |
| Constant first attribute (`variant1`) | 1 | 3 | 4 | 7 |
| Duplicate pairs (`variant2`) | 2 | 4 | 5 | 6 |
| Dominant first attribute (`variant3`) | 1 | 3 | 5 | 7 |
| Asymmetric-balancing counterexample | 3 | 5 | 5 | 8 |

Every value is the exact minimum worst-case number of adaptive individual queries for that fixture and the stated model. For all 20 cases, the optimum attains the binary-information lower bound `ceil(log2(number of distinct oriented classifications))`. The report stores a full decision-tree witness for each case and verifies its result for every hypothesis. The largest exact search visited 40 states; the configured cap is 200,000 per case. If a future fixture exhausts that cap, the tool reports lower and constructive upper bounds rather than claiming optimality.

The search uses `D(H) = 1 + min_i max(D(H_i,0), D(H_i,1))`, with terminal value zero for one remaining hypothesis. Pruning uses the binary-information lower bound and a verified greedy-tree upper bound. It was independently checked against an exhaustive recurrence on all 255 nonempty three-bit hypothesis families and against all Boolean cubes of dimensions 1–6: 261 checks. Greedy query selection is not always optimal: it needs seven queries for the duplicate-pair hardest fixture, while the exact strategy needs six; for the hardest asymmetric fixture the corresponding values are nine and eight.

These query counts describe an ideal inference task. They exclude the six-mistake gameplay budget, constraints arising when crossing removes an entity, crossing and animation actions, identifying the syntactic rule, and the cognitive cost of discovering or using the native filtering algorithm. They are **not measured human difficulty**, a predicted failure rate, or a claim that players possess this solver's knowledge. They do show that increasing the native level changes distinguishable classifications on these fixtures, while traits within the current party substantially affect the resulting problem.

Run the analysis from the repository root:

```sh
python3 research/zoombinis/tools/logical_bridge_difficulty.py
```

Output: `local/analysis/logical-journey-bridge/difficulty-analysis.json`. This command needs only Python's standard library. It runs the Python model and imports the shared fixture definitions; it neither reads the game executable nor imports or invokes the native emulator. Native oracle dependencies are imported only when the separate differential test's `main()` runs.
