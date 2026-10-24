// The rook race and its relatives (worksheet Week 8), two groups inside Pebble
// Duel. A token sits on a square board with a star in the bottom-left corner.
// A turn slides the token straight left or straight down, one or more squares
// (a queen may also slide diagonally down and to the left), and whoever moves
// it onto the star wins. Square (x, y), x columns right of the star and y rows
// up, is the two-pile game with piles x and y, so the squares where the player
// to move loses are the diagonal; with the queen's move they are Wythoff's
// pairs (1, 2), (3, 5), (4, 7), (6, 10), … and their mirror images.
//
// Race to the star (mechanic `rookrace`): choose who starts, then win against
// perfect play, three games in a row from new squares. Every start (mechanic
// `everystart`): mark every square, or keep every three-pile start, where you
// would rather go second, and claim That's all; a kept start that is wrong is
// played out, the app going first and winning. Design notes and sources:
// docs/rookrace/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const keysAre = (value, keys) => object(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
export const MAX_SIZE = 12;
export const MAX_PILE = 9;
export const STREAK = 3;
const LOST_KEPT = 8;

// --- Positions ---------------------------------------------------------------
// A game is {moves(s), size(s), key(s)} over positions s. Board positions are
// [x, y]; pile positions are arrays of pile sizes. The player with no move
// loses: on a board that is the star, which the other player just reached.
export function boardMoves(q, [x, y]) {
  const out = [];
  for (let i = x - 1; i >= 0; i--) out.push([i, y]);
  for (let j = y - 1; j >= 0; j--) out.push([x, j]);
  if (q.queen) for (let k = 1; k <= Math.min(x, y); k++) out.push([x - k, y - k]);
  return out;
}
export function pileMoves(piles) {
  const out = [];
  piles.forEach((size, i) => { for (let take = 1; take <= size; take++) out.push({pile: i + 1, take}); });
  return out;
}
export const afterTake = (piles, m) => piles.map((size, i) => i === m.pile - 1 ? size - m.take : size);

// Whether the player to move wins, by working back from the end. Boards fill a
// table in order of distance from the star; piles search with a memo (sorted,
// since the order of the piles does not matter).
const tables = new Map();
function boardTable(q) {
  const key = `${q.size}|${q.queen ? 'q' : 'r'}`;
  if (tables.has(key)) return tables.get(key);
  const n = q.size, lose = Array.from({length: n}, () => Array(n).fill(false));
  for (let d = 0; d <= 2 * (n - 1); d++) for (let x = Math.max(0, d - n + 1); x <= Math.min(d, n - 1); x++) {
    const y = d - x;
    lose[x][y] = boardMoves(q, [x, y]).every(([a, b]) => !lose[a][b]);
  }
  tables.set(key, lose);
  return lose;
}
export const squareWins = (q, s) => !boardTable(q)[s[0]][s[1]];
const pileMemo = new Map();
export function pilesWin(piles) {
  const key = [...piles].sort((a, b) => a - b).join(',');
  if (pileMemo.has(key)) return pileMemo.get(key);
  const result = pileMoves(piles).some(m => !pilesWin(afterTake(piles, m)));
  pileMemo.set(key, result);
  return result;
}

const boardGame = q => ({moves: s => boardMoves(q, s), wins: s => squareWins(q, s), size: s => s[0] + s[1]});
const pileGame = {moves: s => pileMoves(s).map(m => afterTake(s, m)), wins: pilesWin, size: s => s.reduce((a, b) => a + b, 0)};
// A perfect opponent: a winning move whenever there is one (any of them);
// otherwise a move that leaves the fewest winning replies, then the most to play.
function opponentPosition(game, s, random) {
  const options = game.moves(s), winning = options.filter(m => !game.wins(m));
  if (winning.length) return pick(winning, random);
  let best = [], score = Infinity;
  for (const m of options) {
    const sc = game.moves(m).filter(r => !game.wins(r)).length * 1000 - game.size(m);
    if (sc < score) { score = sc; best = [m]; } else if (sc === score) best.push(m);
  }
  return pick(best, random);
}
export const opponentSquare = (q, s, random = Math.random) => opponentPosition(boardGame(q), s, random);
export function opponentTake(piles, random = Math.random) {
  const to = opponentPosition(pileGame, piles, random), i = piles.findIndex((size, k) => size !== to[k]);
  return {pile: i + 1, take: piles[i] - to[i]};
}

// --- Squares and starts -----------------------------------------------------------
export const isSquare = (q, s) => Array.isArray(s) && s.length === 2 && s.every(v => integer(v) && v >= 0 && v < q.size);
const isStar = s => s[0] === 0 && s[1] === 0;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export const cellOf = (q, s) => s[1] * q.size + s[0];
export const squareOf = (q, cell) => [cell % q.size, Math.floor(cell / q.size)];
export function allSquares(q) {
  const out = [];
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (x || y) out.push([x, y]);
  return out;
}
// Squares where you would rather go second: the player to move loses.
export const secondSquares = q => allSquares(q).filter(s => !squareWins(q, s));
const legalTo = (q, from, to) => boardMoves(q, from).some(m => same(m, to));
// The opponent never misses a win: a saved opponent move from a winning square
// must reach a losing one. So a saved win by the child is a real certificate.
const perfectTo = (q, from, to) => !squareWins(q, from) || !squareWins(q, to);
const perfectTake = (from, to) => !pilesWin(from) || !pilesWin(to);
// Starts are drawn half from squares where the first player loses, so always
// choosing Go first fails. A new start differs from the last one when it can.
// On boards up to 5 by 5, a start one move from the star is not drawn: on 4 by
// 4 that is half the first-player squares, each won in one tap.
export const NEAR_UP_TO = 5;
export const oneMove = (q, s) => boardMoves(q, s).some(isStar);
export function drawSquare(q, random = Math.random, previous = null) {
  const losing = random() < .5;
  let pool = allSquares(q).filter(s => squareWins(q, s) !== losing && !(q.size <= NEAR_UP_TO && oneMove(q, s)));
  if (previous && pool.length > 1) pool = pool.filter(s => !same(s, previous));
  return [...pick(pool, random)];
}
// Three-pile starts with piles 1 to max, the order not mattering: sorted triples.
export function pileStarts(q) {
  const out = [];
  for (let a = 1; a <= q.max; a++) for (let b = a; b <= q.max; b++) for (let c = b; c <= q.max; c++) out.push([a, b, c]);
  return out;
}
export const secondStarts = q => pileStarts(q).filter(s => !pilesWin(s));
export const keyOf = piles => [...piles].sort((a, b) => a - b).join(',');
const startOfKey = key => key.split(',').map(Number);
const pileWords = piles => `${piles.slice(0, -1).join(', ')} and ${piles.at(-1)}`;

