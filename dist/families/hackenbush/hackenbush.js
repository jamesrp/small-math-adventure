// Hackenbush balances (worksheet Week 83, after Berlekamp, Conway and Guy's
// red–blue Hackenbush), a group inside Pebble Duel. Stalks of blue and red
// segments stand on the ground. Blue cuts one blue segment, Red one red
// segment, and everything above a cut falls off; whoever has nothing to cut
// loses. Every board is a number (B = 1, R = −1, BR = 1/2, BRR = 1/4,
// RB = −1/2), the numbers of stalks add, and a board is won by Blue whoever
// starts when its number is positive, by Red when negative, and by whoever
// moves second when it is zero: a zero board balances.
//
// Mechanic `stalks`: duels (you go first in a given colour and must find the
// winning cut), every reply (go second from a balanced board and win against
// each first cut), boards (choose Blue, Red or Go second on each of a few
// boards, then win) and rounds (the same choice on drawn boards, three wins in
// a row from new boards). Mechanic `stalkbuild`: add stalks to a board until
// it balances; Check is final for that board: if it does not balance, I take
// the colour that wins going first, go first and win, and Back returns to the
// board. Design notes: docs/hackenbush/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const keysAre = (value, keys) => object(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
export const STREAK = 3;
export const COLOURS = ['B', 'R'];
export const other = c => c === 'B' ? 'R' : 'B';
const otherPlayer = player => player === 'you' ? 'opponent' : 'you';
const NAME = {B: 'blue', R: 'red'};
const TITLE = {B: 'Blue', R: 'Red'};

// --- The game -------------------------------------------------------------------
// A board lists its stalks, each a string of B and R from the ground up; a
// stalk cut to the ground stays as '' so the others keep their places. A cut
// is {stalk, at}: segment `at` (0 is on the ground) of that stalk, which
// leaves the stalk's first `at` segments.
export const isStalk = s => typeof s === 'string' && /^[BR]*$/.test(s);
const isBoard = pos => Array.isArray(pos) && pos.length > 0 && pos.every(isStalk);
export const segments = pos => pos.reduce((n, s) => n + s.length, 0);
export function moves(pos, colour) {
  const out = [];
  pos.forEach((s, stalk) => { for (let at = 0; at < s.length; at++) if (s[at] === colour) out.push({stalk, at}); });
  return out;
}
export const after = (pos, m) => pos.map((s, i) => i === m.stalk ? s.slice(0, m.at) : s);
export const legal = (pos, colour, m) => keysAre(m, ['stalk', 'at']) && integer(m.stalk) && m.stalk >= 0 && m.stalk < pos.length && integer(m.at) && m.at >= 0 && m.at < pos[m.stalk].length && pos[m.stalk][m.at] === colour;
// Whether `colour`, moving now, wins against any play, by searching every cut
// (memoised on the board with its stalks sorted, since their order does not
// matter). Whoever has nothing to cut loses.
const memo = new Map();
export const canonical = pos => pos.filter(Boolean).sort().join(',');
export function wins(pos, colour) {
  const key = `${colour}|${canonical(pos)}`;
  if (memo.has(key)) return memo.get(key);
  const result = moves(pos, colour).some(m => !wins(after(pos, m), other(colour)));
  memo.set(key, result);
  return result;
}
export const winningMoves = (pos, colour) => moves(pos, colour).filter(m => !wins(after(pos, m), other(colour)));
// Who wins a board: 'B' or 'R' when that colour wins whoever starts, 'second'
// when whoever moves second wins (the board balances), and 'first' when
// whoever moves first wins (never, in red–blue Hackenbush).
export function outcome(pos) {
  const b = wins(pos, 'B'), r = wins(pos, 'R');
  return b && r ? 'first' : b ? 'B' : r ? 'R' : 'second';
}
export const balances = pos => outcome(pos) === 'second';
// A stalk's number: the first run of one colour counts 1 each (+ for blue,
// − for red), and after the colour first changes each segment counts half the
// one before. For the notes and for steering build hints; who wins is always
// decided by the search above, and the validator checks the two agree.
export function stalkValue(s) {
  let v = 0, i = 0;
  while (i < s.length && s[i] === s[0]) { v += s[i] === 'B' ? 1 : -1; i++; }
  for (let step = 1 / 2; i < s.length; i++, step /= 2) v += s[i] === 'B' ? step : -step;
  return v;
}
export const value = pos => pos.reduce((v, s) => v + stalkValue(s), 0);
// A perfect opponent: a winning cut whenever there is one; otherwise a cut that
// leaves the fewest winning replies, then the most segments, so the game lasts.
export function opponentMove(pos, colour, random = Math.random) {
  const options = moves(pos, colour), winning = options.filter(m => !wins(after(pos, m), other(colour)));
  if (winning.length) return pick(winning, random);
  let best = [], score = -Infinity;
  for (const m of options) {
    const to = after(pos, m), s = segments(to) - 1000 * winningMoves(to, other(colour)).length;
    if (s > score) { score = s; best = [m]; } else if (s === score) best.push(m);
  }
  return pick(best, random);
}
// One game replayed from its start: where it stands, whose turn it is and who
// won, or null. `colour` is the child's. A game ends when the player to move
// has nothing to cut, perhaps before anyone has cut. A saved cut of mine from
// a winning board must reach a losing one, so a saved win by the child is a
// real win against perfect play.
const moverColour = (game, player) => player === 'you' ? game.colour : other(game.colour);
export function replay(game) {
  if (!object(game) || !isBoard(game.start) || !game.start.some(Boolean) || !Array.isArray(game.turns)) return null;
  if (game.first === null) return game.colour === null && !game.turns.length ? {pos: [...game.start], over: false, toMove: null, winner: null} : null;
  if (!COLOURS.includes(game.colour) || !['you', 'opponent'].includes(game.first) || game.turns.length > segments(game.start)) return null;
  let pos = [...game.start], toMove = game.first;
  for (const t of game.turns) {
    if (!keysAre(t, ['player', 'stalk', 'at']) || t.player !== toMove) return null;
    const c = moverColour(game, t.player), m = {stalk: t.stalk, at: t.at};
    if (!legal(pos, c, m)) return null;
    const to = after(pos, m);
    if (t.player === 'opponent' && wins(pos, c) && wins(to, other(c))) return null;
    pos = to;
    toMove = otherPlayer(toMove);
  }
  const over = !moves(pos, moverColour(game, toMove)).length;
  return {pos, over, toMove, winner: over ? otherPlayer(toMove) : null};
}
// The colour and first player I may give a choice. Blue or Red: you play that
// colour and I choose who starts, so that you lose if I can make you. Me
// second: I go first in a colour that wins going first, if one does.
export function assignments(start, claim) {
  if (COLOURS.includes(claim)) {
    const first = wins(start, claim), second = !wins(start, other(claim));
    return (first && !second ? ['opponent'] : !first && second ? ['you'] : ['you', 'opponent']).map(f => ({colour: claim, first: f}));
  }
  if (claim === 'second') {
    const winners = COLOURS.filter(c => wins(start, c));
    return (winners.length === 1 ? [other(winners[0])] : COLOURS).map(colour => ({colour, first: 'opponent'}));
  }
  return [];
}
// The choice that wins against any start and colour I give: the colour that
// wins whoever starts, or Go second on a board that balances.
export const bestClaim = start => ({B: 'B', R: 'R', second: 'second', first: 'B'})[outcome(start)];

