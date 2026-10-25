# Puzzles library: regions

Decided October 24, 2026 (Claude as product owner, before James's playtest), from the plan's UI item ([plan](plan/README.md), Track A: "group them into regions by kind of mathematics … with an icon per family").

## What the library shows

1. **From the road**, unchanged: the families of the boards this explorer has met on the road (any trail), in road order ([ROAD.md](ROAD.md#around-the-road-puzzles-grown-ups-and-reading-aloud)).
2. Then every other family under its **region**, the regions in the order below. A region heading is only a name, in the same style as From the road: no count, description or teaser (`AGENTS.md`). A region with nothing left in it (every family already on the shelf) has no heading.
3. **Each family appears once.** A family on the shelf is not listed again under its region.
4. Inside a region the order is the library's old one: the region's base families in pack order, then its families from the seam, newest first.

Regions are headings, not disclosures, so the disclosures that Back, Forward and reload restore are still the families alone (`data-view-key="family-<id>"`, `dist/view-state.js`). A family the Puzzles tab reopens scrolls in 12 px below the top of the screen.

## Where a family's region is declared

- `REGIONS` in [`dist/families.js`](../dist/families.js): the eight keys, their order and the names children see.
- A module that adds a family names its region in its entry: `family: {id, symbol, area, region}` ([Adding a family](ADDING-A-FAMILY.md#the-module-entry)). `area` is a different thing: the Grown-ups heading for the family's notes.
- The twelve base mechanics: `BASE_REGIONS` in [`dist/caravan-ui.js`](../dist/caravan-ui.js).
- `tests/library-parents.test.mjs` fails on a family without a region. If one ever reached a child, it would still show, last, under More puzzles.

## The regions

The source of truth is the worksheet catalog's eight areas (`catalog/concepts.toml`, `[areas]`, in the worksheets repository). A week's area is the area of its first concept, as the catalog's explorer files it (`catalog/build.py`), and each week record's `app` field names its app family or group. A family built from one week takes that week's area. A family built from weeks in different areas, or from none (a base mechanic with no week of its own), is placed by what a child does on its board.

| Order | Key | Catalog area | Library heading | Families |
|---|---|---|---|---|
| 1 | `games` | Games, choices and optimization | Games and choices | 4 |
| 2 | `networks` | Networks and graphs | Maps and networks | 12 |
| 3 | `shape` | Shape, space and surfaces | Shapes and spaces | 23 |
| 4 | `symmetry` | Symmetry, groups and algebra | Patterns and symmetry | 8 |
| 5 | `number` | Numbers and divisibility | Numbers | 6 |
| 6 | `counting` | Counting and arrangements | Counting and arranging | 9 |
| 7 | `logic` | Logic, algorithms and information | Codes and logic | 7 |
| 8 | `chance` | Chance, dynamics and infinity | Chance and machines | 11 |

Why these names: a child reads them while scrolling, so each is short and names what is on the boards. "Games and choices" rather than "Games", because Moving piles asks for the cheapest moves, not a win against anyone (the catalog area is games, choices and optimization). "Shapes and spaces" rather than "Shapes and tilings", because only Tile gardens and Rhombus gardens of its 23 families are tilings; the rest are rooms with portals, a ball, a cylinder, folds, rulers and more. "Counting and arranging", because most of its boards are about putting things in order (sliding numbers, nesting cards, circle strings). "Chance and machines" covers the catalog's dynamics: boards that run a rule again and again (sharing circles, gap rings, seed plots, paint rows).

## Every family's region

Weeks are the catalog's weeks whose `app` field names the family or a group in it, with each week's area.

| Region | Family | Weeks (catalog area) | Why |
|---|---|---|---|
| Games and choices | Pebble Duel (`nim`) | 7, 8, 83 (games); 81 Buckets (chance) | A take-away duel against the app; Buckets is a duel too. |
| | Voting and agendas (`votes`) | 87 (games) | One week, in games. |
| | Moving piles (`piles`) | 99 (games) | One week, in games. |
| | Fair shares (`shares`) | 58 (games) | One week, in games. |
| Maps and networks | Bridge Courier (`route`) | 10 (networks) | One week, in networks; the child walks roads between dots. |
| | Neighbor Lanterns (`color`) | base; 62 First fit (networks) | Colours dots so that linked dots differ: a map colouring. |
| | Flip switches (`rotor`) | 91 (networks) | One week, in networks. |
| | Cops and robbers (`cops`) | 86 (networks) | One week, in networks. |
| | Corners (`corners`) | 56 (networks) | One week, in networks. |
| | Ways out (`ends`) | 68 (networks) | One week, in networks. |
| | Pairs that stay (`matching`) | 27 (networks) | One week, in networks. |
| | Meeting roads (`meeting`) | 67 (networks); 69 Gaps (shape) | Finds a meeting dot on a road map for three homes; Gaps uses the same maps. |
| | Bracing frames (`braces`) | 52 (networks) | One week, in networks. |
| | Cheapest networks (`mst`) | 53 (networks) | One week, in networks. |
| | Routes and roadblocks (`flow`) | 13 (networks) | One week, in networks. |
| | Chip firing (`chips`) | 11 (networks) | One week, in networks. |
| Shapes and spaces | Tile gardens (`tile`) | base; 32 Squares (number); 93 Missing square (shape) | Covers a garden with tiles. |
| | Mirror Couriers (`billiard`) | 9, 21, 71 (shape); 31 Sight lines (number) | Sends a ball bouncing round a room. |
| | Drawing machines (`pantograph`) | 85 (shape) | One week, in shape. |
| | Loop worlds (`loops`) | 100 (shape) | One week, in shape. |
| | Ball triangles (`globe`) | 61 (shape) | One week, in shape. |
| | Snug spinners (`width`) | 59 (shape) | One week, in shape. |
| | Octagon streets (`octagon`) | 65 (shape) | One week, in shape. |
| | Seams (`mobius`) | 38 (shape) | One week, in shape. |
| | Flat folds (`creases`) | 28 (shape) | One week, in shape. |
| | Three-arm lines (`tropical`) | 78 (shape) | One week, in shape. |
| | Ruler strips (`ranges`) | 51 (shape); 92 Fold and stretch, 94 Hidden machines (chance) | Every board is strips on a ruler: measuring, the concept all three weeks share. |
| | Stretch bands (`radon`) | 22 (shape) | One week, in shape. |
| | Strands (`strands`) | 75 (shape) | One week, in shape. |
| | Portal shields (`shields`) | 70 (shape) | One week, in shape. |
| | Glued squares (`glued`) | 64 (shape) | One week, in shape. |
| | Nearest dots (`sites`) | 15 (shape) | One week, in shape. |
| | Area traps (`covers`) | 48 (shape) | One week, in shape. |
| | Geoboard (`geoboard`) | 57 (shape) | One week, in shape. |
| | Knot colours (`knots`) | 40 (shape) | One week, in shape. |
| | Portal rooms (`portals`) | 41 (shape) | One week, in shape. |
| | Gentle hills (`hills`) | 47 (shape) | One week, in shape. |
| | Rainbow triangles (`rainbow`) | 16 (shape) | One week, in shape. |
| | Rhombus gardens (`rhombus`) | 1 (shape); 1e (games) | Fills outlines with rhombus blocks; the 1e duel is played on the same tiling. |
| Patterns and symmetry | Cup swaps (`swap`) | base; 3 Shuffle machines (symmetry) | Rearranges cups by the swaps allowed: permutations. |
| | Lantern Wires (`toggle`) | 2, 66 (symmetry); 77 Holes (shape) | Taps wires that flip lanterns until the light pattern matches. |
| | Mirror twins (`tetra`) | 37 (symmetry) | One week, in symmetry. |
| | Footprint borders (`friezes`) | 35 (symmetry) | One week, in symmetry. |
| | Doubling elevators (`elevators`) | 74 (symmetry) | One week, in symmetry. |
| | Memory robot (`robot`) | 72 (symmetry); 50 Staircases (shape) | Walks a robot round grid streets; its memory depends on the path, not just where it ends. |
| | Road detours (`detours`) | 39 (symmetry) | One week, in symmetry. |
| | Bead rings (`beads`) | 33 (number); 34 Hidden turns (symmetry) | Paints rings and turns or flips them to compare. |
| Numbers | Clockwork Gates (`clock`) | base; 4 Star drawing (number) | Rings bells that move a marker round a clock: counting round. |
| | Spring-water Jugs (`jug`) | base; 29 Full jugs (number) | Measures amounts by filling and pouring. |
| | Square leftovers (`leftovers`) | 97 (number) | One week, in number. |
| | Running totals (`totals`) | 89 (number) | One week, in number. |
| | Prime bags (`primes`) | 96 (number) | One week, in number. |
| | Card totals (`sumsets`) | 55 (number) | One week, in number. |
| Counting and arranging | Sliding numbers (`taquin`) | 90 (counting) | One week, in counting. |
| | Shrink strips (`shrink`) | 76 (counting) | One week, in counting. |
| | Circle strings (`strings`) | 12 (counting) | One week, in counting. |
| | Joining strips (`joins`) | 54 (counting) | One week, in counting. |
| | Nesting cards (`nests`) | 19 (counting) | One week, in counting. |
| | Trios (`trios`) | 36 (counting) | One week, in counting. |
| | Polygon cuts (`cuts`) | 14 (counting) | One week, in counting. |
| | Garden fences (`fences`) | 26 (counting) | One week, in counting. |
| | Mixed-up cups (`mixup`) | 63 (counting) | One week, in counting. |
| Codes and logic | Symbol Orchard (`latin`) | base; 5 Towers (logic) | Fills a grid so no symbol repeats in a row or column, from clues. |
| | Signal Lanterns (`code`) | base; 6, 18 (logic) | Breaks a hidden code from test results. |
| | Odd-pebble Balance (`weigh`) | base; 30 Weight kits (number) | Weighs groups to find the one odd pebble: a search for information. Weight kits is numbers, but it is a group. |
| | Who knows (`knowledge`) | 84 (logic) | One week, in logic. |
| | Card machines (`cardmachines`) | 17 (logic) | One week, in logic. |
| | Hidden pictures (`pictures`) | 25 (logic) | One week, in logic. |
| | Sorting machines (`sorting`) | 23 (logic) | One week, in logic. |
| Chance and machines | Catch and mark (`catches`) | 95 (chance) | One week, in chance. |
| | Seed plots (`seeds`) | 98 (chance) | One week, in chance (dynamics: growth by a rule). |
| | Gap rings (`diffs`) | 49 (chance) | One week, in chance (dynamics: a rule run round a ring). |
| | Sharing circles (`averages`) | 20 (chance) | One week, in chance (dynamics: averaging again and again). |
| | Take it or pass (`offers`) | 60 (chance) | One week, in chance. |
| | Three decks (`decks`) | 24 (chance) | One week, in chance. |
| | Hidden sides (`sides`) | 45 (chance) | One week, in chance. |
| | Copying bags (`copies`) | 44 (chance) | One week, in chance. |
| | Paint rows (`paint`) | 46 (chance) | One week, in chance. |
| | Fair bags (`bags`) | 42 (chance) | One week, in chance. |
| | Ticket shuffles (`shuffles`) | 43 (chance) | One week, in chance. |

A few single-week families sit where a child might not look first (Garden fences under counting, Road detours under symmetry, Flip switches and Cops and robbers under networks rather than machines or games). They follow the catalog, which is the source of truth; if children look for them elsewhere, change the catalog week's first concept or this decision, not one module alone.

## Symbols

Every family's symbol is its own within its region (`tests/library-parents.test.mjs`). Two are shared across regions and several mean something else; the proposal is a brief for the Dot/Codex lane in [art/ROADMAP.md](art/ROADMAP.md#region-and-family-icons-brief-october-24), since icons are art. No symbol was changed here.

## On a phone

Measured with a new explorer (no shelf) at 390×844 and 375×667: the page is about 8,000 px, as before (7,600 px with one list). The regions run 423 px (Games and choices) to 2,209 px (Shapes and spaces, 23 families, two and a half screens on the larger phone and over three on the smaller). Family rows are 80 px. The headings give a child something to steer by, but the longest region is still a long scroll. Regions stay headings (decided above); whether children need a quicker way down is for James's playtest.

## Checks

- `tests/library-parents.test.mjs`: the shelf, then the regions in order, each heading only a name; every family in the pack (`scripts/packs.mjs`) once, on the shelf or under its region, for an explorer who has met nothing, part of each trail and all of each trail; every module names a region; symbols distinct within a region.
- `tests/families.test.mjs`: the satchel's order by region.
- `scripts/navigation-browser-smoke.mjs`: a new explorer sees every region in order with each family once; families opened in three regions and the scroll position come back through Back, Forward and reload.
- `scripts/road-browser-smoke.mjs`: after each trail, the shelf first, then the regions in order, with no family listed twice.

## Not yet done

- No child has used the regions. Watch whether children read the headings at all, whether they find a family they remember, and whether Shapes and spaces feels too long on a phone.
- Drawn region and family icons (the brief above).
- The Grown-ups notes keep their own nine areas (`AREAS`), an earlier choice for adults; they are not the library's regions.