// --- Words --------------------------------------------------------------------------
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
function stepWords(from, to) {
  const dx = from[0] - to[0], dy = from[1] - to[1];
  if (dx && dy) return `${dx} diagonally`;
  return dx ? `${dx} left` : `${dy} down`;
}
const PILE_NAMES = ['left', 'middle', 'right'];

// --- Race to the star ---------------------------------------------------------------
// The save: the start, where the token is, who went first, the turns (each a
// square reached), the streak, the games won in the streak so far (each its
// start, who went first and its turns), whether this start was new, and the
// starts the child lost after going first (most recent last), which a hint
// rings. The won games are the certificate: each is replayed against a perfect
// opponent, so a full streak cannot be saved without three real wins.
const raceOver = b => isStar(b.at);
const raceWinner = b => raceOver(b) ? b.turns.at(-1)?.player ?? null : null;
const isLost = (q, list) => Array.isArray(list) && list.length <= LOST_KEPT && list.every(s => isSquare(q, s) && !isStar(s)) && new Set(list.map(s => s.join())).size === list.length;
// One game replayed from its start: where the token is and who won, or null.
function replay(q, game) {
  if (!isSquare(q, game.start) || isStar(game.start) || ![null, 'you', 'opponent'].includes(game.first)) return null;
  if (!Array.isArray(game.turns) || game.turns.length > 2 * q.size || (game.first === null && game.turns.length)) return null;
  let at = game.start;
  for (const [i, t] of game.turns.entries()) {
    const expected = (i % 2 === 0) === (game.first === 'you') ? 'you' : 'opponent';
    if (!keysAre(t, ['player', 'to']) || t.player !== expected || !isSquare(q, t.to) || isStar(at) || !legalTo(q, at, t.to)) return null;
    if (t.player === 'opponent' && !perfectTo(q, at, t.to)) return null;
    at = t.to;
  }
  const over = isStar(at), toMove = game.turns.length % 2 === 0 ? game.first : game.first === 'you' ? 'opponent' : 'you';
  return {at, over, winner: over ? game.turns.at(-1).player : null, toMove};
}
const gameOf = b => ({start: b.start, first: b.first, turns: b.turns});
const sameGame = (a, b) => JSON.stringify(gameOf(a)) === JSON.stringify(gameOf(b));
function raceValid(p, b) {
  const q = p.parameters;
  if (!keysAre(b, ['start', 'at', 'first', 'turns', 'streak', 'won', 'fresh', 'lost'])) return false;
  if (!isSquare(q, b.at) || typeof b.fresh !== 'boolean' || !isLost(q, b.lost)) return false;
  const run = replay(q, b);
  if (!run || !same(run.at, b.at)) return false;
  // Saves land before the choice, on the child's turn, or after the game.
  if (!(b.first === null || run.over || run.toMove === 'you')) return false;
  // The streak is the list of won games: each a fresh win against the perfect
  // opponent, each from a start new after the one before. A loss empties it and
  // a practice game (not fresh) never adds to it; a fresh win is its last entry.
  if (!integer(b.streak) || !Array.isArray(b.won) || b.won.length !== b.streak || b.streak > q.streak) return false;
  for (const [i, game] of b.won.entries()) {
    if (!keysAre(game, ['start', 'first', 'turns'])) return false;
    const r = replay(q, game);
    if (!r || r.winner !== 'you' || (i && same(game.start, b.won[i - 1].start))) return false;
  }
  const last = b.won.at(-1);
  if (run.winner === 'opponent' && b.won.length) return false;
  if (!b.fresh && b.won.length) return false;
  if (run.winner === 'you' && b.fresh) return Boolean(last) && sameGame(last, b);
  if (b.streak === q.streak) return false;
  return !last || !same(last.start, b.start);
}
const raceSolved = (p, b) => raceValid(p, b) && b.streak >= p.parameters.streak;
function raceFresh(p, random = Math.random) {
  const start = drawSquare(p.parameters, random);
  return {start, at: [...start], first: null, turns: [], streak: 0, won: [], fresh: true, lost: []};
}
function raceReply(q, b, random) {
  if (raceOver(b)) return;
  const to = opponentSquare(q, b.at, random);
  b.turns.push({player: 'opponent', to});
  b.at = to;
}
function raceSettle(q, b) {
  if (!raceOver(b)) return;
  if (raceWinner(b) === 'you') {
    if (b.fresh) { b.won.push(clone(gameOf(b))); b.streak = b.won.length; }
    return;
  }
  b.streak = 0; b.won = [];
  if (b.first === 'you') b.lost = [...b.lost.filter(s => !same(s, b.start)), [...b.start]].slice(-LOST_KEPT);
}
function raceMove(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!raceValid(p, b) || b.streak >= q.streak || !object(action)) return null;
  const next = clone(b);
  if (action.type === 'choose') {
    if (b.first !== null || !['you', 'opponent'].includes(action.first)) return null;
    next.first = action.first;
    if (next.first === 'opponent') { raceReply(q, next, random); raceSettle(q, next); }
    return next;
  }
  if (action.type === 'move') {
    const to = Array.isArray(action.to) ? action.to.map(index) : null;
    if (b.first === null || raceOver(b) || !isSquare(q, to) || !legalTo(q, b.at, to)) return null;
    next.turns.push({player: 'you', to});
    next.at = to;
    raceReply(q, next, random);
    raceSettle(q, next);
    return next;
  }
  if ((action.type === 'new' || action.type === 'again') && b.first !== null && raceOver(b)) {
    if (action.type === 'again' && raceWinner(b) !== 'opponent') return null;
    const start = action.type === 'new' ? drawSquare(q, random, b.start) : [...b.start];
    return {start, at: [...start], first: null, turns: [], streak: b.streak, won: clone(b.won), fresh: action.type === 'new', lost: b.lost.map(s => [...s])};
  }
  return null;
}
// Choose-who-starts rounds are evidence: hints show the authored nudges by
// level and never say who should start. raceSolve is for the validator and tests.
function raceHint(p, b) {
  if (!raceValid(p, b)) return {type: 'deadend', text: 'Restart the race.'};
  if (b.streak >= p.parameters.streak) return {type: 'done'};
  // After a loss the nudges stay, since the first suggests Same start again.
  if (b.first !== null && raceOver(b) && raceWinner(b) === 'you') return {type: 'move', action: {type: 'new'}, text: 'Try a new start.'};
  return {type: 'note'};
}
export function raceSolve(p, b) {
  const q = p.parameters;
  if (b.first === null) return {type: 'choose', first: squareWins(q, b.at) ? 'you' : 'opponent'};
  if (raceOver(b)) return {type: 'new'};
  const to = boardMoves(q, b.at).find(m => !squareWins(q, m)) || boardMoves(q, b.at)[0];
  return {type: 'move', to};
}

