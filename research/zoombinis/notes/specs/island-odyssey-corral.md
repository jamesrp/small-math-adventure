# The Corral — recovered specification

The Corral is a finite experiment-and-classification puzzle. `tools/spec_io_corral.py` recovers the generator, feeding rule, projector actions and complete random Venn-cell relocation algorithm. The machine-readable specification is `local/specs/island-odyssey/corral.json`.

Each berry has four-valued shape, color and leaf traits. Every animal has the preferences of one generated berry; its independently random feet and tail are decoration for this puzzle, not a preference code. Level 1 accepts equality on two selected traits and ignores the third. Levels 2/3 require all three. A berry can first be used on projector trays to learn animal preferences. A projector tests one fixed attribute of the placed berry, and animals move into the corresponding circle or intersections.

Level 1 has two projectors, highlighted attributes and eleven placements of power. Level 2 has three projectors, highlighted attributes and eight placements. Level 3 has the same acceptance rule and budget as level 2, but hides which attribute each projector tests. This adds an unknown permutation to the inference task; the player can compare population counts and intersections against the visible berry population. The budgets are counters, not clocks.

A valid insertion into an empty projector spends one use. Removing a berry clears that projection for free but does **not** rearrange animals; their retained positions are not a fresh observation. The next valid insertion rearranges all internal animal positions. Existing valid positions are retained, invalid positions freed first, then each animal chooses a random candidate cell with retry on occupied cells. This includes internal cells for animals already fed, although their movement animations are skipped. The exact 37-cell regions and candidate order are in the tool and exported native tables.

Feeding a correct berry consumes it, removes the animal and passes one token. A rejected berry is also permanently spent. Initially there is a perfect matching by generation index. At level 1, alternatives are interchangeable within two-attribute equivalence classes; at higher levels exact triples match. Thus correct feeds cannot destroy the remaining matching. This is a mathematical existence argument, not a guarantee that every player can deduce all preferences within the available experiments. Wrong feeds reduce the maximum rescue because there are exactly as many berries as animals.

When power reaches zero, new projector admissions stop but feeding remains available. Exhausting berries or feeding every animal emits the round's finished event. The script awards progression for feeding all incoming animals, including smaller groups. Go is enabled only after the destination Barn's token count reaches its configured minimum, unlike the common first-success condition elsewhere.

The source generator has an unusual rejection filter: the product `(shape+1)*(color+1)*(leaf+1)` must be new. It does not merely reject identical triples. This makes permutations and different factorizations collide. Every item then draws feet, tail and a random unused initial cell, followed by three visual placement jitters. Finally it draws the left and right projector attributes, consumes an unused third RNG draw, and assigns the remaining attribute to the top projector. There are `9*tokens+3+3*rejected_triples` setup draws. Rare adjacency-count correction branches are also preserved exactly. No authored normal template is used; optional debug input uses the misleading root name `Z3A5Data`.

Validation passes 900 native setup cases spanning all three levels and groups of 1, 6 and 12; 73,728 feeding comparisons covering all triples and axis permutations; 360 complete native relocation comparisons including RNG sequences; and thirty constructive matching witnesses. The native harness executes the original arithmetic, selection and relocation instructions. Resource construction and presentation/event transports are stubbed, and the feeding decision is entered at a balanced fragment boundary.

The outgoing token script copies `currentZerbleFeet` and `currentZerbleTail` for Barn. The native current-animal field is assigned on walk completion, whereas the correct event is emitted earlier in the native routine. Those operations are documented separately: the external script-event transport's scheduling has not been emulated, so this report does not assert end-to-end attribute transfer timing.

Reproduce from the repository root:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_io_corral.py --validate --samples 100
python3 research/zoombinis/tools/spec_io_corral.py --export
```

The native harness needs the approved unsandboxed process for Unicorn's macOS JIT; it never starts the game. Source hashes are guarded. The independent model and export use standard-library Python. Native evidence spans `0x41f580..0x422079`; the report lists specific entry points, fields and table offsets. Shipped manual pages 25–26 and 37 corroborate the rules.