// --- Boards for rounds ---------------------------------------------------------------
// Every board of 2 to 4 stalks (order ignored) from q.pieces, with q.least to
// q.most segments, both colours, and a stalk of both colours. A drawn board
// is Blue's, Red's or balanced with equal chance, so no one choice keeps
// winning, and differs from the one before.
export function boardPool(q) {
  const out = [], pieces = q.pieces;
  (function build(from, chosen) {
    if (chosen.length >= 2) {
      const n = segments(chosen), joined = chosen.join('');
      if (n >= q.least && n <= q.most && joined.includes('B') && joined.includes('R') && chosen.some(s => s.includes('B') && s.includes('R'))) out.push([...chosen]);
    }
    if (chosen.length === 4) return;
    for (let i = from; i < pieces.length; i++) build(i, [...chosen, pieces[i]]);
  })(0, []);
  return out;
}
const pools = new Map();
const poolOf = q => { const key = JSON.stringify([q.pieces, q.least, q.most]); if (!pools.has(key)) pools.set(key, boardPool(q)); return pools.get(key); };
export const inPool = (q, s) => isBoard(s) && poolOf(q).some(t => same(t, s));
export function drawStart(q, random = Math.random, previous = null) {
  const kind = pick(['B', 'R', 'second'], random);
  let pool = poolOf(q).filter(s => outcome(s) === kind);
  if (previous && pool.length > 1) pool = pool.filter(s => canonical(s) !== canonical(previous));
  return [...pick(pool, random)];
}

// --- Every reply's first cuts ---------------------------------------------------------
// Each colour's cuts from the start, one for each board they leave (cuts on
// two equal stalks count once), Blue's first.
export function firstCuts(start) {
  const out = [], seen = new Set();
  for (const colour of COLOURS) for (const m of moves(start, colour)) {
    const key = `${colour}|${canonical(after(start, m))}`;
    if (!seen.has(key)) { seen.add(key); out.push({colour, ...m}); }
  }
  return out;
}