// --- Drawing a board ------------------------------------------------------------------
const STAR = '<svg class="rr-star" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-10 2.9-3.1 10.5-3.1 4.3 1.6 6.5 9 0 4.6-6.5 9-4.3 1.6-10.5-3.1-2.9-3.1Z"/></svg>';
// How the token moves, drawn once beside the board: a token in a corner of a
// small grid with an arrow for each direction it may slide.
function moveKey(q) {
  const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#rr-head-${q.queen ? 'q' : 'r'})"/>`;
  return `<svg class="rr-key" viewBox="0 0 40 40" role="img" aria-label="${q.queen ? 'The token slides left, down, or diagonally down and to the left' : 'The token slides left or down'}"><defs><marker id="rr-head-${q.queen ? 'q' : 'r'}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6Z"/></marker></defs><path class="rr-key-grid" d="M2 2H38V38H2ZM14 2V38M26 2V38M2 14H38M2 26H38"/><g class="rr-key-arrows">${arrow(25, 8, 5, 8)}${arrow(32, 15, 32, 35)}${q.queen ? arrow(27, 13, 7, 33) : ''}</g><circle class="rr-key-token" cx="32" cy="8" r="4.2"/></svg>`;
}
const moveButton = (label, action, cls, extra = '') => `<button type="button" class="${cls} rr-button" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="rr-${esc(action.type)}${action.first ? `-${action.first}` : ''}" ${extra}>${label}</button>`;
const pips = (n, on) => `<span class="rr-pips" role="img" aria-label="${on} of ${n} wins in a row">${Array.from({length: n}, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;
// One cell. `look` holds the classes; a cell that is a legal move (or a mark to
// toggle) is a button carrying its action; the others are plain squares that
// a tap reports as not allowed (see wire).
function cell(q, s, look) {
  const {cls = [], action = null, label = '', pressed = null, content = ''} = look;
  const at = `data-x="${s[0]}" data-y="${s[1]}"`;
  const classes = ['rr-cell', ...cls, (s[0] + s[1]) % 2 ? 'odd' : 'even'].join(' ');
  if (action) return `<button type="button" class="${classes}" ${at} data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="rr-cell-${s[0]}-${s[1]}" aria-label="${esc(label)}"${pressed === null ? '' : ` aria-pressed="${pressed}"`}>${content}</button>`;
  return `<span class="${classes}" ${at} role="img" aria-label="${esc(label)}">${content}</span>`;
}
// The board, top row first. `token` is the token's square or null; `from` the
// square the opponent just left; `rings` squares to ring in ochre; `marks` the
// marked cells (live: tappable); `pick` makes every square a start to choose.
function boardHTML(q, {token = null, from = null, targets = [], rings = [], marks = null, pick = false, flag = null, hinted = null, live = false, label}) {
  const rows = [];
  for (let y = q.size - 1; y >= 0; y--) for (let x = 0; x < q.size; x++) {
    const s = [x, y], cls = [];
    const isToken = token && same(s, token), target = targets.some(t => same(t, s));
    if (isStar(s)) {
      // The star is a square like the others: a legal move onto it is a button.
      const content = STAR + (isToken ? '<span class="rr-token" aria-hidden="true"></span>' : target ? '<span class="rr-dot" aria-hidden="true"></span>' : '');
      if (target && token) rows.push(cell(q, s, {cls: ['star', 'target'], content, action: {type: 'move', to: s}, label: `Move ${stepWords(token, s)}, onto the star`}));
      else rows.push(cell(q, s, {cls: ['star'], content, label: isToken ? 'Star, with the token' : 'Star'}));
      continue;
    }
    if (isToken) cls.push('token');
    if (from && same(s, from)) cls.push('from');
    if (rings.some(t => same(t, s))) cls.push('lost');
    if (flag && same(s, flag)) cls.push('flag');
    if (hinted && same(s, hinted)) cls.push('hinted');
    const content = isToken ? '<span class="rr-token" aria-hidden="true"></span>' : target ? '<span class="rr-dot" aria-hidden="true"></span>' : '';
    if (pick) {
      // A practice game on a board: tap the square to start from.
      rows.push(cell(q, s, {cls, content, action: {type: 'start', cell: cellOf(q, s)}, pressed: Boolean(isToken), label: `${s[0]} right, ${s[1]} up`}));
      continue;
    }
    if (marks) {
      const on = marks.has(cellOf(q, s));
      if (on) cls.push('marked');
      rows.push(cell(q, s, {cls, content, action: live ? {type: 'mark', cell: cellOf(q, s)} : null, pressed: live ? on : null, label: `${s[0]} right, ${s[1]} up${on ? ', marked' : ''}`}));
      continue;
    }
    if (target && token) rows.push(cell(q, s, {cls: [...cls, 'target'], content, action: {type: 'move', to: s}, label: `Move ${stepWords(token, s)}`}));
    else rows.push(cell(q, s, {cls, content, label: isToken ? `Token, ${s[0]} right and ${s[1]} up from the star` : `${s[0]} right, ${s[1]} up`}));
  }
  return `<div class="rr-board${q.queen ? ' queen' : ''}" role="group" aria-label="${esc(label)}" style="--n:${q.size}">${rows.join('')}</div>`;
}
// What the last turn did, in one line.
function raceStatus(b) {
  if (b.first === null) return '';
  const last = b.turns.at(-1), before = b.turns.length > 1 ? b.turns.at(-2).to : b.start;
  if (raceOver(b)) return raceWinner(b) === 'you' ? (b.fresh ? 'You reached the star.' : 'You reached the star. Wins count from a new start.') : `I moved ${stepWords(before, b.at)} and reached the star.`;
  return `${last?.player === 'opponent' ? `I moved ${stepWords(before, b.at)}. ` : ''}Your turn`;
}
function raceRender(p, a) {
  const q = p.parameters, b = a.board, done = b.streak >= q.streak, over = raceOver(b), yourTurn = b.first !== null && !over && !done;
  const last = b.turns.at(-1), from = last?.player === 'opponent' ? (b.turns.length > 1 ? b.turns.at(-2).to : b.start) : null;
  const board = boardHTML(q, {token: b.at, from, targets: yourTurn ? boardMoves(q, b.at) : [], rings: a.hintLevel >= 2 && !done ? b.lost : [], label: `Board, ${q.size} by ${q.size}, star in the bottom-left corner`});
  const actions = done ? '' : b.first === null
    ? `${moveButton('Go first', {type: 'choose', first: 'you'}, 'secondary')}${moveButton('Go second', {type: 'choose', first: 'opponent'}, 'secondary')}`
    : over ? `${raceWinner(b) === 'opponent' ? moveButton('Same start again', {type: 'again'}, 'secondary') : ''}${moveButton('New start', {type: 'new'}, 'primary')}` : '';
  return `<div class="rr-puzzle" data-mechanic-wire="rookrace">
    <div class="rr-roundbar">${moveKey(q)}<p class="rr-status" role="status" tabindex="-1" data-focus="rr-status">${esc(raceStatus(b))}</p>${pips(q.streak, b.streak)}</div>
    ${board}
    <div class="rr-actions">${actions}</div>
  </div>`;
}
// A tap on a square that is not a legal move is reported, as the worksheet's
// launch does with a diagonal on purpose: the app answers "not allowed".
function wireBoard(root, p, api) {
  root.addEventListener('click', event => {
    const square = event.target.closest('span.rr-cell[data-x]');
    if (!square || !root.contains(square)) return;
    const b = api.attempt()?.board;
    if (!b) return;
    const to = [Number(square.dataset.x), Number(square.dataset.y)];
    if (p.mechanic === 'rookrace' && b.first !== null && !raceOver(b)) api.apply({type: 'move', to});
    if (p.mechanic === 'everystart' && b.play && !playOver(p.parameters, b)) api.apply({type: 'move', to});
  });
}

// --- Every start ------------------------------------------------------------------
// Boards: the marks (cells, ascending). Piles: the start being built, the shelf
// (sorted keys such as "1,2,3", in order), and "Already on the shelf.". Both:
// That's all's verdict ({more} says one is missing; {wrong} names the first
// kept start the first player can win from, given only when none is missing
// unless the puzzle has a single answer; see judge), a game
// being played, and done. A game
// is a practice try (from the start being built, or from a tapped square; the
// child chooses who starts) or the play-out of a wrong That's all: I go first
// from the wrong start and win, and when that game ends the marks or the shelf
// are cleared, since a final choice is final. "There is another." only waits
// for a change.
const pilesKind = q => q.kind === 'piles';
const answersOf = q => pilesKind(q) ? secondStarts(q).map(keyOf) : secondSquares(q).map(s => cellOf(q, s));
const order = (q, list) => pilesKind(q) ? [...list].sort((a, b) => { const x = startOfKey(a), y = startOfKey(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }) : [...list].sort((a, b) => a - b);
const keptOf = (q, b) => pilesKind(q) ? b.shelf : b.marked;
const winsFrom = (q, candidate) => pilesKind(q) ? pilesWin(startOfKey(candidate)) : squareWins(q, squareOf(q, candidate));
// That's all on this shelf: null (right), {more: true} or {wrong}. With more
// than one answer, whether anything is missing is asked first, so a That's all
// with a few marks says nothing about them; only a shelf holding every answer
// and something more has a wrong start named (and played out). Asked the other
// way round, one mark and That's all would be a cheap yes-or-no check on each
// start. With a single answer that same order is the cheap check (a wrong start
// alone would get "There is another."), so there a wrong start is looked for
// first: every wrong guess is a game I win going first, and "There is another."
// never comes.
export function judge(q, kept) {
  const answers = answersOf(q), wrong = order(q, kept).find(c => winsFrom(q, c));
  if (answers.length === 1 && wrong !== undefined) return {wrong};
  if (!answers.every(c => kept.includes(c))) return {more: true};
  return wrong === undefined ? null : {wrong};
}
const isCandidate = (q, c) => pilesKind(q) ? typeof c === 'string' && pileStarts(q).some(s => keyOf(s) === c) : integer(c) && c >= 0 && c < q.size * q.size && c !== 0;
const isOrdered = (q, list) => Array.isArray(list) && list.every((c, i) => isCandidate(q, c) && (!i || order(q, [list[i - 1], c])[0] === list[i - 1] && list[i - 1] !== c));
const isBuild = (q, build) => Array.isArray(build) && build.length === 3 && build.every(n => integer(n) && n >= 1 && n <= q.max);
const sameVerdict = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The game of a play, replayed from its start: where it stands and whose turn
// it is. A board try may still be choosing its start (start null).
function playState(q, b) {
  const play = b.play;
  if (!keysAre(play, ['kind', 'start', 'first', 'turns']) || !['try', 'out'].includes(play.kind) || ![null, 'you', 'opponent'].includes(play.first)) return null;
  if (!Array.isArray(play.turns) || play.turns.length > 64 || (play.first === null && play.turns.length)) return null;
  if (play.kind === 'out') {
    const wrong = b.refused?.wrong;
    if (play.first !== 'opponent' || wrong === undefined) return null;
    if (pilesKind(q) ? !(isBuild(q, play.start) && play.start.join() === wrong) : play.start !== wrong) return null;
  } else if (pilesKind(q)) {
    if (!isBuild(q, play.start) || play.start.join() !== b.build.join()) return null;
  } else if (play.start === null) {
    return play.first === null ? {at: null, over: false, toMove: null, winner: null} : null;
  } else if (!isCandidate(q, play.start)) return null;
  let at = pilesKind(q) ? [...play.start] : squareOf(q, play.start);
  for (const [i, t] of play.turns.entries()) {
    const expected = (i % 2 === 0) === (play.first === 'you') ? 'you' : 'opponent';
    if (pilesKind(q)) {
      if (!keysAre(t, ['player', 'pile', 'take']) || t.player !== expected || !integer(t.pile) || t.pile < 1 || t.pile > 3 || !integer(t.take) || t.take < 1 || t.take > at[t.pile - 1]) return null;
      const to = afterTake(at, t);
      if (t.player === 'opponent' && !perfectTake(at, to)) return null;
      at = to;
    } else {
      if (!keysAre(t, ['player', 'to']) || t.player !== expected || !isSquare(q, t.to) || !legalTo(q, at, t.to)) return null;
      if (t.player === 'opponent' && !perfectTo(q, at, t.to)) return null;
      at = t.to;
    }
  }
  const over = pilesKind(q) ? at.every(n => n === 0) : isStar(at);
  const toMove = play.turns.length % 2 === 0 ? play.first : play.first === 'you' ? 'opponent' : 'you';
  return {at, over, toMove, winner: over ? play.turns.at(-1)?.player ?? null : null};
}
const playOver = (q, b) => Boolean(b.play && playState(q, b)?.over);
function everyValid(p, b) {
  const q = p.parameters;
  const fields = pilesKind(q) ? ['build', 'shelf', 'told', 'refused', 'play', 'done'] : ['marked', 'refused', 'play', 'done'];
  if (!keysAre(b, fields) || typeof b.done !== 'boolean') return false;
  const kept = keptOf(q, b);
  if (!isOrdered(q, kept)) return false;
  if (pilesKind(q) && (!isBuild(q, b.build) || ![null, 'again'].includes(b.told) || (b.told === 'again' && !kept.includes(keyOf(b.build))))) return false;
  const run = b.play === null ? null : playState(q, b);
  if (b.play !== null && !run) return false;
  if (b.play?.kind === 'out') {
    // A wrong That's all: the play-out runs on the marks it judged, and when it
    // ends (I win, since I go first from a first-player start) they are cleared.
    if (!keysAre(b.refused, ['wrong']) || !isCandidate(q, b.refused.wrong) || !winsFrom(q, b.refused.wrong)) return false;
    if (run.over ? kept.length || run.winner !== 'opponent' : !kept.length || !sameVerdict(judge(q, kept), b.refused)) return false;
  } else if (b.refused !== null && !(kept.length && keysAre(b.refused, ['more']) && sameVerdict(judge(q, kept), b.refused))) return false;
  if (b.done && (b.play !== null || b.refused !== null || !kept.length || judge(q, kept) !== null)) return false;
  // Saves land before a choice, on the child's turn, or after a game.
  if (run && !(run.over || run.toMove === 'you' || b.play.first === null)) return false;
  return true;
}
const everySolved = (p, b) => everyValid(p, b) && b.done;
function everyFresh(p) {
  const q = p.parameters;
  return pilesKind(q) ? {build: [1, 1, 1], shelf: [], told: null, refused: null, play: null, done: false} : {marked: [], refused: null, play: null, done: false};
}
function playReply(q, b, random) {
  const run = playState(q, b);
  if (!run || run.over) return;
  if (pilesKind(q)) b.play.turns.push({player: 'opponent', ...opponentTake(run.at, random)});
  else b.play.turns.push({player: 'opponent', to: opponentSquare(q, run.at, random)});
}
// When the play-out of a wrong That's all ends, the marks or the shelf are cleared.
function settleOut(q, b) {
  if (b.play?.kind !== 'out' || !playState(q, b)?.over) return;
  if (pilesKind(q)) { b.shelf = []; b.told = null; } else b.marked = [];
}
function everyMove(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!everyValid(p, b) || b.done || !object(action)) return null;
  const next = clone(b);
  if (b.play) {
    const run = playState(q, b), out = b.play.kind === 'out';
    if (action.type === 'back') {
      // The play-out is played to the end; then Back returns to the cleared board.
      if (out && !run.over) return null;
      next.play = null;
      if (out) next.refused = null;
      return next;
    }
    if (action.type === 'start') {
      const c = index(action.cell);
      if (pilesKind(q) || out || b.play.first !== null || !isCandidate(q, c)) return null;
      next.play.start = c;
      return next;
    }
    if (action.type === 'choose') {
      if (out || b.play.first !== null || b.play.start === null || !['you', 'opponent'].includes(action.first)) return null;
      next.play.first = action.first;
      if (action.first === 'opponent') playReply(q, next, random);
      return next;
    }
    if (run.over || b.play.first === null) return null;
    if (pilesKind(q) && action.type === 'take') {
      const m = {pile: index(action.pile), take: index(action.take)};
      if (!integer(m.pile) || m.pile < 1 || m.pile > 3 || !integer(m.take) || m.take < 1 || m.take > run.at[m.pile - 1]) return null;
      next.play.turns.push({player: 'you', ...m});
    } else if (!pilesKind(q) && action.type === 'move') {
      const to = Array.isArray(action.to) ? action.to.map(index) : null;
      if (!isSquare(q, to) || !legalTo(q, run.at, to)) return null;
      next.play.turns.push({player: 'you', to});
    } else return null;
    playReply(q, next, random);
    settleOut(q, next);
    return next;
  }
  // That's all judges the whole shelf (see judge). A wrong start is played out
  // at once, I going first; a missing one is only "There is another.", until a
  // change.
  if (action.type === 'all') {
    const kept = keptOf(q, b);
    if (!kept.length || b.refused) return null;
    const verdict = judge(q, kept);
    if (pilesKind(q)) next.told = null;
    if (!verdict) { next.done = true; return next; }
    next.refused = verdict;
    if (verdict.wrong !== undefined) {
      next.play = {kind: 'out', start: pilesKind(q) ? startOfKey(verdict.wrong) : verdict.wrong, first: 'opponent', turns: []};
      playReply(q, next, random);
      settleOut(q, next);
    }
    return next;
  }
  if (action.type === 'try') {
    next.play = {kind: 'try', start: pilesKind(q) ? [...b.build] : null, first: null, turns: []};
    if (pilesKind(q)) next.told = null;
    return next;
  }
  if (!pilesKind(q)) {
    if (action.type !== 'mark') return null;
    const c = index(action.cell);
    if (!isCandidate(q, c)) return null;
    next.marked = next.marked.includes(c) ? next.marked.filter(x => x !== c) : order(q, [...next.marked, c]);
    next.refused = null;
    return next;
  }
  if (action.type === 'set') {
    const i = index(action.pile), n = index(action.n);
    if (!integer(i) || i < 0 || i > 2 || !integer(n) || n < 1 || n > q.max) return null;
    next.build[i] = n; next.told = null;
    return next;
  }
  if (action.type === 'keep') {
    const key = keyOf(b.build);
    if (b.shelf.includes(key)) { next.told = 'again'; return next; }
    next.shelf = order(q, [...b.shelf, key]); next.told = null; next.refused = null;
    return next;
  }
  if (action.type === 'drop') {
    if (!b.shelf.includes(action.key)) return null;
    next.shelf = b.shelf.filter(k => k !== action.key); next.told = null; next.refused = null;
    return next;
  }
  return null;
}
// Hints move toward the answer: take off a wrong mark or start, then add a
// missing one (on the piles, one pile at a time, then Keep), then That's all.
// The child sees the puzzle's first authored hint before any tap; its second
// and third are for grown-ups (How to play and the notes list them).
function permutations(t) {
  return [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(o => o.map(i => t[i]));
}
export function everyHint(p, b) {
  const q = p.parameters;
  if (!everyValid(p, b)) return {type: 'deadend', text: 'Restart to clear the board.'};
  if (b.done) return {type: 'done'};
  if (b.play) {
    const run = playState(q, b);
    if (b.play.kind === 'out' && !run.over) {
      const action = pilesKind(q) ? {type: 'take', ...pileMoves(run.at)[0]} : {type: 'move', to: boardMoves(q, run.at)[0]};
      return {type: 'move', action, text: 'From here I can always win. Make any move.'};
    }
    return {type: 'move', action: {type: 'back'}, text: pilesKind(q) ? 'Go back to the shelf.' : 'Go back to your marks.'};
  }
  const kept = keptOf(q, b), answers = answersOf(q);
  const wrong = order(q, kept).find(c => winsFrom(q, c));
  if (pilesKind(q)) {
    if (wrong !== undefined) return {type: 'move', action: {type: 'drop', key: wrong}, text: `Take ${pileWords(startOfKey(wrong))} off the shelf: whoever starts there can win.`};
    const missing = answers.find(c => !kept.includes(c));
    if (missing === undefined) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
    if (keyOf(b.build) === missing) return {type: 'move', action: {type: 'keep'}, text: 'Press Keep.'};
    const t = startOfKey(missing);
    const near = permutations(t).sort((x, y) => x.filter((n, i) => n !== b.build[i]).length - y.filter((n, i) => n !== b.build[i]).length)[0];
    const i = near.findIndex((n, k) => n !== b.build[k]);
    return {type: 'move', action: {type: 'set', pile: i, n: near[i]}, text: `Make the ${PILE_NAMES[i]} pile ${near[i]}.`};
  }
  if (wrong !== undefined) return {type: 'move', action: {type: 'mark', cell: wrong}, text: 'One marked square is a square where whoever starts can win. Take that mark off.'};
  const missing = answers.find(c => !kept.includes(c));
  if (missing === undefined) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  return {type: 'move', action: {type: 'mark', cell: missing}, text: 'There is another square where you would rather go second.'};
}

// --- Drawing Every start -----------------------------------------------------------
function pilePebbles(sizes, ghost, live, lifted) {
  return sizes.map((size, i) => {
    const shown = size + (ghost && ghost.pile === i + 1 ? ghost.take : 0);
    const pebbles = Array.from({length: shown}, (_, k) => {
      if (k >= size) return '<span class="es-pebble gone" aria-hidden="true"></span>';
      const take = size - k, up = lifted && lifted.pile === i + 1 && k >= lifted.from;
      return `<button type="button" class="es-pebble${up ? ' lift' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({pick: {pile: i + 1, from: k}}))}" data-focus="es-pebble-${i}-${k}" aria-label="Lift ${plural(take, 'pebble')} from the ${PILE_NAMES[i]} pile" aria-pressed="${Boolean(up)}" ${live ? '' : 'disabled'}></button>`;
    }).join('');
    return `<div class="es-bowl" role="group" aria-label="${PILE_NAMES[i]} pile, ${plural(size, 'pebble')}"><div class="es-pile">${pebbles}</div><span class="es-count" aria-hidden="true">${size}</span></div>`;
  }).join('');
}
const button = (label, action, cls, enabled = true, hinted = false, extra = '') => `<button type="button" class="${cls} es-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="es-${esc(action.type)}${action.first ? `-${action.first}` : ''}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
const BOARD_LABEL = q => `Board, ${q.size} by ${q.size}, star in the bottom-left corner`;
function playPanel(p, b, state, act) {
  const q = p.parameters, run = playState(q, b), play = b.play, last = play.turns.at(-1), out = play.kind === 'out';
  const picking = !pilesKind(q) && play.first === null;
  let status = '';
  if (picking) status = play.start === null ? 'Tap a square to start from.' : '';
  else if (play.first !== null && pilesKind(q)) {
    const took = last?.player === 'opponent' ? `I took ${last.take} from the ${PILE_NAMES[last.pile - 1]} pile. ` : '';
    status = run.over ? (run.winner === 'you' ? 'You took the last pebble.' : `${took}I took the last pebble.`) : `${took}Your turn`;
  } else if (play.first !== null) {
    const before = play.turns.length > 1 ? play.turns.at(-2).to : squareOf(q, play.start);
    // The end of a play-out keeps to one line (the dashed ring shows my last
    // move), so Back stays in view under the 11-by-11 board on a small phone.
    status = run.over ? (run.winner === 'you' ? 'You reached the star.' : out ? 'I reached the star.' : `I moved ${stepWords(before, run.at)} and reached the star.`) : `${last?.player === 'opponent' ? `I moved ${stepWords(before, run.at)}. ` : ''}Your turn`;
  }
  const yourTurn = play.first !== null && !run.over && run.toMove === 'you';
  const choose = play.first === null && play.start !== null ? `${button('Go first', {type: 'choose', first: 'you'}, 'secondary')}${button('Go second', {type: 'choose', first: 'opponent'}, 'secondary')}` : '';
  let field, controls = choose;
  if (pilesKind(q)) {
    const lifted = yourTurn && state.pick && state.pick.pile <= 3 && state.pick.from < run.at[state.pick.pile - 1] ? state.pick : null;
    if (!lifted) state.pick = null;
    field = `<div class="es-piles es-play-piles">${pilePebbles(run.at, last?.player === 'opponent' ? last : null, yourTurn, lifted)}</div>`;
    const takeCount = lifted ? run.at[lifted.pile - 1] - lifted.from : 0;
    if (lifted) controls = `${button(`Take ${takeCount}`, {type: 'take', pile: lifted.pile, take: takeCount}, 'primary')}<button type="button" class="secondary es-button" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({pick: null}))}" data-focus="es-cancel">Cancel</button>`;
  } else {
    const start = play.start === null ? null : squareOf(q, play.start);
    const before = last?.player === 'opponent' ? (play.turns.length > 1 ? play.turns.at(-2).to : start) : null;
    const hinted = act?.type === 'move' ? act.to : null;
    field = boardHTML(q, {token: picking ? start : run.at, from: before, flag: out ? start : null, pick: picking, hinted, targets: yourTurn ? boardMoves(q, run.at) : [], label: BOARD_LABEL(q)});
  }
  // The play-out of a wrong That's all cannot be left before it ends.
  const back = out && !run.over ? '' : button('Back', {type: 'back'}, run.over ? 'primary' : 'secondary');
  // When the play-out ends, one line says what happened, including the clearing.
  if (out && run.over) status += ` ${pilesKind(q) ? 'The shelf is' : 'The marks are'} cleared.`;
  // During a play-out, why I go first leads the same line as the turn, which
  // keeps the board's bottom row in view on a small phone.
  const opening = out && !run.over ? `<span class="es-label">${esc(`Whoever starts from ${pilesKind(q) ? pileWords(play.start) : 'the ringed square'} can win. I go first.`)}</span> ` : '';
  return `<p class="es-status" role="status" tabindex="-1" data-focus="es-status">${opening}${esc(status)}</p>${field}<div class="es-actions">${controls}${back}</div>`;
}
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null}); return uiState.get(p.id); };
function everyRender(p, a) {
  const q = p.parameters, b = a.board, done = b.done, state = ui(p);
  const shown = a.hintLevel >= 2 && !done ? everyHint(p, b) : null, act = shown?.type === 'move' ? shown.action : null;
  if (b.play) return `<div class="es-puzzle${pilesKind(q) ? ' piles' : ' board'}" data-mechanic-wire="everystart">${playPanel(p, b, state, act)}</div>`;
  const kept = keptOf(q, b);
  const word = pilesKind(q) && b.told === 'again' ? 'Already on the shelf.' : b.refused?.more ? 'There is another.' : '';
  const note = `<p class="es-note" role="status">${esc(word)}</p>`;
  const all = done ? '' : button('That’s all', {type: 'all'}, 'primary', kept.length > 0 && !b.refused, act?.type === 'all');
  const tryIt = done ? '' : button('Play', {type: 'try'}, 'secondary');
  if (!pilesKind(q)) {
    // The key sits beside Play and That's all, so the busiest board still fits a phone.
    const board = boardHTML(q, {marks: new Set(b.marked), live: !done, hinted: act?.type === 'mark' ? squareOf(q, act.cell) : null, label: BOARD_LABEL(q)});
    return `<div class="es-puzzle board" data-mechanic-wire="everystart">${board}<div class="es-actions">${moveKey(q)}${tryIt}${all}</div>${note}</div>`;
  }
  const slots = b.build.map((n, i) => `<div class="es-builder-pile" role="group" aria-label="${PILE_NAMES[i]} pile, ${plural(n, 'pebble')}"><div class="es-slots">${Array.from({length: q.max}, (_, k) => {
    const size = k + 1, on = size <= n, hint = act?.type === 'set' && act.pile === i && act.n === size;
    return `<button type="button" class="es-slot${on ? ' on' : ''}${hint ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'set', pile: i, n: size}))}" data-focus="es-slot-${i}-${size}" aria-label="Make the ${PILE_NAMES[i]} pile ${size}" aria-pressed="${size === n}" ${done ? 'disabled' : ''}></button>`;
  }).join('')}</div><span class="es-count" aria-hidden="true">${n}</span></div>`).join('');
  const shelf = kept.map(key => `<button type="button" class="es-chip${act?.type === 'drop' && act.key === key ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'drop', key}))}" data-focus="es-chip-${key}" aria-label="Take ${pileWords(startOfKey(key))} off the shelf" ${done ? 'disabled' : ''}>${startOfKey(key).map(n => `<span>${n}</span>`).join('')}</button>`).join('');
  const tools = done ? '' : `${button('Keep', {type: 'keep'}, 'secondary', true, act?.type === 'keep')}${tryIt}${all}`;
  // The line about That's all or Keep sits under the buttons, above a shelf that can grow long.
  return `<div class="es-puzzle piles" data-mechanic-wire="everystart">
    <div class="es-builder">${slots}</div>
    <div class="es-actions">${tools}</div>
    ${note}
    <div class="es-shelf" role="group" aria-label="Shelf">${shelf}</div>
  </div>`;
}

