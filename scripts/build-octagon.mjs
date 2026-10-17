// Authoring list for Octagon streets (worksheet Week 65, hyperbolic octagon
// streets). Finds every walk that reaches each floor's goal with the
// mechanic's own rewriting system (dist/families/octagon/octagon.js): every
// walk of the stated length for a home goal, and every fence within FENCE_CAP
// moves for a fence goal, by a search that prunes walks too far from home to
// get back. Checks the counts against the table in docs/octagon/README.md and
// writes dist/families/octagon/octagon.json. scripts/validate-octagon.mjs
// checks every answer again with exact matrices and integer coordinates.
// Run: node scripts/build-octagon.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {reduce, dotKey, TURN, TURNS, FENCE_CAP, fenceOk, goalMet, inside, lefts, rights, mapOf, EDGE, SQ_EDGE, atHome, halfwayState, evenDots, legalWalk, spent} from '../dist/families/octagon/octagon.js';

// --- Search ------------------------------------------------------------------
// The fewest roads from a dot back home is at least its hyperbolic distance
// over the length of a road (octagons) or its distance along the grid
// (squares); near home the exact count comes from a breadth-first ball.
const steps = {oct: new Map(), sq: new Map()};
function after(kind, g, m) {
  const key = `${g}|${m}`, memo = steps[kind];
  let hit = memo.get(key);
  if (!hit) {
    const next = reduce(kind, g + TURN[m] + 'HTT');
    hit = {next, dot: dotKey(kind, next)};
    memo.set(key, hit);
  }
  return hit;
}
const balls = {};
function ball(kind) {
  if (balls[kind]) return balls[kind];
  const R = kind === 'oct' ? 9 : 16, dist = new Map([[dotKey(kind, ''), 0]]);
  let frontier = [''];
  for (let r = 1; r <= R; r++) {
    const next = [];
    for (const g of frontier) for (const x of ['', 'T', 'TT', 't']) {
      const w = reduce(kind, g + x + 'H'), k = dotKey(kind, w);
      if (!dist.has(k)) { dist.set(k, r); next.push(w); }
    }
    frontier = next;
  }
  return (balls[kind] = {R, dist});
}
const lows = {oct: new Map(), sq: new Map()};
function fewest(kind, g, dot) {
  const memo = lows[kind];
  if (memo.has(dot)) return memo.get(dot);
  const b = ball(kind), d = b.dist.get(dot);
  let low = d;
  if (low === undefined) {
    const M = mapOf(kind, g);
    low = Math.max(b.R + 1, kind === 'sq'
      ? Math.round(Math.abs(M.b[0]) / SQ_EDGE) + Math.round(Math.abs(M.b[1]) / SQ_EDGE)
      : Math.floor(Math.acosh(Math.max(1, M.a[0] ** 2 + M.a[1] ** 2 + M.b[0] ** 2 + M.b[1] ** 2)) / EDGE + 1e-9));
  }
  memo.set(dot, low);
  return low;
}
// Every walk of exactly n moves that comes home facing the same way.
function homeWalks(kind, n) {
  const out = [], walk = [], home = dotKey(kind, '');
  const dfs = g => {
    if (walk.length === n) { if (g === '') out.push(walk.join('')); return; }
    for (const m of TURNS) {
      const {next, dot} = after(kind, g, m);
      if (fewest(kind, next, dot) > n - walk.length - 1) continue;
      walk.push(m); dfs(next); walk.pop();
    }
  };
  dfs('');
  void home;
  return out;
}
// Every fence within FENCE_CAP moves that keeps to the turn budget and has
// the flowers inside.
function fences(kind, q, cap = FENCE_CAP) {
  const out = [], walk = [], home = dotKey(kind, ''), used = new Set([home]);
  const dfs = (g, L, R) => {
    const left = cap - walk.length;
    for (const m of TURNS) {
      if (m === 'L' && Number.isInteger(q.maxLeft) && L >= q.maxLeft) continue;
      if (m === 'R' && Number.isInteger(q.maxRight) && R >= q.maxRight) continue;
      const {next, dot} = after(kind, g, m);
      walk.push(m);
      if (dot === home) { if (next === '' && fenceOk(kind, q, walk.join(''))) out.push(walk.join('')); }
      else if (!used.has(dot) && fewest(kind, next, dot) <= left - 1) { used.add(dot); dfs(next, L + (m === 'L'), R + (m === 'R')); used.delete(dot); }
      walk.pop();
    }
  };
  dfs('', 0, 0);
  return out;
}
const ORDER = {L: 0, S: 1, R: 2};
const byWalk = (a, b) => a.length - b.length || (() => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return ORDER[a[i]] - ORDER[b[i]]; return 0; })();

