# Pebble Duel: Star race and Every start

October 17, 2026. Eleven puzzles built from Week 8 of the Bellingham math circle (rook race and Nim), added to Pebble Duel as two groups, **Star race** and **Every start**, with copy changes to Pebble Duel itself, as the Week 8 review card's Decision asks (`plans/review/week-08.md` in the worksheets repository, October 10, 2026). None of this has been played by children in the app; the Week 8 packets (October 3 revision) are unpiloted too. The packet sources have not changed since the card was written.

## The mathematics

A token sits on a square board with a star in the bottom-left corner. A turn slides it straight left or straight down, one or more squares, and whoever moves it onto the star wins. On the queen boards a turn may also slide it diagonally down and to the left. With piles, a turn takes one or more pebbles from one pile, and whoever takes the last pebble wins.

- **Every start is a first-player or a second-player win,** and working back from the end sorts them: a start is a second-player win exactly when every move from it reaches a first-player win. No move joins two second-player starts, and from every other start some move reaches one.
- **The rook board is two piles.** The square x columns right of the star and y rows up is the game with piles x and y. Its second-player squares are the diagonal x = y: every move leaves the diagonal, and from any other square one move returns to it. Going second from the diagonal, copying keeps the token there until it reaches the star.
- **The queen board is Wythoff's game.** Each row, column and down-left diagonal holds at most one second-player square, since a move would join two. They are (1, 2), (3, 5), (4, 7), (6, 10), (8, 13), … and their mirror images: the pairs (⌊kφ⌋, ⌊kφ²⌋), whose k-th difference is k. The smaller numbers and the larger numbers together list every positive whole number once (Beatty).
- **Three piles: Bouton's theorem.** Split each pile into bundles of 1, 2, 4, 8, …, each size at most once in a pile. The second player wins exactly when every bundle size appears an even number of times across the piles (the Nim-sum is 0). A move always changes one pile and so breaks a pair; from an unpaired position, the pile holding the largest unpaired bundle can be rebuilt to pair everything again. So two piles fix the third: with piles below 8 the second-player starts are a, b and a ⊕ b. With piles of 1 to 3 the only one is 1, 2, 3; with 1 to 6 there are four; with 1 to 7, seven.

What the app checks: in a race, that the child chooses who starts and then wins against a perfect opponent, three games in a row from new starts; in Every start, that the marked squares or kept starts are exactly the second-player starts. Explanations (why copying works, why the bundle rule holds) stay with grown-ups, in the notes.

What a child is meant to discover: on the rook board, that the diagonal is where to hand over the token, and that copying keeps it there; on the queen board, that the safe squares come in mirror pairs that no move joins; with three piles, which starts lose for the player to move, and (in grades 4–5) a rule about bundles that the app never states.

## Where they appear

**Puzzles → Pebble Duel**: Proofs (the three duels) above the levels as before, then Easy, Medium and Hard, then **Menus**, **Star race** and **Every start**. The groups are grade-free (`band: "all"`), each numbered from 1, and Next puzzle walks through a group alone. They are not on the Lantern Road.

| Group | # | Level | Puzzle | Board or piles | Solve | Answer | Week 8 source |
|---|---|---|---|---|---|---|---|
| Star race | 1 | Easy | Four by four | rook, 4 × 4 | Choose who starts and win, 3 in a row from new starts | Go second from (1, 1), (2, 2), (3, 3); first elsewhere | Launch; K–1 P1–P2 |
| Star race | 2 | Easy | Five by five | rook, 5 × 5 | as above | the diagonal, 4 squares | 2–3 P1 |
| Star race | 3 | Medium | Eight by eight | rook, 8 × 8 | as above | the diagonal, 7 squares | K–1 P7; 2–3 P2–P3; 4–5 P1 |
| Star race | 4 | Medium | Queen on six by six | queen, 6 × 6 | as above | (1, 2), (3, 5) and mirrors | 4–5 P8 (new size) |
| Star race | 5 | Hard | Queen on eight by eight | queen, 8 × 8 | as above | (1, 2), (3, 5), (4, 7) and mirrors | 4–5 P8 |
| Every start | 1 | Easy | Six by six | rook, 6 × 6 | Mark every second-player start, That's all | the diagonal, 5 of 35 | K–1 P4; 2–3 P2; 4–5 P1 |
| Every start | 2 | Easy | Piles of 1 to 3 | three piles, 1–3 | Keep every second-player start, That's all | 1, 2, 3 (1 of 10) | 2–3 P8; K–1 P8 |
| Every start | 3 | Medium | Piles of 1 to 6 | three piles, 1–6 | as above | 1, 2, 3; 1, 4, 5; 2, 4, 6; 3, 5, 6 (4 of 56) | 2–3 P9 |
| Every start | 4 | Medium | Queen on eight by eight | queen, 8 × 8 | Mark, That's all | 6 of 63 | 4–5 P8 |
| Every start | 5 | Hard | Piles of 1 to 7 | three piles, 1–7 | Keep, That's all | the four above and 1, 6, 7; 2, 5, 7; 3, 4, 7 (7 of 84) | 4–5 P4 |
| Every start | 6 | Hard | Queen on eleven by eleven | queen, 11 × 11 | Mark, That's all | (1, 2), (3, 5), (4, 7), (6, 10) and mirrors (8 of 120) | 4–5 P9 (on 11 × 11) |