// --- Drawing the stalks ------------------------------------------------------------------
// The board: stalks on a ground line, segments from the ground up. On the
// child's turn the child's segments are buttons that cut; the rest are drawn
// only (a tap on one is refused by wire). My last cut is drawn as the dashed
// pieces that fell. `build` adds the spots of a build, whose segments can be
// taken off, and a row under the ground line with each spot's two + buttons.
// The + buttons stay in that row whatever is built (a full spot's are off), so
// tapping one again and again adds again and again instead of landing on the
// segment it just added.
const moveData = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const button = (label, action, cls, enabled = true, hinted = false, focus = '') => `<button type="button" class="${cls} hb-button${hinted ? ' hinted' : ''}" ${moveData(action)} data-focus="${focus || `hb-${esc(action.type)}${action.claim ? `-${esc(action.claim)}` : ''}`}" ${enabled ? '' : 'disabled'}>${label}</button>`;
function stalksHTML(pos, {live = null, fallen = null, hinted = -1, ring = null, label = 'Stalks', tall = 3, given = pos.length, build = null}) {
  const columns = pos.map((s, i) => {
    const slot = i >= given, segs = [];
    for (let k = 0; k < s.length; k++) {
      const c = s[k], name = `${slot ? `Spot ${i - given + 1}` : `Stalk ${i + 1}`}, ${NAME[c]} segment ${k + 1} of ${s.length}`;
      const cls = `hb-seg ${c}${ring && ring.stalk === i && ring.at === k ? ' hinted' : ''}`;
      const cut = live === c || (build && slot);
      segs.push(cut
        ? `<button type="button" class="${cls}" data-s="${i}" data-k="${k}" ${moveData({type: 'cut', stalk: i, at: k})} data-focus="hb-seg-${i}-${k}" aria-label="${esc(`${name}. ${build ? 'Take it off.' : 'Cut.'}`)}"></button>`
        : `<span class="${cls}" data-s="${i}" data-k="${k}" role="img" aria-label="${esc(name)}"></span>`);
    }
    if (fallen && fallen.stalk === i) for (const [k, c] of [...fallen.pieces].entries()) segs.push(`<span class="hb-seg ${c} fell${k === 0 ? ' cut' : ''}" aria-hidden="true"></span>`);
    const cls = ['hb-stalk', slot ? 'slot' : '', i === hinted ? 'hinted' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-stalk="${i}">${segs.join('')}</div>`;
  }).join('');
  const board = `<div class="hb-board${build ? ' building' : ''}" role="group" aria-label="${esc(label)}" style="--n:${pos.length};--tall:${tall}">${columns}</div>`;
  if (!build) return board;
  const adds = pos.map((s, i) => i < given ? '<span class="hb-adds given" aria-hidden="true"></span>' : `<span class="hb-adds">${COLOURS.map(c => `<button type="button" class="hb-add ${c}${build.hinted && build.hinted.slot === i - given && build.hinted.colour === c ? ' hinted' : ''}" ${moveData({type: 'add', slot: i - given, colour: c})} data-focus="hb-add-${i - given}-${c}" aria-label="${esc(`Spot ${i - given + 1}: add a ${NAME[c]} segment`)}" ${s.length < build.height ? '' : 'disabled'}>+</button>`).join('')}</span>`).join('');
  return `${board}<div class="hb-addrow" role="group" aria-label="Add segments">${adds}</div>`;
}
// You and me, in our colours.
const key = colour => `<span class="hb-key" role="img" aria-label="${esc(`You are ${TITLE[colour]}. I am ${TITLE[other(colour)]}.`)}"><span class="hb-who"><span class="hb-swatch ${colour}"></span>You</span><span class="hb-who"><span class="hb-swatch ${other(colour)}"></span>Me</span></span>`;
const pips = (n, on, what) => `<span class="hb-pips" role="img" aria-label="${on} of ${n} ${what}">${Array.from({length: n}, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;
// The pieces my last cut sent down, to draw dashed above the stalk.
function fallenOf(game) {
  const last = game.turns.at(-1);
  if (last?.player !== 'opponent') return null;
  const before = replay({...game, turns: game.turns.slice(0, -1)});
  return before ? {stalk: last.stalk, pieces: before.pos[last.stalk].slice(last.at)} : null;
}
function gameStatus(run) {
  if (run.over) return run.winner === 'you' ? 'I have nothing to cut. You win.' : 'You have nothing to cut. I win.';
  return run.toMove === 'you' ? 'Your turn' : '';
}
// The most segments a stalk of the puzzle can have, so the board keeps its height.
export function tallest(q) {
  if (q.kind === 'build') return Math.max(q.height, ...q.given.map(s => s.length));
  if (q.mode === 'boards') return Math.max(...q.boards.flat().map(s => s.length));
  if (q.mode === 'streak') return Math.max(...q.pieces.map(s => s.length));
  return Math.max(...q.start.map(s => s.length));
}

// --- Duels, every reply, boards and rounds (mechanic `stalks`) ---------------------------
// The save: the start, the board now, your colour, who went first and the
// cuts. Boards and rounds also keep the choice (null until made); every reply
// and boards keep which first cut or board they are on and the games won
// before it, each replayed when a save is checked; a round keeps the streak,
// its won games and whether this board was new.
const FIELDS = {
  duel: ['start', 'pos', 'colour', 'first', 'turns'],
  replies: ['start', 'pos', 'colour', 'first', 'turns', 'round', 'won'],
  boards: ['start', 'pos', 'claim', 'colour', 'first', 'turns', 'round', 'won'],
  streak: ['start', 'pos', 'claim', 'colour', 'first', 'turns', 'streak', 'won', 'fresh']
};
const gameOf = b => b.claim === undefined ? {start: b.start, colour: b.colour, first: b.first, turns: b.turns} : {start: b.start, claim: b.claim, colour: b.colour, first: b.first, turns: b.turns};
const sameGame = (a, b) => JSON.stringify(gameOf(a)) === JSON.stringify(gameOf(b));
function roundBoard(q, round, won = []) {
  const cut = firstCuts(q.start)[round], m = {stalk: cut.stalk, at: cut.at};
  return {start: [...q.start], pos: after(q.start, m), colour: other(cut.colour), first: 'opponent', turns: [{player: 'opponent', ...m}], round, won: clone(won)};
}
const boardsBoard = (q, round, won = []) => ({start: [...q.boards[round]], pos: [...q.boards[round]], claim: null, colour: null, first: null, turns: [], round, won: clone(won)});
// A game against first cut i of every reply: from the start, me first with that cut.
function replyGame(q, game, i) {
  const cut = firstCuts(q.start)[i];
  return keysAre(game, ['start', 'colour', 'first', 'turns']) && same(game.start, q.start) && game.first === 'opponent' && game.colour === other(cut.colour) && game.turns[0]?.stalk === cut.stalk && game.turns[0]?.at === cut.at;
}
// A choice and what I gave for it: nothing yet, or one of my allowed answers.
function claimFits(game) {
  if (game.claim === null) return game.colour === null && game.first === null && !game.turns.length;
  return assignments(game.start, game.claim).some(x => x.colour === game.colour && x.first === game.first);
}
const wonGame = (game, start) => keysAre(game, ['start', 'claim', 'colour', 'first', 'turns']) && same(game.start, start) && game.claim !== null && claimFits(game) && replay(game)?.winner === 'you';
function gameValid(p, b) {
  const q = p.parameters, mode = q.mode;
  if (!FIELDS[mode] || !keysAre(b, FIELDS[mode]) || !isBoard(b.start)) return false;
  if (mode === 'duel' && (!same(b.start, q.start) || b.colour !== q.colour || b.first !== 'you')) return false;
  if (mode === 'replies') {
    const n = firstCuts(q.start).length;
    if (!integer(b.round) || b.round < 0 || b.round >= n || !replyGame(q, gameOf(b), b.round)) return false;
    if (!Array.isArray(b.won) || b.won.length !== b.round || !b.won.every((game, i) => replyGame(q, game, i) && replay(game)?.winner === 'you')) return false;
  }
  if (mode === 'boards') {
    if (!integer(b.round) || b.round < 0 || b.round >= q.boards.length || !same(b.start, q.boards[b.round])) return false;
    if (!Array.isArray(b.won) || b.won.length !== b.round || !b.won.every((game, i) => wonGame(game, q.boards[i]))) return false;
  }
  if (mode === 'streak' && !inPool(q, b.start)) return false;
  if ((mode === 'boards' || mode === 'streak') && (![null, 'B', 'R', 'second'].includes(b.claim) || !claimFits(b))) return false;
  const run = replay(b);
  if (!run || !same(run.pos, b.pos)) return false;
  // Saves land before the choice, on the child's turn, or after the game.
  if (!(b.first === null || run.over || run.toMove === 'you')) return false;
  if (mode !== 'streak') return true;
  // The streak is the list of won games: each a win against the perfect
  // opponent, each from a board new after the one before. A loss empties it
  // and a practice game (not fresh) never adds to it; a fresh win is its last entry.
  if (!integer(b.streak) || !Array.isArray(b.won) || b.won.length !== b.streak || b.streak > q.streak || typeof b.fresh !== 'boolean') return false;
  for (const [i, game] of b.won.entries()) {
    if (!wonGame(game, game.start) || !inPool(q, game.start)) return false;
    if (i && canonical(game.start) === canonical(b.won[i - 1].start)) return false;
  }
  const last = b.won.at(-1);
  if (run.winner === 'opponent' && b.won.length) return false;
  if (!b.fresh && b.won.length) return false;
  if (run.winner === 'you' && b.fresh) return Boolean(last) && sameGame(last, b);
  if (b.streak === q.streak) return false;
  return !last || canonical(last.start) !== canonical(b.start);
}
function gameSolved(p, b) {
  const q = p.parameters;
  if (!gameValid(p, b)) return false;
  if (q.mode === 'streak') return b.streak >= q.streak;
  const run = replay(b);
  if (run.winner !== 'you') return false;
  if (q.mode === 'replies') return b.round === firstCuts(q.start).length - 1;
  if (q.mode === 'boards') return b.round === q.boards.length - 1;
  return true;
}
function gameFresh(p, random = Math.random) {
  const q = p.parameters;
  if (q.mode === 'replies') return roundBoard(q, 0);
  if (q.mode === 'boards') return boardsBoard(q, 0);
  if (q.mode === 'duel') return {start: [...q.start], pos: [...q.start], colour: q.colour, first: 'you', turns: []};
  const start = drawStart(q, random);
  return {start, pos: [...start], claim: null, colour: null, first: null, turns: [], streak: 0, won: [], fresh: true};
}
// My cut, if it is my turn.
function reply(b, random) {
  const run = replay(b);
  if (!run || run.over || run.toMove !== 'opponent') return;
  const m = opponentMove(run.pos, other(b.colour), random);
  b.turns.push({player: 'opponent', ...m});
  b.pos = after(run.pos, m);
}
function settle(q, b) {
  if (q.mode !== 'streak') return;
  const run = replay(b);
  if (!run?.over) return;
  if (run.winner === 'you') { if (b.fresh) { b.won.push(clone(gameOf(b))); b.streak = b.won.length; } return; }
  b.streak = 0; b.won = [];
}
const cutOf = action => ({stalk: index(action.stalk), at: index(action.at)});
function gameMove(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!gameValid(p, b) || gameSolved(p, b) || !object(action)) return null;
  const next = clone(b), run = replay(b);
  if (action.type === 'claim') {
    if (!['boards', 'streak'].includes(q.mode) || b.claim !== null || ![...COLOURS, 'second'].includes(action.claim)) return null;
    const given = pick(assignments(b.start, action.claim), random);
    Object.assign(next, {claim: action.claim, colour: given.colour, first: given.first});
    reply(next, random);
    settle(q, next);
    return next;
  }
  if (action.type === 'cut') {
    const m = cutOf(action);
    if (b.first === null || run.over || run.toMove !== 'you' || !legal(b.pos, b.colour, m)) return null;
    next.turns.push({player: 'you', ...m});
    next.pos = after(b.pos, m);
    reply(next, random);
    settle(q, next);
    return next;
  }
  if (q.mode === 'replies' && run.over) {
    if (action.type === 'next' && run.winner === 'you') return roundBoard(q, b.round + 1, [...b.won, gameOf(b)]);
    if (action.type === 'again' && run.winner === 'opponent') return roundBoard(q, b.round, b.won);
    return null;
  }
  if (q.mode === 'boards' && b.first !== null && run.over) {
    if (action.type === 'next' && run.winner === 'you') return boardsBoard(q, b.round + 1, [...b.won, gameOf(b)]);
    if (action.type === 'again' && run.winner === 'opponent') return boardsBoard(q, b.round, b.won);
    return null;
  }
  if (q.mode === 'streak' && (action.type === 'new' || action.type === 'again') && b.first !== null && run.over) {
    if (action.type === 'again' && run.winner !== 'opponent') return null;
    const start = action.type === 'new' ? drawStart(q, random, b.start) : [...b.start];
    return {start, pos: [...start], claim: null, colour: null, first: null, turns: [], streak: b.streak, won: clone(b.won), fresh: action.type === 'new'};
  }
  return null;
}
// The best next action from any board, for the validator and the tests.
export function gameSolve(p, b) {
  const q = p.parameters, run = replay(b);
  if (b.first === null) return {type: 'claim', claim: bestClaim(b.start)};
  if (run.over) return q.mode === 'streak' ? {type: 'new'} : {type: run.winner === 'you' ? 'next' : 'again'};
  return {type: 'cut', ...(winningMoves(b.pos, b.colour)[0] || moves(b.pos, b.colour)[0])};
}
// Hints. In a duel, every reply and boards they point toward a winning cut
// without naming it (from the second press its stalk is ringed), and Apply
// hint makes it; after a losing cut a duel says, only behind Hint, that I can
// now always win, and Undo goes back. Boards' hints can also make the choice.
// Rounds are evidence: their hints show the authored nudges by level and
// never say what to choose.
const CUT_HINT = 'Some cut wins from here. What would you like to leave me?';
function gameHint(p, b) {
  const q = p.parameters;
  if (!gameValid(p, b)) return {type: 'deadend', text: 'Restart to set the stalks up again.'};
  if (gameSolved(p, b)) return {type: 'done'};
  const run = replay(b);
  if (q.mode === 'streak') return b.first !== null && run.over && run.winner === 'you' ? {type: 'move', action: {type: 'new'}, text: 'Try a new board.'} : {type: 'note'};
  if (b.first === null) return {type: 'move', action: {type: 'claim', claim: bestClaim(b.start)}, text: 'Which choice wins here, whatever I do?'};
  if (run.over) {
    if (q.mode === 'replies') return run.winner === 'you' ? {type: 'move', action: {type: 'next'}, text: 'Try my next first cut.'} : {type: 'move', action: {type: 'again'}, text: 'Play this first cut again.'};
    if (q.mode === 'boards') return run.winner === 'you' ? {type: 'move', action: {type: 'next'}, text: 'Go on to the next board.'} : {type: 'move', action: {type: 'again'}, text: 'Try this board again.'};
    return {type: 'deadend', text: 'Undo or restart to try again.'};
  }
  const win = winningMoves(b.pos, b.colour)[0];
  if (win) return {type: 'move', action: {type: 'cut', ...win}, text: CUT_HINT};
  if (q.mode !== 'duel') return {type: 'move', action: {type: 'cut', ...moves(b.pos, b.colour)[0]}, text: 'From here I can always win. Finish this game, then Try again.'};
  return {type: 'deadend', quiet: true, text: 'From here I can always win. Undo your last turn and try a different cut.'};
}
function gameRender(p, a) {
  const q = p.parameters, b = a.board, done = gameSolved(p, b), run = replay(b) || {pos: b.pos, over: false, toMove: null, winner: null};
  const yourTurn = b.first !== null && !run.over && run.toMove === 'you' && !done;
  const hinted = yourTurn && q.mode !== 'streak' && a.hintLevel >= 2 ? (winningMoves(b.pos, b.colour)[0]?.stalk ?? -1) : -1;
  const board = stalksHTML(b.pos, {live: yourTurn ? b.colour : null, fallen: fallenOf(b), hinted, tall: tallest(q)});
  const claimHint = q.mode === 'boards' && b.first === null && a.hintLevel >= 2 ? bestClaim(b.start) : null;
  let controls = '';
  if (!done && b.first === null) controls = ['B', 'R', 'second'].map(c => button(c === 'second' ? 'Go second' : `<span class="hb-swatch ${c}" aria-hidden="true"></span>${TITLE[c]}`, {type: 'claim', claim: c}, `secondary hb-claim${c === 'second' ? '' : ` ${c}`}`, true, claimHint === c)).join('');
  else if (!done && run.over && q.mode === 'streak') controls = `${run.winner === 'opponent' ? button('Same board again', {type: 'again'}, 'secondary') : ''}${button('New board', {type: 'new'}, 'primary')}`;
  else if (!done && run.over && q.mode === 'replies') controls = run.winner === 'you' ? button('Next first cut', {type: 'next'}, 'primary') : button('Try again', {type: 'again'}, 'primary');
  else if (!done && run.over && q.mode === 'boards') controls = run.winner === 'you' ? button('Next board', {type: 'next'}, 'primary') : button('Try again', {type: 'again'}, 'primary');
  let status = b.first === null ? '' : gameStatus(run);
  if (q.mode === 'streak' && run.over && run.winner === 'you' && !b.fresh) status += ' Wins count from a new board.';
  const won = run.winner === 'you' ? 1 : 0;
  const bar = q.mode === 'streak' ? pips(q.streak, b.streak, 'wins in a row')
    : q.mode === 'replies' ? pips(firstCuts(q.start).length, b.round + won, 'first cuts answered')
    : q.mode === 'boards' ? pips(q.boards.length, b.round + won, 'boards won') : '';
  return `<div class="hb-puzzle" data-mechanic-wire="stalks">
    <div class="hb-roundbar"><p class="hb-status" role="status" tabindex="-1" data-focus="hb-status">${esc(status)}</p>${b.colour ? key(b.colour) : ''}${bar}</div>
    ${board}
    <div class="hb-actions">${controls}</div>
  </div>`;
}
// A tap on a segment that is not the child's to cut (the other colour, a
// stalk of the given board while building, or any segment before a choice)
// is reported as not allowed.
function wireStalks(root, p, api) {
  root.addEventListener('click', event => {
    const seg = event.target.closest('span.hb-seg[data-s]');
    if (!seg || !root.contains(seg) || !api.attempt()) return;
    api.apply({type: 'cut', stalk: Number(seg.dataset.s), at: Number(seg.dataset.k)});
  });
}

// --- Building a balance (mechanic `stalkbuild`) ---------------------------------------------
// The given stalks stand on the left and q.slots empty spots on the right,
// each holding up to q.height segments. The save: what is built in each spot,
// the play-out of a Check that failed (null otherwise), whether this board
// has been checked (Check waits for a change), and done. A play-out is played
// to the end and leaves the built stalks as they were.
export const buildBoard = (q, built) => [...q.given, ...built];
function playOf(q, b) {
  return b.play && {start: buildBoard(q, b.built), colour: b.play.colour, first: b.play.first, turns: b.play.turns};
}
function buildValid(p, b) {
  const q = p.parameters;
  if (!keysAre(b, ['built', 'play', 'checked', 'done']) || typeof b.checked !== 'boolean' || typeof b.done !== 'boolean') return false;
  if (!Array.isArray(b.built) || b.built.length !== q.slots || !b.built.every(s => isStalk(s) && s.length <= q.height)) return false;
  const board = buildBoard(q, b.built), even = balances(board);
  if (b.done) return even && b.play === null && !b.checked;
  if (b.checked && even) return false;
  if (b.play === null) return true;
  // A failed Check's play-out: I play the colour that wins going first, and go first.
  if (!b.checked || !keysAre(b.play, ['colour', 'first', 'turns']) || b.play.first !== 'opponent') return false;
  if (!assignments(board, 'second').some(x => x.colour === b.play.colour)) return false;
  const run = replay(playOf(q, b));
  return Boolean(run) && (run.over || run.toMove === 'you');
}
const buildSolved = (p, b) => buildValid(p, b) && b.done;
// Undo takes back an add, a take-off, a Check or a cut in its play-out, one
// at a time. Check waits for a change, so Undo back to the same built stalks
// keeps it off, as Back does.
const buildCarry = (p, from, to) => from.checked && !to.checked && !to.done && from.built.join() === to.built.join() ? {...to, checked: true} : to;
const buildFresh = p => ({built: Array.from({length: p.parameters.slots}, () => ''), play: null, checked: false, done: false});
function buildMove(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!buildValid(p, b) || b.done || !object(action)) return null;
  const next = clone(b);
  if (b.play) {
    const game = playOf(q, b), run = replay(game);
    if (action.type === 'back') { if (!run.over) return null; next.play = null; return next; }
    if (action.type !== 'cut' || run.over || run.toMove !== 'you') return null;
    const m = cutOf(action);
    if (!legal(run.pos, game.colour, m)) return null;
    next.play.turns.push({player: 'you', ...m});
    const after2 = replay(playOf(q, next));
    if (!after2.over) {
      const mine = opponentMove(after2.pos, other(game.colour), random);
      next.play.turns.push({player: 'opponent', ...mine});
    }
    return next;
  }
  if (action.type === 'add') {
    const slot = index(action.slot);
    if (!integer(slot) || slot < 0 || slot >= q.slots || !COLOURS.includes(action.colour) || b.built[slot].length >= q.height) return null;
    next.built[slot] += action.colour;
    next.checked = false;
    return next;
  }
  if (action.type === 'cut') {
    const m = cutOf(action), slot = m.stalk - q.given.length;
    if (!integer(slot) || slot < 0 || slot >= q.slots || !integer(m.at) || m.at < 0 || m.at >= b.built[slot].length) return null;
    next.built[slot] = b.built[slot].slice(0, m.at);
    next.checked = false;
    return next;
  }
  if (action.type === 'check') {
    if (b.checked) return null;
    const board = buildBoard(q, b.built);
    if (balances(board)) { next.done = true; return next; }
    next.checked = true;
    next.play = {colour: pick(assignments(board, 'second'), random).colour, first: 'opponent', turns: []};
    next.play.turns.push({player: 'opponent', ...opponentMove(board, other(next.play.colour), random)});
    return next;
  }
  return null;
}
// Every way to fill the spots (in any order) that balances the board, by the
// stalks' numbers. Used only to steer hints toward the nearest balance.
const targets = new Map();
export function balancingBuilds(q) {
  const key = JSON.stringify([q.given, q.slots, q.height]);
  if (targets.has(key)) return targets.get(key);
  const stalks = [''];
  for (let n = 1; n <= q.height; n++) for (let code = 0; code < 2 ** n; code++) stalks.push(Array.from({length: n}, (_, i) => (code >> (n - 1 - i)) & 1 ? 'R' : 'B').join(''));
  const need = -value(q.given), out = [];
  (function build(from, chosen) {
    if (chosen.length === q.slots) { if (value(chosen) === need) out.push(chosen); return; }
    for (let i = from; i < stalks.length; i++) build(i, [...chosen, stalks[i]]);
  })(0, []);
  targets.set(key, out);
  return out;
}
// Taps to turn stalk a into stalk b: one cut takes off everything above
// their common start, then one tap a segment. A cut weighs a little more, so
// among balances equally near, the hint keeps what the child built.
const prefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const taps = (a, b) => { const k = prefix(a, b); return (a.length > k ? 1.5 : 0) + b.length - k; };
const permutations = list => list.length <= 1 ? [list] : list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest]));
// The next step toward the balancing build fewest taps away.
export function buildStep(q, built) {
  let best = null, cost = Infinity;
  for (const target of balancingBuilds(q)) for (const order of permutations([...target].sort((x, y) => (x === '') - (y === '')))) {
    const c = order.reduce((n, s, i) => n + taps(built[i], s), 0);
    if (c < cost) { cost = c; best = order; }
  }
  if (!best || cost === 0) return null;
  const slot = best.findIndex((s, i) => s !== built[i]), have = built[slot], want = best[slot], k = prefix(have, want);
  return have.length > k ? {type: 'cut', stalk: q.given.length + slot, at: k} : {type: 'add', slot, colour: want[k]};
}
// Hints move toward the nearest balance: take off what does not fit, add what
// is missing, then Check. The child sees the puzzle's first authored hint
// before any tap; its second and third are for grown-ups (the notes list them).
export function buildHint(p, b) {
  const q = p.parameters;
  if (!buildValid(p, b)) return {type: 'deadend', text: 'Restart to clear the spots.'};
  if (b.done) return {type: 'done'};
  if (b.play) {
    const game = playOf(q, b), run = replay(game);
    if (!run.over) return {type: 'move', action: {type: 'cut', ...moves(run.pos, game.colour)[0]}, text: 'From here I can always win. Make any cut.'};
    return {type: 'move', action: {type: 'back'}, text: 'Go back to your board.'};
  }
  const step = balances(buildBoard(q, b.built)) ? null : buildStep(q, b.built);
  if (!step) return {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
  if (step.type === 'cut') return {type: 'move', action: step, text: 'Take off the ringed segment and everything above it.'};
  return {type: 'move', action: step, text: `Add a ${NAME[step.colour]} segment to the ringed spot.`};
}
function buildRender(p, a) {
  const q = p.parameters, b = a.board, done = b.done;
  const shown = a.hintLevel >= 2 && !done && !b.play ? buildHint(p, b) : null, act = shown?.type === 'move' ? shown.action : null;
  if (!b.play) {
    const board = stalksHTML(buildBoard(q, b.built), {
      given: q.given.length, tall: tallest(q), label: 'Stalks and spots',
      build: done ? null : {height: q.height, hinted: act?.type === 'add' ? act : null},
      ring: act?.type === 'cut' ? act : null, hinted: act?.type === 'add' ? q.given.length + act.slot : -1
    });
    const tools = done ? '' : button('Check', {type: 'check'}, 'primary', !b.checked, act?.type === 'check');
    return `<div class="hb-puzzle build" data-mechanic-wire="stalkbuild">${board}<div class="hb-actions">${tools}</div></div>`;
  }
  const game = playOf(q, b), run = replay(game), yourTurn = !run.over && run.toMove === 'you';
  const status = run.over ? gameStatus(run) : `<span class="hb-label">I can win going first.</span> ${esc(gameStatus(run))}`;
  return `<div class="hb-puzzle build" data-mechanic-wire="stalkbuild">
    <div class="hb-roundbar"><p class="hb-status" role="status" tabindex="-1" data-focus="hb-status">${run.over ? esc(status) : status}</p>${key(game.colour)}</div>
    ${stalksHTML(run.pos, {live: yourTurn ? game.colour : null, fallen: fallenOf(game), given: q.given.length, tall: tallest(q), label: 'Stalks'})}
    <div class="hb-actions">${run.over ? button('Back', {type: 'back'}, 'primary') : ''}</div>
  </div>`;
}

export const hackenbushMechanics = {
  stalks: {
    fresh: gameFresh,
    valid: gameValid,
    solved: gameSolved,
    move: gameMove,
    hint: gameHint,
    solve: gameSolve,
    render: gameRender,
    wire: wireStalks,
    noUndo: p => p.parameters.mode !== 'duel'
  },
  stalkbuild: {
    fresh: buildFresh,
    valid: buildValid,
    solved: buildSolved,
    move: buildMove,
    hint: buildHint,
    render: buildRender,
    wire: wireStalks,
    carry: buildCarry
  }
};

// The family seam entry (dist/families.js). The puzzles join Pebble Duel as
// the Stalks group, so the module adds no satchel family of its own.
export default {
  id: 'hackenbush',
  mechanics: hackenbushMechanics,
  pack: new URL('./hackenbush.json', import.meta.url).href,
  css: new URL('./hackenbush.css', import.meta.url).href,
  // Segments and spots first, then the controls; the status line only when
  // the board has no control left (a lost duel).
  focus: ':is([data-mechanic-wire="stalks"],[data-mechanic-wire="stalkbuild"]) :is(button.hb-seg,button.hb-add:not(:disabled),.hb-actions button:not(:disabled)),:is([data-mechanic-wire="stalks"],[data-mechanic-wire="stalkbuild"]):not(:has(button:not(:disabled))) .hb-status'
};
