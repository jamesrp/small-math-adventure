# The shared case engine

`dist/cases.js` and `dist/cases.css` are for themes whose mathematics is listing every case of a small experiment and sorting the cases into groups. They keep a shelf of the cases a child has found, refuse repeats and cases that don't count, accept "That's all" only when nothing is missing, and draw the shelf, its groups and the full catalog. They also draw lettered cups on lettered homes or in numbered slots, and numbered counters in a bag. They never know a family's rules. Mixed-up cups ([mixup](mixup/README.md), Week 63), Ticket shuffles ([shuffles](shuffles/README.md), Week 43), Fair bags ([bags](bags/README.md), Week 42), Copying bags ([copies](copies/README.md), Week 44), Hidden sides ([sides](sides/README.md), Week 45), Three decks ([decks](decks/README.md), Week 24) and Take it or pass ([offers](offers/README.md), Week 60) use it. See [the plan](plan/README.md), Wave 2.

The module imports only `expansion-controls.js`, so a family module can import it without reaching back to `families.js`.

## Cases

A case is a short string key, such as `BCA` for a row of cups or `RB` for two draws. The family decides which keys exist and which count; the engine only compares keys.

```js
import {permutations, sequences, product, rowsOf, isRow, atHome, differences} from '../../cases.js';

permutations(['A', 'B', 'C']);   // every order, in dictionary order of the items given
sequences(['R', 'B'], 2);        // RR, RB, BR, BB
product([[1, 2, 3], [2, 3]]);    // [1,2] [1,3] [2,2] [2,3] [3,2] [3,3]: one choice from each list in turn
rowsOf(4);                       // 'ABCD' … 'DCBA': the 24 rows of four lettered cups
isRow(3, 'CAB');                 // a row of the first three letters, each once
atHome('ACB');                   // ['A']: the cups standing on their own homes
differences('ABCD', 'BACD');     // 2: places where two keys differ
```

`permutations`, `sequences`, `product` and `rowsOf` are cached, so calling them in every render costs nothing. They return the cached arrays: copy before changing one.

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

With `o.load`, kept cases are buttons carrying `data-case`; `wireCases(root, onCase)` sends a tap to the family, which Mixed-up cups uses to put a kept row back on the board and Ticket shuffles to play a kept story again. `o.current` marks the kept case equal to the board. Bin and hoop labels are HTML, so a family can put small pictures in them.

## Cups

`cupsBoard(row, o)` draws one cup per home with the Cup swaps look (`.cup-board`, `.cup-button`, `.cup-color-N`): cup `X` in colour and symbol `X`, the home's letter and symbol under it, and an ochre home when its own cup stands on it. Options: `pinned` (homes whose cups never move, drawn with a dot and disabled), `picked`, `hinted` (homes to glow), `still` (every cup disabled, for a solved board), `slots` (homes numbered 1, 2, 3, … with no letter and no ochre, for cups in places rather than at home), `enabled` (the only homes whose cups can be used; the rest are disabled) and `inert` (cups drawn as pictures, not buttons). `cupMini(row)` is the small lettered row for shelves and catalogs, `sayRow` its spoken form and `swapRow(row, i, j)` a swap. `wireCups(root, {picked, pick, swap})` turns two taps, a drag from one cup onto another (mouse or finger) or Enter on two cups into `swap(i, j)`; tapping the picked cup again calls `pick(null)`. Disabled cups and inert pictures never move.

## Counters

Numbered discs drawn from a bag. `counterIds('RRB')` numbers a bag's colours in order (`R1`, `R2`, `B1`), `sayCounter('B2')` is "blue 2" and `counterMini(id, number)` the small disc for shelves and catalogs. `counterHTML(id, o)` draws one disc: a button when `o.button` (disabled when `o.still`, ringed when `o.hinted`) carrying `data-counter` and `data-at`, otherwise a picture; `o.number` and `o.name` replace its number and spoken name. `counterBagHTML(ids, o)` draws a bag of them: `o.sorted` puts them a colour at a time, `o.byId` keys their focus by id for a bag that grows, `o.number(id, i)` and `o.name(id, i)` renumber and rename them (Fair bags numbers a bag whose colours change by place), and `o.tag` labels one of two bags. `drawRowHTML(draws, n, label)` is the row of counters drawn so far, with an empty place for each draw to come. `wireCounters(root, (id, at) => …)` sends taps on counter buttons to the family. The colours are `COUNTER_COLOURS`: red, blue and yellow (Copying bags added yellow, class `cY`, for its three-colour puzzle).