Each puzzle's `provenance` names its problems. Board sizes and starts are the worksheet's; the 6-by-6 queen race and the 11-by-11 queen board (in place of the worksheet's 20-by-20, which would not fit a phone) are new sizes.

## How a puzzle plays

- **The board.** Squares on paper with ink lines, the star in sun in the bottom-left corner, and the token in pine. A small key beside the board draws a token with an arrow for each direction it may slide (two for the rook, three for the queen), so the rule is on the screen before the first game.
- **Star race.** Before each game, **Me first** or **You first**. On the child's turn every square the token can reach carries a small dot and is a button; a tap anywhere else says the move is not allowed. I reply at once, never missing a winning move (from a losing square I leave the fewest winning replies, then the longest game). A dashed ring marks the square my token left, and one line says what I did ("I moved 2 left. Your turn"). Three pips fill with wins in a row; a loss empties them. After a loss, **Same start again** replays that start as practice that does not count; **New start** draws a new one, half the time from the second-player squares and never the start just played. There is no Undo: the choice of who starts is final, and a wrong choice loses against perfect play.
- **Every start on a board.** Tap a square to mark it (pine) and again to clear it. **That's all** judges every mark at once. If a marked square is one where whoever starts can win, it gets an ochre ring and "Whoever starts from the ringed square can win."; **Play it** then shows me going first from that square and winning (Back to the board returns). If no mark is wrong but one is missing: "There is another." No count is ever shown, and That's all stays off until the marks change.
- **Every start with piles.** Three columns of slots set the three piles (tap the third slot to make a pile of 3). **Keep** puts the start on the shelf as a chip, sorted, since the order of the piles does not matter; keeping it again says "Already on the shelf."; tapping a chip takes it off. **Play** tries the start being built against me, choosing who starts, with the duel's pebbles (tap a pebble to lift it and those above, then Take). That's all judges the shelf as above, with **Play it** for a ringed start.
- **Hints.** In a race, Hint shows the puzzle's three authored nudges, one per press, and never who should start or a move: the first suggests Same start again after a loss, the second rings (in ochre, on the board) the starts the child lost after going first, the third asks where my moves left the token. They show after a loss too, when Same start again is on the screen; only after a win does Hint say "Try a new start." (Duels 1–3 in Proofs now do the same). In Every start, the first hint before any tap is authored. Otherwise a hint names the next step toward the answer: take off a wrong mark first ("One marked square is a square where whoever starts can win.", highlighted on the board from the second press), then add a missing start (on the piles one pile at a time, then Keep), then That's all; Apply hint can play it. So Hint, unlike That's all, does tell a child whether a mark is wrong, as hints do in Fair shares.

## Certificates and claims

- **Star race.** The certificate is three wins in a row against perfect play from new starts. Starts are drawn half from second-player squares, so always choosing Me first passes about 1 time in 8 (the validator measures 12.5–15%). The save keeps each won game of the streak (its start, who went first and every turn), and validation replays each against the perfect opponent, so a full streak cannot be saved without three legal wins.
- **Every start.** A find-every claim judged as a whole, as port-common asks: no per-start check, no slots per answer, no found-count. The card suggests that "the app plays the side a wrong mark gives away, and wins". Reconciled with the shared rules: a wrong mark is refused once with the ring and one line, "Whoever starts from the ringed square can win." (port-common's "This one doesn't …" in this game's words), and the game is offered, not forced, behind **Play it**, where I go first and win against any reply. A missing start gets only "There is another." The refusal is saved and kept until the shelf or marks change; there is no Undo to remove it. That's all with nothing marked does nothing. The certificate of completeness is the whole set, so there is nothing smaller to tap: the child's own marks are the argument (each marked start's moves all reach unmarked starts), and the app judges it. Random shelves almost never pass: keeping each start with chance ½ passes 1 time in 1,000 on piles of 1 to 3 and never in 20,000 tries elsewhere; matching the answer count, 4% on piles of 1 to 3 (one start in ten) and 0 elsewhere.
- **Nothing gives the answer away.** Titles name the board or the piles, How to play states the moves and controls, and first hints point at play. No visible line counts anything except the race's three wins.

## Changes to Pebble Duel

- **The bundle table is earned.** How to play on the 12 Pebble Duel puzzles no longer shows the "Explore … bundles" table until Duel 1 (Proofs) is solved, and the table no longer says "A balanced position has an even count in every column" (`nim.help` in `dist/deduction.js`, which now takes `ctx.completed`; `dist/main.js` passes it).
- **No rule sentence.** The move hint ("Take 2 from pile 3, leaving 1, 4 and 5.") drops "Keep returning the opponent to a balanced position." Duel 2's hints no longer state the bundle rule; they point at the child's lost starts ("Lost a game? Same start again replays those piles…", "Think of the starts you lost after going first…"). Duel 1's first hint ("Are they equal?") named the deciding condition and now points at lost starts too; its second and third hints (copying) are unchanged. After a lost duel, Hint now shows these nudges instead of "Try a new start." (`duelHint` in `dist/proofs.js`), so the first one appears while Same start again is on the screen.
- **Titles by start.** "Leave the pair", "Build a mirror", … "Rebundle across five piles" become "Piles of 1 and 2", "Piles of 2 and 5", … "Piles of 3, 5, 8, 10 and 12". First hints that named the winning move or said that several exist ("Leave the other player two piles of 1.", "Try reducing 8 to 1…", "Several piles can repair the imbalance.") now point at play or at bundles without the move or the rule.
- **The two-pile duel comes early.** Next after puzzle 2 opens Duel 1, and Next after Duel 1 opens puzzle 3 (a `next` field on the two puzzles, honoured by `completionCard` in `dist/ui.js`). Why this way: Duel 1 already sits first in the satchel (Proofs is above the levels), so a child working through Next from puzzle 1 was the one who never met it. Renumbering Pebble Duel would break the Lantern Road and caravan, which pick Pebble Duel puzzles by number (ridge duels use 2, 4 and 5), and old saves; moving Duel 1 out of Proofs would change its numbering, its road copy (the Fair final uses Duels 1–3 as proofs) and the Proofs tests. Proofs keeps working: Duel 1 is still Proofs 01, and the proofs list order is unchanged. One change a Proofs player will see: Next after Duel 1 opens Pebble Duel puzzle 3, not Duel 2, whichever list it was opened from (the completion card does not know). That suits Duel 2, whose prerequisites are Pebble Duel's easy and medium puzzles.
- **How to play** for Pebble Duel opens with the move: "A turn takes one or more pebbles from one pile."

Puzzle ids, numbers and revisions are unchanged, so saves and the road keep working.

## Rules that keep the record honest

- Only moves the rules allow are accepted: a reachable square on the child's turn; a choice of who starts only before a game; Same start again only after a loss; nothing after a solve. On the shelf, pile sizes 1 to the puzzle's largest; That's all only with something kept and no standing refusal; Play it only after a refusal that names a start.
- Saves are replayed from their start: every turn alternates players, every move is legal, and every one of my moves from a winning position wins, so a saved game is one I really played. Saves land before a choice, on the child's turn, or after a game. A race's streak equals its list of won games; a loss empties it; practice games never add to it; a full streak ends on a fresh win. An Every start save keeps the marks or the shelf sorted and distinct; a refusal must be exactly what That's all says about them; done only when they are right.

## Files

| File | Contents |
|---|---|
| `dist/families/rookrace/rookrace.js` | Moves, the outcome table (boards) and search (piles), the perfect opponent, start drawing, the `rookrace` and `everystart` mechanics with saves, hints and rendering, and the module entry |
| `dist/families/rookrace/rookrace.css` | The board, star, token, dots, rings and marks, the move key, pips, the pile builder, shelf chips and pebbles; every rule scoped under its mechanic's root |
| `dist/families/rookrace/rookrace.json` | The pack: 11 puzzles, the groups' mathematics and 5 sources |
| `scripts/build-rookrace.mjs` | Authoring list; computes each puzzle's second-player squares or starts and checks them against hand-worked lists; writes the pack |
| `scripts/validate-rookrace.mjs` | Recomputes every answer by formula (the diagonal, Wythoff's pairs from φ, Bouton's a ⊕ b) and by a separate game-tree search; the opponent from every position; the share of second-player draws; the solver's streaks; always-first's pass rate; hints alone from fresh and after wrong marks, play-outs and practice; That's all's lock; random-shelf pass rates; illegal moves; forged saves; CPU time per tap |
| `tests/rookrace.test.mjs` | Answers, the opponent, races, the final choice, the streak and its record, lost-start rings, marks, shelves, refusals, play-outs, hints, saves, rendering, the satchel groups and Duel 1 in the Next flow |
| `scripts/rookrace-browser-smoke.mjs` | Taps on the boards (legal, illegal, neighbouring squares), focus after moves, That's all, Play it, the pile builder, shelf and practice game, and fit at phone and tablet sizes |

Shared files changed for the Pebble Duel copy: `dist/deduction.js` (help and hint text), `dist/proofs.js` (duel hints after a loss), `dist/expansion.js` (How to play line), `dist/main.js` (help context), `dist/ui.js` (`next`), `docs/puzzle-expansion/deduction.json` and `.md` (titles, first hints, `next`) with `dist/puzzles.json` regenerated by `node scripts/import-expansion.mjs` and the Pebble Duel titles and hints in `docs/PUZZLES.md` taken from `node scripts/generate-review.mjs` (only those lines: a full regeneration also rewrites every source link in the file), `scripts/build-proofs.mjs` (Duel hints, `next`) with `dist/proofs.json` from `node scripts/build-proofs.mjs`, `scripts/extend-catalog.py` (its Pebble Duel strings kept in step; it is not rerun). To change a puzzle here, edit `scripts/build-rookrace.mjs`, then run `node scripts/build-rookrace.mjs`, `node scripts/validate-rookrace.mjs` and `npm test`.

## Sources

Week 8 packets, guide and review card (worksheets repository); Ferguson, *Game Theory*, Part I, §1–2; Bouton (1902); Wythoff (1907). Board sizes, starts and the find-every tasks follow the worksheet's problems; the in-app forms (streaks, That's all, the play-out) are new.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether children choose who starts by looking at the token's square, or fall back on Me first or on who won last time (the card's prediction for kindergartners).
  2. Whether the move key and the dots show the queen's diagonal well enough before the first game, and whether the 11-by-11 board's squares (about 30 px on a phone) are easy to tap.
  3. Whether children decide starts by playing them (Play, Play it, Same start again) or mark a guess and lean on That's all, whose refusals name one wrong start each.
- **The bridge.** The board and the piles are never shown side by side; doing so would give away grades 2–3 Problem 5. A puzzle that asks for the two piles matching a square could come later.
- **Explanations.** "Explain how you can always win" (2–3 P3, 4–5 P7) and "how you know you have found them all" stay with grown-ups.
- **Duel 3** still has a third hint that states the bundle rule; Pebble Duel's own hard puzzles still hint at bundles (without the rule). Pebble Duel's own opponent, when it is losing, still moves at random (the card's note); the new groups' opponent does not.
- **A streak's starts are not proved random.** A hand-made save could hold three real wins from easy starts; only the wins themselves are checked.
- **Story.** The groups are not on the Lantern Road. A Star race could be a ridge stop's side puzzle.
- **The 20-by-20 queen board** (4–5 P9) is not built; it would need a zoomable board.
