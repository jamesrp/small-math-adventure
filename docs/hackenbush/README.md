# Pebble Duel: Stalks

October 23, 2026. Nine puzzles built from Week 83 of the Bellingham math circle (Hackenbush balances), added to Pebble Duel as one group, **Stalks**, as the Week 83 review card's App fit proposes (fit A; `plans/review/week-83.md` in the worksheets repository, October 23, 2026): duels against perfect play, every reply, rounds choosing a colour or who starts, and building a balance. The number nursery (Problems 5–6) stays on paper, as the card says. None of this has been played by children in the app; the Week 83 packet is unpiloted too.

## The mathematics

Stalks of blue and red segments stand on the ground. Blue cuts one blue segment, Red one red segment, and everything above a cut falls off. Players take turns, and whoever has nothing to cut loses.

- **Every board is a number, and boards side by side add** (Conway; *Winning Ways*, Chapters 1–2). B is 1 and R is −1. In a stalk, read from the ground up, the first run of one colour counts 1 each (+ for blue, − for red); after the colour first changes, each segment counts half the one below it. So BR = 1/2, BRR = 1/4, BRB = 3/4, RB = −1/2, RBB = −1/4, RRB = −3/2.
- **The number decides who wins.** Blue wins whoever starts when it is positive, Red when it is negative, and whoever moves second when it is zero. No board is won by whoever moves first. The worksheet calls a second-player board one that **balances**.
- **So:** two BR balance R (1/2 + 1/2 − 1), two BRR balance RB, and any stalk balances its colour swap, since the second player can copy every cut on the other stalk with colours swapped. A stalk's worth is not its segment count: BR, BR and BR against R is Blue's, and BR, BR and RB is Blue's too (RB is not R).
- **Limits.** The numbers are for grown-ups. The app decides every win and every balance by searching the game itself, and the validator checks the two agree on every board of up to three stalks of up to four segments (5,980 boards). Why the numbers add, and why a stalk has that number (the nursery's "earliest card between the bounds"), is not shown on screen.

What the app checks: in a duel, that the child wins against a perfect opponent from a board where only some cuts win; in every reply, that the child, going second from a balanced board, wins against each of my first cuts; on boards and in rounds, that the child makes the one choice that wins whatever start I give, and then wins; in a build, that the board balances, by search.

What a child is meant to discover: that a low cut costs everything above it, your own segments included; that some boards are won by one colour whoever starts and some by whoever moves second, and none by whoever moves first; that two BR balance one R and two BRR balance one RB; that a stalk with its colours swapped balances it; and how to use known balances to build new ones.

## Where they appear

**Puzzles → Pebble Duel**: Proofs above the levels, then Easy, Medium and Hard, then its groups, with **Stalks** last, after Buckets. The group is grade-free (`band: "all"`), numbered from 1, and Next puzzle walks through it alone. It is not on the Lantern Road.

| # | Level | Puzzle | Solve | Answer | Week 83 source |
|---|---|---|---|---|---|
| 1 | Easy | BB and R | Win as Blue, going first | cut the top B (the bottom one drops both) | P1, board D |
| 2 | Easy | Four boards | Choose Blue, Red or Me second, then win, on B; R; B and R; BB and R | Blue; Red; Me second; Blue | P1, boards A–D |
| 3 | Easy | BR and R | Win as Red, going first | cut the R on top of BR, leaving B and R | P2, board A |
| 4 | Medium | Two BR and R | Go second and win against each of my 3 first cuts | leave B and R, or one BR when you are Blue | P2, board B |
| 5 | Medium | BRR and RB | Win as Red, going first | cut the top R of BRR, leaving BR and RB | P3, board A |
| 6 | Medium | Balance BRB | Fill two spots (up to 4 segments each) so the board balances, Check | RBR; R and BRR; RB and RBB; 11 fills in all | P4 |
| 7 | Hard | Two BRR and RB | Go second and win against each of my 5 first cuts | e.g. leave BR and RB after a BRR cut | P3, board C |
| 8 | Hard | Drawn boards | Choose, then win, 3 in a row from new boards | the colour that is ahead, or Me second when even | P2–P3 |
| 9 | Hard | Two spots for four stalks | Balance BR, BR, BRR, BRR with two spots, Check | R and RB; RRB alone; 10 fills in all | P4 (new board) |

Each puzzle's `provenance` names its problems. The boards of puzzles 1–5 and 7 are the worksheet's (packet W83-S-v2, after the card's fixes). The choices, every reply, the rounds and building with Check are new forms the card's App fit asks for; puzzle 9's board is new.

## How a puzzle plays

- **The board.** Stalks stand on an ink ground line, each segment a rounded bar with a joint at its top, blue or red; red bars carry a light centre stripe so the colours differ by more than hue. The board keeps the height of the puzzle's tallest stalk, so it does not jump as stalks shrink.
- **A cut** is one tap. On the child's turn the child's segments are buttons; a tap on a segment of my colour (or, in a build, on the given stalks) is refused with "That move is not allowed". My reply comes at once; the pieces my cut sent down are drawn dashed above their stalk, the cut segment lowest. The line above the board says "Your turn", or who has nothing to cut ("You have nothing to cut. I win."). A key under it shows You and Me in our colours.
- **Duels** (1, 3, 5). You go first in a given colour. **Undo** takes back your cut and my reply together. After a losing cut Hint says, only when pressed, that I can now always win, and offers the rescue Undo.
- **Every reply** (4, 7). You go second; I make each first cut in turn, in either colour (cuts on two equal stalks count once), and you play the other colour, so the key changes between games. Pips show the first cuts answered. After a win, **Next first cut**; after a loss, **Try again** replays it. No Undo.
- **Choices** (2, 8). Before a game: **Blue** or **Red**, and I choose who starts, making you lose if I can; or **Me second**, and I choose my colour and go first, in a colour that wins going first if there is one. So Blue wins exactly when Blue wins whoever starts, Red likewise, and Me second exactly on a balanced board. The choice is final. In Four boards, a win gives **Next board** and a loss **Try again**, with pips for boards won. In Drawn boards three pips fill with wins in a row from new boards; a loss empties them; **Same board again** is practice that does not count ("Wins count from a new board."); **New board** draws another. No Undo.
- **Building** (6, 9). The given stalks stand on the left and two empty spots, dashed, on the right. **+** in blue or red adds a segment to a spot, up to four; a tap on a built segment takes it off with everything above it, as a cut would. **Check** tests the whole board. If it balances, the puzzle is solved. If not, I take the colour that can win going first and go first ("I can win going first."), and we play it out; it may end at once. Then **Back** returns to the board as built, and Check stays off until something changes. No Undo.
- **Hints.** In duels, every reply and Four boards, Hint before any cut shows the puzzle's first authored hint, then "Some cut wins from here. What would you like to leave me?"; from the second press the stalk of a winning cut is ringed in ochre, and Apply hint makes the cut on the third. In Four boards, before a choice, the hint asks "Which choice wins here, whatever I do?" and from the second press rings the right button. In Drawn boards Hint shows the three authored nudges by level and never says what to choose. In a build Hint steers toward the balance fewest taps away, keeping what the child built when it can ("Add a red segment to the ringed spot.", "Take off the ringed segment and everything above it.", then "Press Check."). The second and third authored hints are for grown-ups; the notes list them.

## Certificates and claims

- **Duels and every reply.** A win against a perfect opponent. I never miss a winning cut, so the child must find a winning cut every turn from a board where some cuts lose (each duel has exactly one winning first cut, of two or three).
- **The opponent when it is losing** leaves the fewest winning replies, then the most segments, so the game lasts and the child keeps choosing.
- **Choices.** I answer each choice adversarially, so a choice that is not right always loses against a child who plays perfectly (the validator plays every choice on every Four boards board over 12 seeds). In Drawn boards each board is Blue's, Red's or balanced with equal chance (the validator's 3,000 draws: 33%, 33%, 33%), from all 490 sets of 2 to 4 stalks from B, R, BB, RR, BR, RB, BRR, RBB, BRB and RBR with 3 to 8 segments, both colours and a stalk of both colours (236 Blue's, 236 Red's, 18 balanced). Always making the same choice wins three in a row about 1 time in 25 (the validator measures 4–5%). The save keeps each won game of the streak with its choice and the start I gave, and replays them, so a streak cannot be saved without three real wins.
- **Building.** Check is a whole-board claim, certified by search; a wrong Check is certified by a game I win from the wrong board, going first, against any cuts (30 seeds in the validator). A random fill of the spots balances about 1 time in 45 or 50 (2.2% and 2.0%), each failure costs a played-out game, and Check waits for a change, so guessing is slow.
- **Nothing gives the numbers away.** Titles name the stalks, How to play states the cut and the taps, and first hints point at play. No title, How to play line, rule, objective or first hint names a fraction, half, quarter, worth, number, value, zero, positive, negative, sum or "add up" (the validator checks each). The grown-ups' notes, which hold the answers, are left out of How to play (`"proof": true`); the Grown-ups catalog still lists them.

## Rules that keep the record honest

- Only moves the rules allow are accepted: a cut of a segment of your colour, on your turn; a choice only before a game, once; Next only after a win and Try again only after a loss; Same board again only after a loss; in a build, + only while the spot has room, taking off only built segments, Check only when it is not waiting, Back only after the play-out ends; nothing after a solve.
- Saves are replayed from their start: turns alternate, every cut is legal, every one of my cuts from a winning board wins, and a game ends when the player to move has nothing to cut. Saves land before a choice, on the child's turn, or after a game. A choice must come with a start and colour I may give for it. Every reply's game begins with its round's first cut, with you in the other colour, and holds a real win against each earlier first cut; Four boards holds a real win on each earlier board. A round's streak equals its list of won games, each a real win from a board in the pool, new after the one before. A build is done only if its board balances; it can wait on Check only if its board does not; a play-out must give me the colour that wins going first, with me first.

## Files

| File | Contents |
|---|---|
| `dist/families/hackenbush/hackenbush.js` | Cuts, the search with its memo, stalk numbers (for notes and build hints), the perfect opponent, the choices and what I may give for each, the board pool and drawing, first cuts, the `stalks` and `stalkbuild` mechanics with saves, hints and rendering, and the module entry |
| `dist/families/hackenbush/hackenbush.css` | The ground, segments, what fell, the key, pips, choices, spots and + buttons; every rule scoped under its mechanic's root |
| `dist/families/hackenbush/hackenbush.json` | The pack: 9 puzzles, the group's mathematics and 4 sources |
| `scripts/build-hackenbush.mjs` | Authoring list; computes each answer and checks it against hand-worked answers; writes the pack |
| `scripts/validate-hackenbush.mjs` | A separate game-tree search with its own board representation and move generator; the sign-expansion theorem on 5,980 boards and every colour swap; every duel's winning cuts, every reply's first cuts and replies, every board's winner, the pool and its kinds, and every balancing fill; each choice against every start I may give; draw shares; the solver's streaks and the same-choice pass rate; hints alone from fresh, after each losing cut, after a wrong reply or choice, from a wrong build and during a play-out; play-outs over 30 seeds, Back and Check's wait; random-fill share; the opponent on every reachable board; illegal moves; forged saves; CPU time per tap |
| `tests/hackenbush.test.mjs` | The search against the numbers, the opponent, a duel with Undo, the two Red duels, Four boards and the start I give, every reply, rounds and the streak, building with +, taking off, Check, its play-out and wait, hints (including where build hints steer), saves, rendering, the satchel group, CPU time |
| `scripts/hackenbush-browser-smoke.mjs` | Taps on segments at varied points, a refused tap, the low cut and Undo, Four boards with a wrong choice, every reply with a lost game, a duel, rounds, both builds with +, taking off, a Check played out, Back and the wait; focus after each kind of tap; controls in view; fit at phone and tablet sizes |

To change a puzzle, edit `scripts/build-hackenbush.mjs`, then run `node scripts/build-hackenbush.mjs`, `node scripts/validate-hackenbush.mjs` and `npm test`.

## Sources

Week 83 packet and guide (W83-S-v2, problem files) and review card with its math check (worksheets repository); Berlekamp, Conway and Guy, *Winning Ways for Your Mathematical Plays*, Volume 1, Chapters 1–2; Wikipedia, "Hackenbush". The boards of the duels, every reply and Four boards follow the worksheet; the choices, rounds, building with Check and puzzle 9's board are new.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether children understand that choosing Blue or Red lets me choose who starts, and work out why Blue loses on B and R (I make Blue start), or feel cheated. How to play says it; the screen does not.
  2. Whether the dashed pieces make my cut readable, and whether children see in BB and R that a low cut drops their own segment, or tap the lowest or loneliest segment by habit.
  3. Whether children find + and take-off in a build, and whether a failed Check's play-out (sometimes over in one cut) shows them why the board does not balance or only discourages. Puzzle 9 is meant to be reached from Puzzles 4 and 7's balances; watch whether it is reached by trial instead.
- **The nursery** (Problems 5–6: the earliest card between bounds, and which card each stalk is) stays on paper, as the card says. Nothing on screen shows the numbers.
- **K–1.** The worksheet has no K–1 route by design; the group is grade-free, and puzzle 1's prerequisites say a grown-up can read how a cut works. The card's suggested K–1 task (make a board where whoever goes second wins, from one-colour towers) is not built.
- **Trees and other shapes.** Only stalks (paths from the ground) are built; branching Hackenbush pictures are not.
- **A streak's boards are not proved random.** A hand-made save could hold three real wins from easy boards; only the wins themselves are checked.
- **Colours.** The red stripe is meant to help children who confuse red and blue; it has not been checked with them.
- **Story.** The group is not on the Lantern Road.
