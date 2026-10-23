# Drawing machines

October 23, 2026. Twelve puzzles and a playground built from Week 85 of the Bellingham math circle (Drawing machines: pantographs). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 85 packets are unpiloted (no machine has been built or rehearsed). The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-85.md) (revise, October 23, 2026, with a foam-board build, a K–1 route, a new Problem 4 and tracing overlays added the same day) decides what is built. Its App fit reads: on screen the frame is exact and the hardware gate disappears; the child drags T and P draws; steer P through dots or round an outline; mark T's region for a box; drag the anchor so a picture's copy lands on a target (unique O = 2T − P); chain a ×2 and a ×½ machine and place both pins (a translation by half their difference). Its pitfalls: freehand tracing is motor work, so snap T to grid points; no "predict where P lands" quizzes. Each puzzle's `provenance` names its worksheet problem.

## The mathematics

A pantograph is four bars: two long bars pierced at their midpoints and two half-length bars, joined in a rhombus X, Q, Y, T. Pinned at O, every open pose has O, the knob T and the pencil P on one line with **P = O + 2(T − O)**: the machine is the dilation by 2 about O (XT is parallel to QP and half as long). From that one rule:

- **Lengths double; shape, angles and direction stay; areas multiply by 4.** A knob path drawn on lattice dots gives a pencil path twice as large (puzzles 3 and 4).
- **To reach a point, the knob goes halfway there from the pin.** Each pencil dot has exactly one knob dot, the midpoint of the pin and the dot, and a pencil can stop only on dots whose offsets from the pin are even (puzzles 1 and 2).
- **The pencil stays in a box exactly when the knob stays in the half-size box towards the pin** (puzzle 5, worksheet Problem 4).
- **Swapping the tips gives the inverse, the dilation by ½:** the knob must go twice as far, and a copy the right size in the wrong place comes from a path the right size in the wrong place (puzzles 6 and 7).
- **The pin is unique:** O = 2T − P for any corner T and its partner P, or O = 2P − T with the tips swapped (puzzles 8 and 9).
- **Moving the pin by d moves the copy by −d**, so the picture must move by d/2 to put the copy back (puzzle 10, upper Problem 4).
- **A ×2 machine driving a ×½ machine slides the picture by half the gap between the pins**: (2T − O₁ + O₂)/2 = T + (O₂ − O₁)/2. Only the gap matters (puzzles 11 and 12).

What a child is meant to discover by doing: the pencil goes the same way as the knob, farther; halfway; the half-size region; that position matters as well as size; which way and how far a copy moves when the pin does. The experiments are the drags; the conjectures ("halfway", "the opposite way", "half the gap") are for talk; the explanations (the bars, the formula) are in the grown-ups' notes.

On screen the machine is exact. The knob, the pins and the green shape stay on lattice dots, so every pencil position is exact (in quarter units: a ×½ machine can stop on halfway points, two machines on quarter points) and every check is equality, not a tolerance.

## Where the puzzles appear

