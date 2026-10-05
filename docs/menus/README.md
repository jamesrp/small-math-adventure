# Pebble Duel menus

October 5, 2026. Eighteen puzzles built from Week 7 of the Bellingham math circle (take-away games), added to Pebble Duel as its **Menus** group. They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet; the Week 7 worksheets have not been piloted either. The theme's review card is `plans/review/week-07.md` in the worksheets repository. Its App fit section shaped the group: games against a perfect opponent, every reply as the certificate for going second, the track and the two-pile chart as solves (a wrong square is explained and can be played out against the child), the design goal, the menu 2, 5 or 6, and hints that never name the winning take.

## The mathematics

A **menu** says how many pebbles a turn may take from one pile: 1 or 2; 1, 2 or 3; 1, 3 or 4; 2 or 3. A player with no legal take loses (normal play), so with 1 on the menu whoever takes the last pebble wins. Misère puzzles reverse that: taking the last pebble loses.

- **Every pile is a win or a loss for the player to move,** and working up from the end sorts them: a pile loses exactly when every take leaves a winning pile. With 1 or 2 the losing piles are 0, 3, 6, 9, …; with 1, 2 or 3 the multiples of 4 (Bachet's game); with 1, 3 or 4 they are 0, 2, 7, 9, 14, 16, …; with 2 or 3, 0, 1, 5, 6, 10, 11, …. Misère with 1 or 2 shifts them to 1, 4, 7, ….
- **The pattern always repeats.** Whether a pile wins depends only on the piles just below it (as far down as the largest take), so once a window of that length repeats, everything after it does. For 1, 3 or 4, piles 7 to 10 behave like 0 to 3, so the period is 7. This pigeonhole argument proves that every subtraction game with a finite menu is eventually periodic.
- **A stuck player loses.** With 2, 5 or 6 nobody can take from a pile of 1, so 0 and 1 are both piles to leave; the piles to leave are 0, 1, 4, 8, 11, 12, 15, 19, … and repeat every 11.
- **Designing a menu.** The piles to leave are exactly the multiples of k when the menu contains 1 to k − 1 and no multiple of k: piles 1 to k − 1 must each reach 0, and a take that is a multiple of k would let a multiple of k reach another.
- **Taking the most is often wrong.** From 12 with 1, 3 or 4, the only winning take is 3.
- **Two piles add as games.** Each pile acts like a Nim pile of its Grundy value (its remainder after taking away 3s for the menu 1 or 2; the repeating values 0, 1, 0, 1, 2, 3, 2 for 1, 3 or 4), and two piles lose for the player to move exactly when those values match. This is the Sprague–Grundy theorem in its smallest form, and it is why unequal piles such as 4 and 6 can balance.

What is checked in the app: in a game, that the child wins against a perfect opponent; in a round, that the child chooses who starts correctly and then wins, three times in a row from new starts; in every-reply, that the child wins against each first take; on a track or chart, that the coloured squares are exactly the piles to leave; in the design puzzle, that the chosen menu's piles to leave are exactly the multiples of 5. What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Pebble Duel → Menus**, below Easy, Medium, Hard and Proofs. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone.

| # | Level | Puzzle | Menu | Start | What counts as a solve | Week 7 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Take 1 or 2 | 1, 2 | 7, you first | Win (take 1) | Launch; K–1 Problems 1–3 |
| 2 | Easy | Eleven pebbles | 1, 2 | 11, you first | Win (take 2) | K–1 Problem 2; 4–5 Problem 1 |
| 3 | Easy | Who starts? | 1, 2 | 4–15 drawn | Choose who starts and win, 3 in a row | 4–5 Problem 1 |
| 4 | Easy | The track for 1 or 2 | 1, 2 | Squares 0–20 | Colour exactly 0, 3, …, 18 | 4–5 Problem 2 |
| 5 | Medium | Take 1, 2 or 3 | 1, 2, 3 | 10, you first | Win (take 2) | 4–5 Problem 2; K–1 Problem 6 |
| 6 | Medium | Not the most | 1, 3, 4 | 12, you first | Win (take 3 only) | 2–3 Problems 1–5; 4–5 Problems 3–5 |
| 7 | Medium | Take 2 or 3 | 2, 3 | 9, you first | Make the last move (take 3) | 4–5 Problem 7 |
| 8 | Medium | The track for 1, 3 or 4 | 1, 3, 4 | Squares 0–24 | Colour exactly 0, 2, 7, 9, 14, 16, 21, 23 | 2–3 Problem 2; 4–5 Problem 4 |
| 9 | Medium | Every reply | 1, 3, 4 | 14, opponent first | Win after each first take (1, 3, 4) | 2–3 Problem 4 (Lena) |
| 10 | Medium | Who starts with 1, 3 or 4? | 1, 3, 4 | 5–20 drawn | 3 in a row | 2–3 Problems 2–3; 4–5 Problems 3–4 |
| 11 | Hard | The last pebble loses | 1, 2, misère | 8, you first | Make the opponent take the last pebble (take 1) | K–1 Problem 9 |
| 12 | Hard | Big piles | 1, 3, 4 | 21–45 drawn | 3 in a row | 2–3 Problem 6; 4–5 Problem 6 |
| 13 | Hard | The track for 2, 5 or 6 | 2, 5, 6 | Squares 0–30 | Colour exactly the 12 piles to leave (period 11) | 4–5 Problem 14 |
| 14 | Hard | Design the takes | Chosen from 1–9 | | Piles to leave exactly 0, 5, 10, … (16 menus work) | 4–5 Problem 9 |
| 15 | Hard | Two piles | 1, 2 | 2 and 7, you first | Win (2 winning takes) | K–1 Problem 8; 2–3 Problem 7 |
| 16 | Hard | Who starts with two piles? | 1, 2 | each 1–9 drawn | 3 in a row | 2–3 Problem 7 |
| 17 | Hard | The chart for two piles | 1, 2 | Piles 0–9 each | Colour exactly the 34 pairs to leave | 4–5 Problem 13 |
| 18 | Hard | Two piles with 1, 3 or 4 | 1, 3, 4 | 4 and 10, you first | Win (3 winning takes) | 2–3 Problem 7 |

The worksheets are in [math-circle-worksheets, week 7](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-07). Game starts are new; the tracks, the chart and the design goal follow the worksheet's problems. Each puzzle's `provenance` names the problems it draws on.

## How a puzzle plays

- **The menu is the controls.** Under each pile sits one round button per allowed take. A button is disabled when its pile is too small. Hovering or focusing a button lifts the pebbles it would take. Piles fill in rows of five from the bottom, so counts up to 45 stay readable.
- **The opponent replies at once** and never misses a winning move. From a losing position it leaves the fewest winning replies, then the most pebbles. The pebbles it took stay as dashed outlines until the next turn, with one line saying what it took.
- **Games** (puzzles 1, 2, 5–7, 11, 15, 18): the child moves first from a winning start. Undo takes back the child's take and the reply. Hint text nudges toward working up from 0 without naming the take; the third hint level can apply a winning take. After a losing take, the hint says a careful opponent can now win and suggests Undo.
- **Every reply** (puzzle 9): the child goes second from a losing start, and the opponent opens with each take on the menu in turn. Three dots fill as the games are won. After a loss, **Try again** replays the same first take; after a win, **Next first take**. There is no Undo, so the three wins are a check of every case.
- **Rounds** (puzzles 3, 10, 12, 16): before each game, **Me first** or **You first**. Starts are drawn half from losing positions, so always choosing Me first fails. Three dots fill with wins in a row; a loss empties them. After a loss, **Same start again** is practice and does not count; **New start** draws a new one. Rounds have no Undo, and Hint shows the authored hints by level without naming who should start, as in the Proofs duels.
- **Misère** (puzzle 11): the bottom-left pebble, the last one left in any game, is rose.
- **Tracks and the chart** (puzzles 4, 8, 13, 17): numbered squares 0 to N (rows of ten), or a 10 × 10 chart with the first pile down and the second across. Tap to colour the squares to leave for the opponent, then Check. A wrong check names no count; it outlines the lowest wrong square (on the chart, the one with the fewest pebbles in all) and says why, in terms of the child's own colouring: "Leave 4, and your opponent can take 4 and leave you 0, a square you coloured", or "Leave 7, and your opponent can only leave 6, 4 or 3. None of those is coloured, so whatever they leave, you can answer." Below it, every square is right, so the reason is sound. A button then plays that square out: the child leaves it (the opponent moves first) or starts from it, and the perfect opponent wins. Hints point at the lowest wrong square without saying which way it is wrong.
- **Design the takes** (puzzle 14): toggle takes 1 to 9 and Check against the goal track. A miss explains the lowest square where the chosen menu's piles to leave differ from the multiples of 5. Hints are the authored ones only.

## Rules that keep the record honest

- Only menu takes from a pile that holds enough pebbles are accepted; nothing is accepted before choosing who starts, after a game ends, or after a solve.
- Saves are replayed from the start and the turn list: the piles, the turn order, the start's range and the streak must all agree, and a save must land on the child's turn. An every-reply save must open with that round's first take.
- Track saves keep the coloured squares in order; a play-out is saved only after a check, from the lowest wrong square, with the right player first. The design save keeps only the chosen takes.
- Wins count toward a streak only from a new start.

## Files

| File | Contents |
|---|---|
| `dist/families/menus/menus.js` | Positions, the win/loss search, the perfect opponent, start drawing, the `menu` mechanic (games, rounds, every reply) and the `menutrack` mechanic (tracks, the chart, play-outs, design), with their rendering |
| `dist/families/menus/menus.css` | Piles in rows of five, the take buttons and their hover lift, the misère pebble, the track, the chart and the play-out panel |
| `dist/families/menus/menus.json` | The pack: 18 puzzles, the group's mathematics and 3 sources |
| `scripts/build-menus.mjs` | Authoring list; computes each game's winning first takes, each round's losing starts, each reply, each track's squares to leave and the menus that meet the design goal, and writes the pack |
| `scripts/validate-menus.mjs` | Recomputes every answer from Grundy values (the module searches whole positions instead); checks that the opponent never misses a win, that a non-winning first take never wins against it, that hints alone win every game and the solver wins every round, that about half the drawn starts lose; every-reply rounds; that each track check explains the lowest wrong square truthfully and that the opponent wins every play-out, over 60 random colourings per track; the design goal against all 511 menus (and that checking to 60 settles it); illegal moves and forged saves; run by `npm run build` |
| `tests/menus.test.mjs` | Losing piles per menu, the opponent, games and Undo, hints that name no take, misère, stuck pebbles, rounds and their streak, every reply, tracks, play-outs, the chart, design, saves, rendering and the satchel group |

The module adds no satchel family; its puzzles set `libraryFamily: "nim"` and `group: "Menus"`. To change a puzzle, edit `scripts/build-menus.mjs`, then run `node scripts/build-menus.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read the take buttons as the rule without being told; whether they choose who starts by looking at the pile, or fall back on Me first; whether the 45-pebble piles in puzzle 12 push them to the repeat or just to counting; and whether children fill a track upward from 0 or guess a pattern and lean on Check.
- **Tracks in games.** A track could sit beside a game as a record the child keeps while playing. Here tracks are separate puzzles.
- **Story.** Menus are not on the Lantern Road. A road version could give Plume the opponent's moves.
