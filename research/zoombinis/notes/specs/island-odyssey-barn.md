# Barn — complete settled puzzle specification

The Barn combines two-allele inheritance with cyclic dominance. A parent with visible phenotype `a` has genotype `(a,a)` or `(a,(a+1)%3)`. Trait 0 dominates 1, 1 dominates 2, and 2 dominates 0. Crossing the two parent allele pairs gives four offspring. The original validator compares the **multiset of offspring phenotypes**, not their positions on the wheel. Any matching pair passes.

The local machine specification is `local/specs/island-odyssey/barn.json`; the independent implementation and native oracle are `tools/spec_io_barn.py`. Local assets and original executable remain excluded from distribution. This is a settled mathematical/gameplay model, not a game UI or whole-runtime replacement.

## State, input and actions

Normal mode takes at most twelve port tokens and forms `floor(tokenCount/2)` pairs. Incoming tokens alternate between left and right sides; valid type, feet and tail traits are retained. Missing traits are generated. Practice uses twelve newly generated animals. An odd final token is not included in the puzzle, and fewer than two tokens does not start the native generator.

Place one remaining animal from each side on its own empty stone. Wrong-side or occupied-stone drops do not form a legal selection. Two occupied stones automatically trigger a comparison. A wrong pair stays on the stones and remains available. Remove a parent before replacing it; removal alone consumes no attempt. Repeating the same wrong pair consumes another attempt. A correct pair leaves permanently, its original two token tags are emitted, and a new target is computed from the remaining animals.

At level 1 the stones reveal the two alleles. At levels 2 and 3 alleles are hidden, but a two-parent experiment shows all four predicted offspring. A visible dominant phenotype alone has two possible underlying genotypes. The pool's result can constrain those possibilities, so the later levels add inference with limited experiments.

The matching routine returns the multiset-intersection size, 0–4. Four means correct; this internal score is not claimed to appear numerically in the UI. A correct match passes both parents, whatever their relationship to the hidden witness pair. Go enables after the first successful pair. Already passed pairs remain passed when experiments are exhausted. The pool dries because of wrong attempts, not elapsed time. The native out-of-turns notification is deferred to a subsequent pickup/drop of a selected parent after the limit; stone admission already rejects further placement at that limit.

Script progression requires more than eleven passed animals. A smaller party can rescue all paired members but does not satisfy this progression condition. Full-success speech compares the moved count to the original capped party size, so an odd unpaired token prevents that speech condition even after every generated pair passes.

## Difficulty

| Pairs / starting animals | Level 1 wrong limit | Level 2 wrong limit | Level 3 wrong limit |
|---|---:|---:|---:|
| 1 / 2 | 1 | 1 | 1 |
| 2 / 4 | 1 | 1 | 1 |
| 3 / 6 | 2 | 2 | 1 |
| 4 / 8 | 4 | 4 | 3 |
| 5 / 10 | 6 | 6 | 5 |
| 6 / 12 | 8 | 8 | 6 |

Levels 1 and 2 use feet; level 3 uses tails. Level 1 displays genes; levels 2 and 3 hide them. Level 3 uses the same algebra as level 2 with a different attribute and fewer wrong attempts. Correct pairs do not consume or replenish the wrong-attempt budget.

There are six possible target-attribute genotypes and 36 ordered crosses. `inheritance-table.json` records all 36 with their offspring and histograms. With `p` parents on each side there are `p²` available pairs to choose from initially, and at most `2^(2p)` genotype assignments consistent with dominant phenotypes before accounting for observed targets, experiments or RNG constraints. These are structural sizes, not a claim of calibrated human difficulty.

## Exact generation and solution preservation

The normal entry point is `0x4130b0`, `thiscall generatePuzzle(pairs,targetAttribute,showGenes,maxWrong)`. MPS instructions 1644–1658 select the pair count, budget, target `[1,1,2]` and gene display `[1,0,0]`.

1. For side 0 then side 1, generate `p` removal ordinals: `rand() % (p-i)`. The final modulo-1 draw is retained.
2. For pair index 0 through `p-1`, create left then right parent. Consume the next incoming traits/tag, or default every trait to `-1`.
3. For type, feet and tail in order, sample each missing trait using modulo 1, 3 and 3 respectively. Supplied valid values consume no RNG.
4. Primary allele equals the visible target phenotype. Secondary is `(primary+rand()%2)%3`. If that equals primary, perform exactly one further draw and replace secondary using the same expression. It may still equal primary. There is no rejection until heterozygous.
5. Append to the ordered side list. Positions are authored executable coordinates, not randomly shuffled.
6. At round `r`, choose the stored ordinal in each **current remaining list**, then form their four offspring as the target. No new random draws are required after setup.

A solution always exists with known genes: the pair used to calculate the target is available. If a different pair matches and is removed, both lists still shrink by one, so all future removal ordinals remain valid. Repeating this proves every accepted choice can be extended to rescue every paired animal. This does **not** prove that hidden-gene discovery can always be completed within the mistake budget without prior knowledge.

The separate cheat/debug XML loader at `0x4136a0` is preserved in the source but not ported. It is not a normal difficulty branch. Entry-seed RNG parity excludes the preceding session's random history and ambient animation RNG.

## Evidence and checks

Sources are hash-guarded in the tool. Executable SHA-256 is `619f6e5683aca22886fc4df210d00ad899708712c0ad09dd387b38a1249f36b2`. MPS and XML hashes, exact instruction references and validation-report hash are retained in the spec. Listed executable file offsets are VA minus `0x400000`.

Native evidence: ordinal generation `0x4142f0`; allele generation `0x4146c0`; target selection `0x414750`; offspring `0x4149e0`; dominance `0x414b80`; multiset validator `0x414bc0`; wrong increment `0x4150d8`; legal-stone test `0x41556f`; pair removal and original port-tag emission `0x415d30`. Script 1633–1707 initializes incoming traits, 1751–1823 handles reward, wrong attempts and exhaustion. Manual PDF pages 27, 28 and 38 corroborate the intended interpretation.

The original isolated functions passed:

- 2,160 generator comparisons, covering all three levels, all six party sizes, forty seeds, and absent/full/partially supplied incoming traits. Full RNG words and final state matched.
- 100 offspring comparisons, including missing-parent cases; 6,561 exhaustive multiset-score comparisons and two incomplete-selection checks.
- 600 remaining-list target comparisons, including alternative valid pairs; 600 original success callbacks checking list removal, selected-stone clearing and the emitted two original tags.
- 24 original wrong-counter callback fragments and three pure model exhaustion checks.
- 180 complete zero-error model solution witnesses.

Presentation constructors, sound/animation actions and external script event transport are replaced by explicit stubs or skipped blocks. Native linked-list generation/removal and all specified arithmetic remain original code. The report lists the exact hooks. External TCX scheduling/drag geometry and full script runtime have not been reproduced.

From the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_barn.py --validate --export
python3 research/zoombinis/tools/spec_io_barn.py --export
python3 research/zoombinis/tools/spec_io_barn.py --seed 42 --level 3
```

The first command needs the existing Unicorn/pefile environment and, on this macOS host, the approved unsandboxed JIT context. The latter two are standard-library-only. No original application or UI is launched.

Bindings: scene `z3a7` and CD resource path `z3a7cd`, background 21000, gene resource bases at `0x44fae0`, wheel bases at `0x44faec`, attribute descriptors at `0x451cc0`. Exact tables and all 36 crosses are exported locally. Original resource offsets/hashes and converted PNGs remain connected through the existing extraction manifests.
