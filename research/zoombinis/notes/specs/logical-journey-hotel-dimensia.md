# Hotel Dimensia native specification

`tools/spec_lj_hotel_dimensia.py` supplies an independent procedural generator and incremental placement model. **140 generator cases and 2,400 placement-rule cases passed isolated native comparisons**, including all four generator difficulties, partial axis labels, and the native validation override. Reports and witnesses are in `local/analysis/logical-journey-hotel-dimensia/`; the structured spec and local resource inventory are in `local/specs/logical-journey/hotel-dimensia.json`.

Rooms acquire their meanings through placement. On each selected trait axis, a coordinate either has a value already assigned (which must match), or can claim a new value not assigned to another coordinate on that axis. Labels persist after acceptance. Multiple Zoombinis can share a room if all selected traits match. The occupancy count is capped at six for presentation; it does not impose a six-person acceptance limit.

UI/native levels 1/0, 2/1, 3/2, 4/3 use one, two, two, and three trait axes respectively, with 5/25/25/125 destinations. The first successful placement establishes labels and sets the clock to 5/2/4/2. Rule rejection advances the clock by one; the hotel closes at 12, giving 7/10/8/10 rejections respectively. Invalid or boarded destinations return before rule evaluation and do not cost a mistake. This is an event-driven mistake clock, not a real-time deadline. GO becomes available with at least one accommodated member and transfers that subset.

The generator (`0x417230`) first counts distinct values per trait, then repeatedly draws **three** trait indices 0–3 even on levels that use one or two. UI1–2 require distinct first two and preferentially choose axes with enough represented values, with a fallback when at least three categories have fewer than five values. UI3 has a similar threshold of four; UI4 requires three distinct categories. The exact predicate and RNG order are in `generate()`.

UI3 also generates two temporary value permutations by interleaved rejection draws, identifies room pairs unused by the party, draws a positive number of blocked rooms capped at eight, and selects those rooms by repeated rank draws with rejection. Every chosen board consumes a visual-style draw. Styles are subsequently associated with rooms in sorted room order, rather than selection order. The temporary coordinate labels are then cleared before play. Consequently, the final player-created arrangement need not equal the hidden arrangement used to choose safe blocked rooms.

The two-axis validator (`0x417f30`) and three-axis validator (`0x418610`) are exactly represented by partial injective labels, validated against native code. Room-coordinate conventions and static UI geometry addresses are in the JSON spec; native trait indices are used because all visual trait labels have not been independently established.

Reproduce from the project directory:

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_hotel_dimensia.py --validate-native
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_hotel_dimensia.py --validate-state
python3 -S research/zoombinis/tools/spec_lj_hotel_dimensia.py --write-spec
```

The native command uses the previously approved memory-only Unicorn harness and native dependencies. Generator rendering is stubbed; rule functions execute directly. The settled lifecycle now also passes 79 native slice comparisons: 12 first-acceptance clock cases, 35 rejections through closure, and 32 acceptance/room-count cases. Four pure complete-to-night traces verify partial departure. Presentation hooks are stubbed, while native clock, closure flag, room-count, accommodated-count and GO-enable mutations execute. Core logical completeness is true within this semantic boundary; exact avatar stacking, animation scheduling and developer cheat sequences remain outside it.