// --- Puzzles -----------------------------------------------------------------
// Floors are listed squares first. `expect` is each floor's number of walks
// (docs/octagon/README.md); 0 means Can't is the answer there. `attempt` is the
// try the hints walk before they explain Can't.
const BASE = 'A move turns at a dot (left, straight on or right) and then walks one road to the next dot; the robot never turns round. Home facing the same way means back on the yellow ring, pointing like the faint arrow.';
const FENCE = 'A fence is a walk that comes home facing the same way and never uses a dot twice; the rooms it goes round are fenced in.';
const GESTURES = 'Tap ↰, ↑ or ↱, or a road ahead of the robot. Drag a floor to look round it.';
const CANT = {dot: 'After a try, if no walk can do it, press Can’t and tap the dot that shows why.', dots: 'After a try, if no walk can do it, press Can’t and tap the dots that show why.', fence: 'After a try, if no fence can do it, press Can’t.'};
const RULES = {
  move: 'Each move turns left, goes straight on or turns right at a dot, then walks one road. The robot never turns round.',
  floors: 'On the octagon floor every room has eight corners, all right angles, and four rooms meet at every dot. The floor slides so the robot stays in the middle; rooms near the rim are drawn smaller but are all the same size.',
  home: n => `Make exactly ${n} moves. The walk must end on the yellow ring with the robot pointing like the faint arrow.`,
  fence: 'A fence comes home facing the same way and never uses a dot twice. The flowers must be inside it.',
  noRight: 'No right turns.',
  lefts: n => `At most ${n} left turns: each one uses a ↰.`,
  cant: 'Can’t works once a try is finished. After a wrong tap or “There is a way.”, it waits for a different finished try.'
};
const PREREQ = {
  home: 'Tell left from right and count moves to fourteen. Keeping track of which way the robot faces on a curved road takes practice; a grown-up can trace the first moves with a finger.',
  fence: 'Tell left from right and plan a walk that must not cross itself. A grown-up can read the goal.',
  odd: 'Tell left from right and count moves. The reason for Can’t is a colouring idea a grown-up can draw on paper first.'
};
const sources = ['octagon-week65', 'octagon-card65', 'octagon-joyce'];
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Eight moves home', q: {mode: 'home', moves: 8}, floors: ['oct'], expect: {oct: 2},
    idea: 'On the octagon floor, the robot comes home facing the same way by going round a whole room: eight corners, not four.',
    hints: ['Make a few moves and watch which room the robot goes round.', 'Every room has eight corners. Turning the same way at every dot keeps the robot on one room.', 'Turn left eight times, or right eight times.'],
    parent: {notice: 'Whether your child expects four left turns to make a loop, as on squares, and what they do when it doesn’t.', prompt: 'Where did four left turns take the robot? How many more did it need?', explanation: 'Every room is an octagon whose corners are right angles, and four rooms meet at each dot. Four left turns take the robot halfway round one room; it is home facing the same way after eight, one for each corner. Of all 3^8 = 6,561 walks of eight moves, only eight lefts and eight rights come home facing the same way.', extension: 'Can the robot come home in fewer than eight moves? (No: Puzzles 2 and 4 show why not in four or six.)', connection: 'The floor is the {8,4} tiling of the hyperbolic plane. Gauss–Bonnet: the turning round a loop is a full turn plus the area inside, measured as an angle. A room here has area 2π, so going round one takes two full turns, eight quarter turns.'},
    provenance: 'Week 65 Problem 2 (the octagon floor walked with left turns), with the review card’s fix 1 question “Can you get back facing the same way in fewer than 8 moves?” left for Puzzles 2 and 4.'},
  {number: 2, level: 'easy', title: 'Four moves home', q: {mode: 'home', moves: 4}, floors: ['sq', 'oct'], expect: {sq: 2, oct: 0}, attempt: {oct: 'LLLL'},
    idea: 'Four turns make a loop on squares but not on octagons: there, after two moves the only two-road way back is the way the robot came, and it starts with a turn round.',
    hints: ['Try four moves on each floor.', 'On the octagon floor, look at the dot the robot reached after two moves. How else could it get home from there in two roads?', 'Squares: four lefts. Octagons: make four moves, press Can’t and tap the dot after two moves.'],
    parent: {notice: 'Whether your child tries four lefts on the octagons, sees it stop halfway round a room, and looks for a way to say why no other walk works either.', prompt: 'After two moves, how many ways are there back home in two roads?', explanation: 'On squares, four lefts or four rights come home facing the same way (2 of the 81 walks). On octagons none of the 81 walks does. After two moves the robot is two roads from home. Two different two-road routes between the same dots would close up a loop of four roads, but the smallest loop on this floor goes round a room of eight. So the only two-road way back is the way it came, and that starts with a turn round, which no move allows. The dot after two moves is the certificate the child taps.', extension: 'Does the same argument work for six moves? (Yes, with the dot after three moves: Puzzle 4.)', connection: 'The roads form a graph of girth 8 (shortest cycle 8), so any route of up to three roads is the only shortest route between its ends.'},
    provenance: 'Week 65 Problem 1 (routes of 4 moves on squares: 2) beside Problem 2’s octagon floor; the review card’s can’t “home in 4 moves”.'},
  {number: 3, level: 'easy', title: 'Two flowers', q: {mode: 'fence', flowers: ['T', ''], maxLeft: null, maxRight: 0}, floors: ['sq', 'oct'], expect: {sq: 455, oct: 123},
    idea: 'Round two rooms a fence turns left 12 times on octagons and 4 times on squares: 16 corners less the 4 at the ends of the shared wall, against 8 less 4.',
    hints: ['Walk round the outside of the two flower rooms on each floor.', 'Home is at one end of the wall the two flowers share, so the fence goes straight on through home.', 'Squares: straight, left, left, straight, left, left. Octagons: straight, six lefts, straight, six lefts.'],
    parent: {notice: 'Whether your child counts the left turns on each floor, and what they make of 12 against 4.', prompt: 'Two rooms on each floor. Why does one fence need so many more left turns?', explanation: 'The tightest fences are straight, left, left, straight, left, left on squares (4 lefts) and straight, six lefts, straight, six lefts on octagons (12 lefts). Two octagons have 16 corners; at the two ends of their shared wall the fence goes straight on, and the 4 corners there are lost, leaving 12 left turns. Two squares have 8 corners and lose 4, leaving 4. Within 30 moves there are 455 fences on squares (every rectangle with home on its bottom edge) and 123 on octagons.', extension: 'Fence three flowers in a row on each floor. (Octagons 16 lefts, squares still 4.)', connection: 'Round n rooms, left turns minus right turns is 4 + 4n on octagons and always 4 on squares (Gauss–Bonnet).'},
    provenance: 'Week 65 Problem 3: one walk round two octagons and round two squares, started at the end of the shared wall so the last arrival goes straight.'},
  {number: 4, level: 'medium', title: 'Six moves home', q: {mode: 'home', moves: 6}, floors: ['sq', 'oct'], expect: {sq: 6, oct: 0}, attempt: {oct: 'LLLLLL'},
    idea: 'Six moves home works six ways on squares and no way on octagons; the dot after three moves shows why.',
    hints: ['Try six moves on each floor.', 'On octagons, look at the dot after three moves. How many three-road ways back are there?', 'Squares: left, left, straight, left, left, straight. Octagons: make six moves, press Can’t and tap the dot after three moves.'],
    parent: {notice: 'Whether your child reuses Puzzle 2’s reason with three moves in place of two.', prompt: 'Which dot would the robot have to turn round at?', explanation: 'On squares six walks of the 729 come home facing the same way: round a block of two squares, turning left all the way or right all the way, with home at one of three places on the way round (left, left, straight, left, left, straight is one). On octagons none does: after three moves the robot is three roads from home, and two different routes of three roads would make a loop of six, but the smallest loop is eight. So the only three-road way back is the way it came, starting with a turn round.', extension: 'What about ten or twelve moves? (Also impossible on octagons, but the halfway reason no longer works, because routes of four roads can differ, round half a room. Fourteen works: Puzzle 7.)', connection: 'Returns on the {8,4} floor happen at lengths 8, 14, 16, 18, 20, …: 2, 14, 50, 144 and 620 walks.'},
    provenance: 'Week 65 Problem 1 (routes of 6 moves on squares: 6) against the review card’s can’t “home in 6 moves” on octagons.'},
  {number: 5, level: 'medium', title: 'Seven moves home', q: {mode: 'home', moves: 7}, floors: ['sq', 'oct'], expect: {sq: 0, oct: 0}, attempt: {sq: 'LLSLLSL', oct: 'LLLLLLL'},
    idea: 'No odd walk comes home, on either floor: colour the dots light and dark so every road joins two colours.',
    hints: ['Try seven moves on each floor.', 'Colour home light, its neighbours dark, their neighbours light. What colour is the robot on after seven moves?', 'After seven moves, press Can’t and tap every dot your walk reached after an even number of moves, other than home.'],
    parent: {notice: 'Whether your child notices that this one fails on both floors, unlike four and six.', prompt: 'If every road joins a light dot to a dark one, what colour is the robot on after one move? After two? After seven?', explanation: 'Colour the dots so every road joins a light dot to a dark one; both floors can be coloured like a chessboard. Home is light, and every move walks one road, so the colour changes at every move. After seven moves the robot is on a dark dot, never home. After Can’t the child taps the dots of the walk that share home’s colour, the ones it reached after two, four and six moves (other than home), and the app then draws the whole colouring. Those dots show the colours alternating along the walk, which puts the seventh dot on the other colour.', extension: 'Does the colouring also rule out 13 moves? (Yes: Puzzle 10.)', connection: 'Both floors are bipartite graphs, because every room has an even number of sides.'},
    provenance: 'New, from the review card’s can’t “any odd length (two-colour the corners)”.'},
  {number: 6, level: 'medium', title: 'Corner flowers', q: {mode: 'fence', flowers: ['T', 'THT'], maxLeft: null, maxRight: 0}, floors: ['oct'], expect: {oct: 17},
    idea: 'Two rooms that meet only at a corner can’t be fenced alone; with no right turns the fence takes all four rooms at that dot.',
    hints: ['The two flowers touch only at one dot. Can a fence pass that dot once and still have both flowers inside?', 'With no right turns, a fence can’t bend in round a room that is left out. Take every room at the shared dot.', 'Go straight, then five lefts, and repeat four times.'],
    parent: {notice: 'Whether your child first tries to fence just the two flowers, and finds the fence would have to use the corner dot twice.', prompt: 'What happens at the dot where the two flowers meet?', explanation: 'A fence never uses a dot twice, so where the flowers meet, a third room must be inside too. That room leaves the fourth room at the dot outside, and the fence would bend in round it: a right turn. So with no right turns all four rooms at the dot are inside. Their fence is 24 moves: straight, five lefts, four times, with 20 left turns, 4 + 4 × 4. There are 17 fences within 30 moves; the others take in a fifth room.', extension: 'Puzzle 9 allows a right turn. How few left turns can a fence round both flowers have then?', connection: 'Round n rooms, left minus right turns is 4 + 4n; here n = 4.'},
    provenance: 'New: two flowers that meet only at a corner (the four rooms round one dot, as in Week 65 Problem 5’s board).'},
  {number: 7, level: 'medium', title: 'Fourteen moves home', q: {mode: 'home', moves: 14}, floors: ['oct'], expect: {oct: 14},
    idea: 'After 8, the next return home on octagons is 14 moves: round two rooms.',
    hints: ['Eight moves go round one room. What could fourteen go round?', 'Go round two rooms that share a wall: a straight move at each end of the wall.', 'Six lefts, straight, six lefts, straight.'],
    parent: {notice: 'Whether your child connects 14 with the fence round two rooms in Puzzle 3.', prompt: 'How did 8 + 8 become 14?', explanation: 'Round two rooms that share a wall is 14 roads: their 16 sides less the shared wall, which is a side of each room and is not walked. The robot goes straight at the two ends of that wall and turns at the other 12 dots: 12 lefts and 2 straights, or the same with rights. Exactly 14 of the 3^14 = 4,782,969 walks of fourteen moves come home facing the same way: round two rooms that share a wall, turning left all the way or right all the way, with home at one of seven places on the way round.', extension: 'Is there a walk home of 15 moves? (No: it is odd.) Of 16? (Yes, 50 of them.)', connection: 'The counts of walks home by length (8: 2, 14: 14, 16: 50, 18: 144, 20: 620) grow quickly, as they must on a floor whose rooms multiply as you go out.'},
    provenance: 'The review card’s solve “home facing the same way in exactly 14 moves”; Week 65 Problem 3’s walk round two octagons is one of them.'},
  {number: 8, level: 'medium', title: 'Eleven left turns', q: {mode: 'fence', flowers: ['T', ''], maxLeft: 11, maxRight: 0}, floors: ['sq', 'oct'], expect: {sq: 455, oct: 0}, attempt: {oct: 'SLLLLLLSLLLLL'},
    idea: 'Two octagons need 12 left turns at least; two squares need only 4.',
    hints: ['Fence the flowers on each floor and watch the left turns.', 'Two octagons have 16 corners, and the fence goes straight at both ends of the wall they share.', 'Squares: straight, left, left, straight, left, left. Octagons: use up the left turns and press Can’t.'],
    parent: {notice: 'Whether your child uses Puzzle 3’s count to predict that the octagons will run out of left turns.', prompt: 'Where are the corners the fence doesn’t turn at?', explanation: 'On squares every rectangle round the flowers takes 4 lefts, well inside the budget (455 fences). On octagons no fence has 11 or fewer: the tightest one, round just the two flowers, turns left at 16 − 4 = 12 corners, losing the 4 at the ends of the shared wall. With no right turns, a fence round more rooms has more lefts still (4 + 4n round n rooms). That is a fact about every fence at once, not about one walk, so Can’t is pressed alone, and the app draws the tightest fence and its 12 corners. The app checks every walk of up to 30 moves with at most 11 lefts.', extension: 'How many left turns does a fence round three octagons in a row need? (16.)', connection: 'Gauss–Bonnet: left minus right turns is 4 + 4n round n octagons and 4 round any number of squares.'},
    provenance: 'The review card’s can’t “two rooms with fewer than 12 left turns”, on Week 65 Problem 3’s two rooms.'},
  {number: 9, level: 'hard', title: 'Corner flowers again', q: {mode: 'fence', flowers: ['T', 'THT'], maxLeft: 19, maxRight: null}, floors: ['oct'], expect: {oct: 2},
    idea: 'With a right turn allowed, three rooms round the corner dot are enough: 17 lefts and 1 right.',
    hints: ['Puzzle 6 took 20 left turns. What does a right turn let the fence do?', 'Leave out one of the two other rooms at the dot where the flowers meet, and turn right there.', 'Straight, five lefts, straight, six lefts, right, six lefts.'],
    parent: {notice: 'Whether your child thinks of leaving a room out, and accepts the right turn that this needs at the corner dot.', prompt: 'Puzzle 6 took 20 left turns. Why does leaving out one room save three of them?', explanation: 'A fence must take a third room at the dot where the flowers meet, so it goes round three rooms with the fourth room at that dot outside, turning right there. Three rooms have 24 corners. The fence is 20 roads long: it goes straight at the outer ends of the two shared walls, turns right at the middle dot, and turns left at the other 17 corners: 17 − 1 = 16 = 4 + 4 × 3. There are exactly two such fences (leave out either of the two other rooms), and none with 19 lefts or fewer round four rooms (20 lefts).', extension: 'On squares, an L of three squares takes 5 lefts and 1 right. Why only 4 + 0 × 3 there?', connection: 'Week 65 review card, fix 1: a trace round Home, A and ⋆ gives 17 left and 1 right, the third case of 4 + 4n.'},
    provenance: 'Week 65 review card fix 1: a pencil trace round three rooms at a corner (Home, A and ⋆ on p. 5): 17 left, 1 right.'},
  {number: 10, level: 'hard', title: 'Thirteen moves home', q: {mode: 'home', moves: 13}, floors: ['oct'], expect: {oct: 0}, attempt: {oct: 'LLLLLLLLLLLLL'},
    idea: 'Thirteen is one short of fourteen, and no odd walk comes home.',
    hints: ['Fourteen moves worked in Puzzle 7. Try thirteen.', 'Colour the dots light and dark so every road joins two colours. What colour is the robot on after thirteen moves?', 'After thirteen moves, press Can’t and tap every dot your walk reached after an even number of moves, other than home.'],
    parent: {notice: 'Whether your child reaches for Puzzle 5’s colouring rather than trying many walks.', prompt: 'Is there any odd number of moves that works?', explanation: 'Every move changes the colour of the robot’s dot, so after thirteen moves it is on a dark dot and home is light. None of the 1,594,323 walks of thirteen moves comes home. After Can’t the child taps the walk’s dots of home’s colour (those reached after an even number of moves, other than home), and the app draws the colouring.', extension: 'On the octagon floor, which even numbers of moves can come home? (8 and every even number from 14 on; not 2, 4, 6, 10 or 12.)', connection: 'The floor is bipartite because every room has eight sides, an even number.'},
    provenance: 'The review card’s can’t “any odd length”, at 13, beside Puzzle 7’s 14.'}
];