**Puzzles → Drawing machines** (symbol ⟋) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`); rough entry points: 1–4 for K–1 with a grown-up nearby, 5–8 for grades 2–3, 9–12 for grades 4–5. Every sheet is 10 by 8; points are written (across, up) from the bottom left.

| # | Level | Kind | Machine | Pin | Task | Answer | Week 85 source |
|---|---|---|---|---|---|---|---|
| 1 | Easy | Dots | ×2 | (0, 0) | Reach 5 ringed dots | each dot's midpoint with the pin | shared P2, target D |
| 2 | Easy | Dots | ×2 | (5, 4) | Reach 6 dots all round the pin | the same, every direction | shared P2, target D |
| 3 | Easy | Outline | ×2 | (0, 0) | A 6 by 6 square | the knob goes round a 3 by 3 square | shared P1 |
| 4 | Easy | Outline | ×2 | (0, 0) | A house with a slanting roof | a half-size house | shared P2, target E |
| 5 | Medium | Box | ×2 | (1, 0) | Every knob dot keeping the pencil in a 6 by 4 box, then That's all | the 4 × 3 = 12 dots from (2, 1) to (5, 3) | shared P4 (insert F) |
| 6 | Medium | Dots | ×½ | (5, 4) | Reach 5 dots | the knob twice as far | upper P3 |
| 7 | Medium | Outline | ×½ | (1, 1) | A 3 by 2 box | the knob's 6 by 4 box from (3, 3) | upper P3 (insert L) |
| 8 | Medium | Place the pin | ×2 | moves | Copy of a green quadrilateral onto the outline | pin (0, 1), the only one | upper P4, turned round |
| 9 | Hard | Place the pin | ×½ | moves | Half copy of a green triangle | pin (10, 7), the only one | upper P3 and P4 |
| 10 | Hard | Move the picture | ×2 | fixed at (2, 2); old pin (0, 0) dashed | Move triangle M so the copy lands where the old pin's did | 1 right, 1 up, the only place | upper P4 |
| 11 | Hard | Two machines | ×2 then ×½ | first fixed at (6, 2), second moves | Copy of a small triangle slid 2 left, 2 up | second pin (2, 6), the only one | card App fit |
| 12 | Hard | Both pins | ×2 then ×½ | both move | Slide 3 right, 1 up | any of 30 pairs, all with the gap (6, 2) | card App fit |

The **playground** has one ×2 machine with a pin to drag, a ×2/×½ switch and Clear; nothing is judged. It holds shared Problems 1 and 3 (trace paths, compare copies, try to put O, T and P off one line) and the area comparison of upper Problem 2.

Not built: upper Problem 1's proof with the bars (it is in the grown-ups' notes and the README, and the frame is drawn so it can be looked at); upper Problem 2's area counting with square and triangle pieces (puzzle 3's notes and the playground's extension carry the factor 4); shared Problem 3's prediction question as a screen (the pitfall rules it out; the frame keeps O, T, P in line wherever the child drags).

## How a puzzle plays

- **The board** is a cream sheet of dot paper on the board mat. The machine is drawn as its four bars (wood; a second machine blue-grey), with pivots at X, Q and Y; the pin is a pine disc (numbered 1 and 2 when there are two); the knob is the large yellow disc; the pencil is a ringed ink dot; a chain's middle tip is a small grey dot. The elbow is drawn on the side that keeps the bars nearer the sheet; bars may run off the edge of the mat.
- **Drag the knob** from its dot to another and let go: the knob slides in a straight line and the pencil draws (every pencil, in a chain). While dragging, the frame follows the nearest dot and the lines to be drawn show faintly; a dot that would put a tip off the sheet or a knob on its pin shows a dashed red ring and nothing happens on release (no message). **Tap a dot** to lift the knob and put it down there without drawing. On a touch screen a dragged knob, pin or shape rides 34 px above the finger. A press takes hold of the knob or a movable pin when its dot is the nearest one, of the green shape when inside it, and is otherwise a tap on the nearest dot.
- **Keyboard.** The knob, movable pins and a movable shape are buttons in the tab order. Arrow keys on the knob draw one step; Shift and an arrow lifts it one step; arrow keys on a pin or the shape move it one step. Focus stays on what was moved.
- **Dots.** Sun rings; a ring fills leaf when the pencil stops on it or draws through it. Solved when every ring is filled.
- **Outlines.** A wide pale band. Pencil lines on it are green, lines off it red; the knob's own path is a dashed grey line (shared P2's "leave T's paths on your overlays"). Solved when the pencil's lines on the current sheet are exactly the outline: any order, any direction, sides in pieces or drawn twice, but no line off it. A red line stays until Undo.
- **The box.** A dashed rectangle. Every dot the knob stops on or slides over gets a leaf dot if the pencil was in the box (edges count) and a red cross if not. **That's all** claims every leaf dot is found. If one is missing: "There are more.", and That's all stays off until a new dot is found; the refusal is kept through Undo while the dots found are among those it judged, so one Undo right after it also takes back the move before it (the app's Undo convention in [docs/shares/README.md](../shares/README.md)). There is no count and no slot per answer.
- **Pins and the green shape.** A movable pin or shape is dragged to a new dot (or moved with arrow keys). Each new place starts a fresh sheet, and the last sheet with lines on it stays faded beneath, so a child can compare two tries. In copy puzzles the knob must trace the green shape where it is (knob lines off it are red) and the pencil must draw the outline exactly. The one-sentence objective ("Move the pin, then trace the green shape.") is the only copy on the board, because a movable pin looks like the fixed ones.
- **Hints.** The first press before any move shows the puzzle's first authored hint. After that, and from the second press, the next step in words with its dot ringed (or, for the shape, its place drawn dashed): "Put the knob halfway between the pin and a dot.", "Drag the knob to the next corner's halfway dot.", "Each green corner must be halfway between the pin and its outline corner.", "Move the green shape half as far as the pin moved, the same way.", "The copy slides half as far as the second pin is from the first.", "Every dot is found. Press That's all." A red line is a quiet dead end behind Hint ("The pencil drew off the outline. Undo.") with Undo offered. Apply hint on the third press. A copy-puzzle hint keeps the child's pins where they already fit a solution and lifts the knob out of the way when a pin cannot move under it. The playground has no Hint.

## Claims and how they are checked

- **The machine.** For every pin and knob dot on the 10 by 8 sheet with the pencil on the sheet, the validator solves the four bars by circle intersections in floating point (both elbows), checks every bar length and that the far tip is at 2T − O, that the drawn frame is one of those poses, that every such pose is open (the bars reach), and that with the tips swapped the pencil is halfway. For every pair of pins and four knob dots, two machines slide by (O₂ − O₁)/2.
- **Each puzzle, by exhaustive search over the lattice.** The build (with the mechanic's own methods) and the validator (with a model written separately, in exact fractions, comparing drawings as merged intervals on each line rather than as unit steps) check: each ringed dot has exactly one knob dot; the knob dots that put the pencil on an outline are exactly the dots of the knob outline, which is the half-size (or double-size) copy towards the pin; the box's knob dots are exactly the half-size box towards the pin and every other dot puts the pencil outside; exactly one pin over all 99 dots for puzzles 8 and 9, equal to 2T − P (or 2P − T) from every corner; exactly one place for the green shape in puzzle 10, half the pin's move, with the in-place copy moved by −d; exactly one second pin in puzzle 11; and in puzzle 12, 30 working pairs over all 99 × 99, every one with the gap (6, 2), the 5 other pairs with that gap folding a machine shut at a corner. No start is already an answer.
- **The numbers in the grown-ups' notes** (the unreachable dot (5, 5), the areas 36 and 9, the moved box, pin and picture answers, equal pins giving the shape itself) are checked by the validator.
- **Play.** Every witness solves its puzzle through the move rules and in the model; the hints solve every puzzle from fresh and after 25 random games each, with the model agreeing on every random move's legality and on solved; every Undo press changes the board.

## Rules that keep the record honest

- Saves hold only the child's moves: draws and lifts of the knob (to a dot), pin moves, shape moves, the playground's swaps, and in the box puzzle the refusal record and the claim. Everything drawn is recomputed by replaying them, so a save is valid only if every move was legal when made: the knob on a dot, every tip on the sheet, no knob on its pin (no machine folded shut at rest; a slide may pass over a pin), a pin or shape only where the puzzle lets it move. A refusal record must be a real refusal (a box dot missing), and a claim needs every box dot found. A puzzle record stops at 160 moves; the playground starts a new drawing from where the machine is. Forged and illegal saves are rejected in tests and the validator.

## Files

| File | Contents |
|---|---|
| `dist/families/pantograph/machine.js` | The machine with no drawing: tips of one or two machines in quarter units, the inverse, poses, steps, the replay of a record into sheets, touched dots and knob visits |
| `dist/families/pantograph/pantograph.js` | The `pantograph` mechanic: saves, moves, That's all, hints, the frame drawing, drags, taps and keys, and the module entry |
| `dist/families/pantograph/pantograph.css` | Paper, target, lines, frame and handles, scoped under `.pg-` classes |
| `dist/families/pantograph/pantograph.json` | The pack: 13 puzzles, the family's mathematics and 3 sources |
| `scripts/build-pantograph.mjs` | Authoring list; asserts every claim above by search with the mechanic's methods, plays the witnesses; writes the pack |
| `scripts/validate-pantograph.mjs` | The frame from its bars, an independent exact model, every claim by search, the notes' numbers, witnesses, hints from fresh and random play, That's all through Undo, illegal moves and forged saves; run by `npm run build` |
| `tests/pantograph.test.mjs` | Geometry, the frame, steps, dots, outlines, swapped tips, the box, pins and the shape, two machines, the playground, saves, rendering and hint speed |
| `scripts/pantograph-browser-smoke.mjs` | Every gesture through the real interface (drags by mouse and by touch with the lift, taps, keys), Undo, That's all, the playground, fit and screenshots at desktop, tablet (`TEST_TABLET=1`) and phone (`TEST_PHONE=1`) sizes |

## Sources

Week 85 shared and upper packets, materials and adult guide, the review card and its math check (worksheets repository). The instances borrow the worksheet's ideas (dots D, house E, box F, J/K/L for the swapped tips, triangle M and the moved anchor); every coordinate is new for a 10 by 8 sheet. Puzzles 5, 8, 9, 11 and 12 turn worksheet questions round (find the region, the pin, both pins) as the card's App fit proposes.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether children drag the knob in straight runs corner to corner, or expect it to follow the finger round a corner; a drag is one straight line, and a curve is drawn as the line to where it is let go.
  2. Whether the tangle of bars helps or distracts, especially with two machines (puzzles 11 and 12), and whether children read the knob, pin and pencil apart (yellow, pine, ringed ink).
  3. Whether puzzle 5's marks make "That's all" a sweep of every dot rather than a conclusion about the half-size box, and whether children in copy puzzles move the pin by reasoning or by trial (each try fades, which invites trial).
- **K–1.** Puzzles 1–4 need no reading; a grown-up reads How to play once. Whether K–1 children can drag the knob precisely on a phone is a prediction.
- **Not built:** upper Problem 1's proof and Problem 2's area pieces as solves; a Can't instance (the card's certificate, "with M fixed, the copy always moves by −d", is shown instead by puzzle 10's in-place trace and the faded sheet).
- **Story.** The family is not on the Lantern Road.