export const rookraceMechanics = {
  rookrace: {
    fresh: raceFresh,
    valid: raceValid,
    solved: raceSolved,
    move: raceMove,
    hint: raceHint,
    solve: raceSolve,
    render: raceRender,
    wire: wireBoard,
    noUndo: () => true
  },
  everystart: {
    fresh: everyFresh,
    valid: everyValid,
    solved: everySolved,
    move: everyMove,
    hint: everyHint,
    render: everyRender,
    wire: wireBoard,
    noUndo: () => true,
    ui(p, payload) {
      const state = ui(p);
      if (object(payload) && payload.pick === null) state.pick = null;
      else if (object(payload) && object(payload.pick) && integer(payload.pick.pile) && integer(payload.pick.from)) {
        const again = state.pick && state.pick.pile === payload.pick.pile && state.pick.from === payload.pick.from;
        state.pick = again ? null : {pile: payload.pick.pile, from: payload.pick.from};
      }
    },
    reset: p => { uiState.delete(p.id); }
  }
};

// The family seam entry (dist/families.js). The puzzles join Pebble Duel as
// two groups, so the module adds no satchel family of its own.
export default {
  id: 'rookrace',
  mechanics: rookraceMechanics,
  pack: new URL('./rookrace.json', import.meta.url).href,
  css: new URL('./rookrace.css', import.meta.url).href,
  focus: '[data-mechanic-wire] button.rr-cell.target,[data-mechanic-wire="everystart"] button.rr-cell,[data-mechanic-wire="everystart"] button.es-slot:not(:disabled),[data-mechanic-wire="everystart"] button.es-pebble:not(:disabled),[data-mechanic-wire] :is(.rr-actions,.es-actions) button:not(:disabled)'
};