// --- Build -------------------------------------------------------------------
const id = n => `octagon-${String(n).padStart(2, '0')}`;
const NAMES = {oct: 'octagons', sq: 'squares'};
const WORDS = {L: 'left', S: 'straight', R: 'right'};
const spell = w => [...w].map(m => WORDS[m]).join(', ');
function objectiveOf(item) {
  const q = item.q, where = item.floors.length > 1 ? 'on each floor' : 'on this floor';
  if (q.mode === 'home') return `Come home facing the same way in exactly ${q.moves} moves ${where}, or press Can’t where no walk can.`;
  const budget = [q.maxRight === 0 ? 'no right turns' : '', Number.isInteger(q.maxLeft) ? `at most ${q.maxLeft} left turns` : ''].filter(Boolean).join(' and ');
  return `Fence in the flowers${budget ? ` with ${budget}` : ''} ${where}, or press Can’t where no fence can.`;
}
function visibleOf(item) {
  const q = item.q;
  if (q.mode === 'home') return `Home in exactly ${q.moves} moves, facing the same way.`;
  return `Fence in the flowers${q.maxRight === 0 ? ' with no right turns' : ''}.`;
}
function controlsOf(item) {
  const q = item.q, cant = q.mode === 'fence' ? CANT.fence : q.moves % 2 ? CANT.dots : CANT.dot;
  return [BASE, q.mode === 'fence' ? FENCE : '', GESTURES, cant].filter(Boolean).join(' ');
}
function rulesOf(item) {
  const q = item.q;
  return [RULES.move, RULES.floors, q.mode === 'home' ? RULES.home(q.moves) : RULES.fence, q.maxRight === 0 ? RULES.noRight : '', Number.isInteger(q.maxLeft) ? RULES.lefts(q.maxLeft) : '', RULES.cant].filter(Boolean);
}
const t0 = Date.now();
const out = PUZZLES.map(item => {
  const q = item.q, floors = [], solution = {floors: []};
  for (const kind of item.floors) {
    let solutions;
    if (q.mode === 'home') solutions = homeWalks(kind, q.moves);
    else {
      // A floor with an answer lists every fence, for exact dead-end hints.
      // Round n octagons, left minus right turns is 4 + 4n (Gauss–Bonnet), so
      // a left budget allows at most (maxLeft − 4) / 4 rooms, and a fence
      // round n rooms has at most 8n − 2(n − 1) = 6n + 2 roads: the search
      // stops there. A floor whose answer is Can't is searched to FENCE_CAP,
      // with no theorem.
      const cap = kind === 'oct' && Number.isInteger(q.maxLeft) && item.expect[kind] > 0 ? Math.min(FENCE_CAP, 6 * Math.floor((q.maxLeft - 4) / 4) + 2) : FENCE_CAP;
      solutions = fences(kind, q, cap);
    }
    solutions.sort(byWalk);
    assert.equal(solutions.length, item.expect[kind], `${id(item.number)} ${kind}: number of walks`);
    for (const w of solutions) {
      assert.ok(legalWalk(kind, q, w) && goalMet(kind, q, w), `${id(item.number)} ${kind}: ${w} reaches the goal`);
      if (q.mode === 'fence') {
        const n = inside(kind, w).rooms.length;
        assert.equal(lefts(w) - rights(w), kind === 'oct' ? 4 + 4 * n : 4, `${id(item.number)} ${kind}: ${w} turns 4 + 4n`);
        assert.ok(inside(kind, w).ccw, `${id(item.number)} ${kind}: ${w} goes round with the flowers on its left`);
      } else assert.ok(atHome(kind, w));
    }
    const attempt = solutions.length ? '' : item.attempt[kind];
    if (!solutions.length) {
      assert.ok(legalWalk(kind, q, attempt) && spent(kind, q, attempt), `${id(item.number)} ${kind}: the hints’ attempt is a finished try`);
      if (q.mode === 'home' && q.moves % 2 === 0) assert.ok(halfwayState(kind, attempt) !== undefined);
      if (q.mode === 'home' && q.moves % 2) assert.ok(evenDots(kind, attempt).length > 0, `${id(item.number)} ${kind}: the try has dots of home’s colour to tap`);
    }
    floors.push({kind, solutions, attempt});
    solution.floors.push(solutions.length
      ? {kind, count: solutions.length, example: solutions[0], words: spell(solutions[0])}
      : {kind, count: 0, cant: q.mode === 'fence' ? 'pressed alone; the tightest fence and its 12 corners are drawn' : q.moves % 2 ? 'the walk’s dots of home’s colour, then the colouring' : `the dot after ${q.moves / 2} moves`});
    // No odd walk comes home (every road joins a light dot to a dark one), so
    // an odd goal never has an answer, and its taps are never “There is a way”.
    if (q.mode === 'home' && q.moves % 2) assert.equal(solutions.length, 0, `${id(item.number)} ${kind}: no odd walk comes home`);
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Octagon streets', mechanic: 'octagon', band: 'all', revision: 1, sourceDocument: 'docs/octagon/README.md',
    parameters: {...q, floors},
    objective: objectiveOf(item), visibleObjective: visibleOf(item), instruction: objectiveOf(item),
    controls: controlsOf(item), rules: rulesOf(item),
    idea: item.idea, prerequisites: q.mode === 'fence' ? PREREQ.fence : q.moves % 2 ? PREREQ.odd : PREREQ.home, hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
const playground = {
  id: 'octagon-playground', number: 0, title: 'Octagon streets playground', difficulty_level: 'playground', familyTitle: 'Octagon streets', mechanic: 'octagon', band: 'playground', revision: 1, sourceDocument: 'docs/octagon/README.md',
  parameters: {mode: 'playground', floors: [{kind: 'sq'}, {kind: 'oct'}]},
  objective: 'Walk the robot anywhere on the square floor and the octagon floor.', visibleObjective: '',
  instruction: 'Walk the robot anywhere on the square floor and the octagon floor.',
  controls: `${BASE} Tap ↰, ↑ or ↱, or a road ahead of the robot. Drag a floor to look round it. Clear starts a floor again.`,
  rules: [RULES.move, RULES.floors, `A walk can be up to ${60} moves long. Clear empties a floor.`],
  idea: 'Free walking on the two floors: the same moves make different shapes.',
  prerequisites: 'None. A grown-up can call out moves for the child to make on both floors at once.',
  hints: ['Make the same moves on both floors and compare where the robot ends up.', 'Try left, left, straight again and again on each floor.', 'Walk round a room on each floor and count the corners.'],
  parent: {notice: 'Whether your child predicts where the robot will end up before each move, and which floor surprises them.', prompt: 'Make the same moves on both floors. When do they end up in the same kind of place?', explanation: 'On squares a turn left and three turns right come to the same heading, and four left moves close a loop. On octagons four left moves go only halfway round a room, and two different short routes never end at the same dot: the smallest loop is eight roads.', extension: 'Find a walk that comes home facing the same way on both floors. (Eight lefts does: twice round a square, once round an octagon.)', connection: 'The two floors are the {4,4} tiling of the flat plane and the {8,4} tiling of the hyperbolic plane; their rotation groups have the same generators and differ in one relation.', sourceIds: sources},
  provenance: 'Week 65 Problems 1 to 3: free walking on squares and octagons.'
};
const json = {
  title: 'Octagon streets',
  version: 1,
  families: [{id: 'octagon', title: 'Octagon streets', mathematics: 'A robot walks the roads of a floor: each move turns left, goes straight on or turns right at a dot and walks one road. On the octagon floor every room is an octagon with right-angled corners and four rooms meet at every dot, the {8,4} tiling of the hyperbolic plane, drawn in the Poincaré disk and recentred on the robot; beside it is the square floor, the {4,4} tiling. The robot’s place and heading is an element of the rotation group ⟨T, H | T⁴ = H² = (TH)^p = 1⟩ (p = 8 or 4), kept as its word and reduced by a complete rewriting system, so returns are exact. Facts: on octagons the shortest walk home facing the same way is 8 moves (round a room), then 14 (round two rooms); 4 and 6 are impossible, because the roads have girth 8 and a walk of up to three roads is the only short route between its ends; every odd length is impossible on both floors, because every road joins a light dot to a dark one. A fence (a closed walk using no dot twice) round n rooms has left minus right turns 4 + 4n on octagons and 4 on squares (Gauss–Bonnet: the turning is a full turn plus the area inside, and an octagon here has area 2π), so two octagons need 12 left turns: 16 corners less the 4 at the ends of their shared wall.', rules: [RULES.move, RULES.floors, RULES.cant], sourceIds: sources}],
  sources: [
    {id: 'octagon-week65', title: 'Bellingham Math Circle — Week 65: Hyperbolic octagon streets (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-65', kind: 'local curriculum'},
    {id: 'octagon-card65', title: 'Week 65 review card and math check (the {8,4} floor, 4 + 4n, fix 1 and the App fit Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-65.md', kind: 'local curriculum'},
    {id: 'octagon-joyce', title: 'David E. Joyce — Hyperbolic Tessellations, Clark University: the {p,q} notation and the Poincaré disk, including {8,4}', url: 'https://mathcs.clarku.edu/~djoyce/poincare/poincare.html', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/octagon/octagon.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.mode === 'home' ? p.parameters.moves : `[${p.parameters.flowers}]`} ${p.solution.floors.map(f => `${f.kind}: ${f.count ? `${f.count} (${f.example})` : `can’t, ${f.cant}`}`).join('; ')}`).join('\n'));
console.log(`${Date.now() - t0} ms`);