## Styles

A family's stylesheet starts with `@import url('../../cases.css');` and scopes its own rules under its own class. The base look follows `dist/boards.css`: paper cards, ink, pine for the case on the board, ochre for a cup at home and for hints, green for the cases that count in a catalog. Four groups sit two by two on a phone.

## What the other listing themes need from it

What exists covers Weeks 63, 43, 42, 44, 45, 24 and 60. The notes for the others are proposals, not decisions; each theme's review card in the worksheets repository (`plans/review/week-NN.md`) has the fuller App fit.

| Week | Theme | Engine use | Probably needs |
|---|---|---|---|
| 43 | Fair shuffles | Done: [Ticket shuffles](shuffles/README.md). Stories are `product` of the ticket cups, played on cups in numbered `slots` with `swapRow`; bins by the order each makes; the catalog certifies a rule | Nothing more |
| 42 | Fair results from a bag | Done: [Fair bags](bags/README.md). Marked pairs of numbered counters; a rule sends a whole colour pair to the square, circle or skip bin (never one marked pair, which would let any 8–8 split pass); the family checks fairness and the fewest skips | Nothing more |
| 44 | The bag that copies | Done: [Copying bags](copies/README.md). Histories of numbered counters on a bag that grows (`counterBagHTML` with `byId`; the family adds each copy); bins by the mix of colours or the colour order; the catalog shows all 24 three-draw histories by their reds. No weights: numbered histories are already equally likely | Nothing more |
| 45 | The visible side | Done: [Hidden sides](sides/README.md). Cases are the six sides (a number in the cup names one); the child sorts red-showing sides into hides-red and hides-blue bins with `binsHTML`; Keep checks a cup with `keepCase`; the catalogs show the 63 cups by red sides and, for whole cards, the seven tables by their piles. The cards, the cup and the stacks of whole cards are the family's own | Nothing more |
| 24 | Nontransitive decks | Done: [Three decks](decks/README.md). Cases are deals (keyed deck by deck), swaps and menu cards, kept with `keepCase` and `claimCases`; the catalogs show every swap, every menu card, every deal with 9, 8 and 7 pinned, every split and every cycle. The win grids, the deck rows and the two-tap card swaps are the family's own: a grid is a fixed 3 × 3 of pairs, not a catalog | Nothing more |
| 60 | Optimal stopping | Done: [Take it or pass](offers/README.md). Cases are complete cards, `sequences(tickets, n)` with the unseen offers kept, since offers repeat; a plan is a Take/Pass switch for each first offer (and each second offer after a passed first) and scores every card. Best plans, cards and tickets are kept with `keepCase` and `claimCases`; `catalogHTML` sorts the tickets. The cards, switches and towers are the family's own. No total shows until a solve, and a wrong claim says only that another plan scores more, so it never points at the switch to change | Nothing more |

## Tests

`tests/cases.test.mjs` checks the listings, the shelf's honesty, groups and hoops, and what each drawing marks. Each family tests its own rules; `node scripts/families-browser-smoke.mjs` opens every puzzle and solves it through hints, `node scripts/mixup-browser-smoke.mjs` and `node scripts/shuffles-browser-smoke.mjs` play the cups through taps, drags (`TEST_PHONE=1` for touch) and keys, `node scripts/bags-browser-smoke.mjs` the counters and rule rows, `node scripts/copies-browser-smoke.mjs` the growing bag and the playground's runs, and `node scripts/sides-browser-smoke.mjs` the cards, the cup and the stacks.
