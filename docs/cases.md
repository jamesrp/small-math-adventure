# The shared case engine

`dist/cases.js` and `dist/cases.css` are for themes whose mathematics is listing every case of a small experiment and sorting the cases into groups. They keep a shelf of the cases a child has found, refuse repeats and cases that don't count, accept "That's all" only when nothing is missing, and draw the shelf, its groups and the full catalog. They also draw lettered cups on lettered homes, which two of the themes use. They never know a family's rules. Mixed-up cups ([mixup](mixup/README.md), Week 63) is the first user. The plan's other listing themes can build on it: nontransitive decks (24), fair results from a bag (42), fair shuffles (43), the bag that copies (44), the visible side (45) and optimal stopping (60). See [the plan](plan/README.md), Wave 2.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## Cases

A case is a short string key, such as `BCA` for a row of cups or `RB` for two draws. The family decides which keys exist and which count; the engine only compares keys.

```js
import {permutations, sequences, rowsOf, isRow, atHome, differences} from '../../cases.js';

permutations(['A', 'B', 'C']);   // every order, in dictionary order of the items given
sequences(['R', 'B'], 2);        // RR, RB, BR, BB
rowsOf(4);                       // 'ABCD' … 'DCBA': the 24 rows of four lettered cups
isRow(3, 'CAB');                 // a row of the first three letters, each once
atHome('ACB');                   // ['A']: the cups standing on their own homes
differences('ABCD', 'BACD');     // 2: places where two keys differ
```

All of these are cached, so calling them in every render costs nothing.

## The shelf

A family keeps three fields in its board: `kept` (keys, in the order found), `claimed` (That's all was right) and `missed` (it was early).

| Function | Does |
|---|---|
| `keepCase(kept, key, counts, limit)` | The new `kept`, or `null` if the key doesn't count, is already kept, or the shelf is full |
| `missingCases(target, kept)` | The keys that count and aren't kept yet |
| `claimCases(target, kept)` | `{claimed, missed}` for a That's all |
| `validShelf(board, target, limit)` | Checks a save: no repeats, every kept key counts, `claimed` only when nothing is missing, `missed` only when something is |
| `nearestCase(cases, from, distance)` | The case nearest the board, for hints that walk toward one answer (ties broken alphabetically, so hints are stable) |

Nothing here shows how many cases there are. A find-every puzzle shows the cases found, and That's all is the claim; an early one gets "There's another." from the family (the plan rules out "k of n" counters, because knowing you have them all is the mathematics).

## Groups

- `groupCases(keys, bins, bin)`: disjoint bins, each case in the one `bin(key)` names. `evenGroups(groups)` says whether every bin holds the same number, the equal-weight check.
- `hoopCases(keys, [left, right])`: two sets that may overlap, each with `has(key)`. Returns `{left, both, right, outside}`.

## Drawing

Every drawing takes `mini(key)` (the family's small picture of a case) and `say(key)` (its spoken name).

| Function | Draws |
|---|---|
| `shelfHTML(kept, o)` | The kept cases in the order found |
| `binsHTML(kept, bins, bin, o)` | Labelled columns; `o.always` keeps empty columns in place before anything is kept |
| `hoopsHTML(kept, hoops, o)` | Two overlapping hoops with left-only, both and right-only parts, and a row below for cases in neither |
| `catalogHTML(cases, columns, column, o)` | Every case in columns, with `o.mark(key)` naming a class (`yes` stands out, `no` fades): the certificate shown after a solve |

With `o.load`, kept cases are buttons carrying `data-case`; `wireCases(root, onCase)` sends a tap to the family, which Mixed-up cups uses to put a kept row back on the board. `o.current` marks the kept case equal to the board. Bin and hoop labels are HTML, so a family can put small pictures in them.

## Cups

`cupsBoard(row, o)` draws one cup per home with the Cup swaps look (`.cup-board`, `.cup-button`, `.cup-color-N`): cup `X` in colour and symbol `X`, the home's letter and symbol under it, and an ochre home when its own cup stands on it. Options: `pinned` (homes whose cups never move, drawn with a dot and disabled), `picked`, `hinted` (homes to glow), `still` (every cup disabled, for a solved board). `cupMini(row)` is the small lettered row for shelves and catalogs, `sayRow` its spoken form and `swapRow(row, i, j)` a swap. `wireCups(root, {picked, pick, swap})` turns two taps, a drag from one cup onto another (mouse or finger) or Enter on two cups into `swap(i, j)`.

## Styles

A family's stylesheet starts with `@import url('../../cases.css');` and scopes its own rules under its own class. The base look follows `dist/boards.css`: paper cards, ink, pine for the case on the board, ochre for a cup at home and for hints, green for the cases that count in a catalog. Four groups sit two by two on a phone.

## What the other listing themes need from it

What exists covers Week 63 fully. The notes are proposals, not decisions.

| Week | Theme | Engine use | Probably needs |
|---|---|---|---|
| 43 | Fair shuffles | Cups for the tickets' order; each story (a list of ticket draws) is a case run on the cups with `swapRow`; bins by the order it makes; `evenGroups` says whether a rule is fair. The naive rule's 27 stories can't split evenly into 6 bins, Fisher–Yates' 6 can | A way to play a story on the cups step by step |
| 42 | Fair results from a bag | Ordered pairs of draws with `sequences`; bins are the rule's results (first wins, second wins, draw again); `evenGroups` is the fairness check | Bins the child fills: tap a case, then a bin. `bin(key)` can already read the child's choice from the board; only the tap on a bin is missing |
| 44 | The bag that copies | Histories as `sequences`; bins by the final bag | Weighted cases: histories are not equally likely, so groups compare total weight, not counts |
| 45 | The visible side | Cases are (ticket, side) pairs; the clue keeps some; bins by ticket show the 2/3 | Nothing new |
| 24 | Nontransitive decks | The 9 pairings of a card from each of two decks, drawn with `catalogHTML` as a live win grid (columns by one deck's card, `mark` by winner) | A deck-dealing board, the family's own |
| 60 | Optimal stopping | Every order of the offers; `catalogHTML` marks the orders a stopping rule wins | The anti-guessing limits in [insight-without-ai.md](insight-without-ai.md): few rules, so a child must not be able to try them all |

## Tests

`tests/cases.test.mjs` checks the listings, the shelf's honesty, groups and hoops, and what each drawing marks. Each family tests its own rules; `node scripts/families-browser-smoke.mjs` opens every puzzle and solves it through hints, and `node scripts/mixup-browser-smoke.mjs` plays the cups through taps, drags (`TEST_PHONE=1` for touch) and keys.
