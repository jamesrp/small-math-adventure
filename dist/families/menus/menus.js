// Take-away games with a move menu (worksheet Week 7), a group inside Pebble
// Duel. A menu such as 1, 3 or 4 says how many pebbles a turn may take from
// one pile. A player with no legal move loses (normal play), so with 1 on the
// menu, taking the last pebble wins; in misère puzzles taking it loses. Every
// position is a win or a loss for the player to move, found by working up
// from the end, and for a one-pile game the losses repeat with a fixed period.
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MAX_PILE = 60;

export const legalMoves = (q, piles) => piles.flatMap((size, i) => q.menu.filter(take => take <= size).map(take => ({pile: i + 1, take})));
export const after = (piles, m) => piles.map((size, i) => i === m.pile - 1 ? size - m.take : size);
const key = (q, piles) => `${q.misere ? 'm' : 'n'}|${q.menu.join(',')}|${piles.join(',')}`;
const memo = new Map();
// Whether the player to move wins with perfect play. With no legal move the
// player to move loses (normal play) or wins (misère: the other player made
// the last move).
export function moverWins(q, piles) {
  const k = key(q, piles);
  if (memo.has(k)) return memo.get(k);
  const moves = legalMoves(q, piles);
  const result = moves.length ? moves.some(m => !moverWins(q, after(piles, m))) : Boolean(q.misere);
  memo.set(k, result);
  return result;
}
export const winningMoves = (q, piles) => legalMoves(q, piles).filter(m => !moverWins(q, after(piles, m)));
const over = (q, board) => !legalMoves(q, board.piles).length;
// The game ends when the player to move has no legal move.
function winner(q, board) {
  if (!over(q, board)) return null;
  const last = board.turns.at(-1)?.player;
  if (!last) return null;
  const other = last === 'you' ? 'opponent' : 'you';
  return q.misere ? other : last;
}
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
// A perfect opponent. From a losing position it leaves the fewest winning
// replies, then the most pebbles, so a child has to find the reply.
export function opponentMove(q, piles, random = Math.random) {
  const winning = winningMoves(q, piles);
  if (winning.length) return pick(winning, random);
  let best = [], score = Infinity;
  for (const m of legalMoves(q, piles)) {
    const rest = after(piles, m), s = winningMoves(q, rest).length * 1000 - rest.reduce((a, b) => a + b, 0);
    if (s < score) { score = s; best = [m]; } else if (s === score) best.push(m);
  }
  return pick(best, random);
}
// Starts for choose-who-starts puzzles: every playable start in the range,
// half of them drawn from the losing ones so that guessing "Me first" fails.
export function startPool(q) {
  const out = [], [lo, hi] = q.range;
  (function build(prefix) {
    if (prefix.length === q.piles) { if (legalMoves(q, prefix).length) out.push(prefix); return; }
    for (let n = lo; n <= hi; n++) build([...prefix, n]);
  })([]);
  return out;
}
export function drawStart(q, random = Math.random) {
  const all = startPool(q), losing = random() < .5;
  const pool = all.filter(piles => moverWins(q, piles) !== losing);
  return [...pick(pool.length ? pool : all, random)];
}
const streakMode = q => q.mode === 'streak';

function validBoard(p, board) {
  const q = p.parameters, streak = streakMode(q), n = streak ? q.piles : q.start.length;
  if (!object(board) || !Array.isArray(board.start) || board.start.length !== n || !board.start.every(size => integer(size) && size >= 0 && size <= MAX_PILE)) return false;
  if (!streak && board.start.join(',') !== q.start.join(',')) return false;
  if (streak && !board.start.every(size => size >= q.range[0] && size <= q.range[1])) return false;
  if (![null, 'you', 'opponent'].includes(board.first) || (!streak && board.first !== 'you')) return false;
  if (!Array.isArray(board.turns) || board.turns.length > board.start.reduce((a, b) => a + b, 0) || (board.first === null && board.turns.length)) return false;
  if (!integer(board.streak) || board.streak < 0 || board.streak > (streak ? q.streak : 0) || typeof board.fresh !== 'boolean') return false;
  let piles = [...board.start];
  for (const [i, t] of board.turns.entries()) {
    const expected = (i % 2 === 0) === (board.first === 'you') ? 'you' : 'opponent';
    if (!object(t) || t.player !== expected || !legalMoves(q, piles).some(m => m.pile === t.pile && m.take === t.take)) return false;
    piles = after(piles, t);
  }
  if (!Array.isArray(board.piles) || board.piles.join(',') !== piles.join(',')) return false;
  // Saves land on the player's turn, before the choice, or after the game.
  const toMove = board.turns.length % 2 === 0 ? board.first : board.first === 'you' ? 'opponent' : 'you';
  return board.first === null || !legalMoves(q, piles).length || toMove === 'you';
}
const solvedBoard = (p, board) => validBoard(p, board) && (streakMode(p.parameters) ? board.streak >= p.parameters.streak : winner(p.parameters, board) === 'you');

function reply(q, board, random) {
  if (over(q, board)) return;
  const m = opponentMove(q, board.piles, random);
  board.turns.push({player: 'opponent', ...m});
  board.piles = after(board.piles, m);
}
function settle(q, board) {
  if (!streakMode(q) || !over(q, board)) return;
  board.streak = winner(q, board) === 'you' ? Math.min(q.streak, board.streak + (board.fresh ? 1 : 0)) : 0;
}
function fresh(p, random = Math.random) {
  const q = p.parameters;
  if (!streakMode(q)) return {start: [...q.start], piles: [...q.start], first: 'you', turns: [], streak: 0, fresh: true};
  const start = drawStart(q, random);
  return {start, piles: [...start], first: null, turns: [], streak: 0, fresh: true};
}
// The player's turn and the opponent's reply are one move, so saves and Undo
// always land on the player's turn.
function move(p, board, action, random = Math.random) {
  const q = p.parameters;
  if (!validBoard(p, board) || solvedBoard(p, board) || !object(action)) return null;
  const next = clone(board);
  if (action.type === 'choose') {
    if (!streakMode(q) || board.first !== null || !['you', 'opponent'].includes(action.first)) return null;
    next.first = action.first;
    if (next.first === 'opponent') { reply(q, next, random); settle(q, next); }
    return next;
  }
  if (action.type === 'take') {
    const m = {pile: index(action.pile), take: index(action.take)};
    if (board.first === null || over(q, board) || !legalMoves(q, board.piles).some(o => o.pile === m.pile && o.take === m.take)) return null;
    next.turns.push({player: 'you', ...m});
    next.piles = after(next.piles, m);
    reply(q, next, random);
    settle(q, next);
    return next;
  }
  if (streakMode(q) && (action.type === 'new' || action.type === 'again') && board.first !== null && over(q, board)) {
    if (action.type === 'again' && winner(q, board) !== 'opponent') return null;
    const start = action.type === 'new' ? drawStart(q, random) : [...board.start];
    return {start, piles: [...start], first: null, turns: [], streak: board.streak, fresh: action.type === 'new'};
  }
  return null;
}

const describe = piles => piles.length === 1 ? plural(piles[0], 'pebble') : piles.join(' and ');
// The best next action from any board: who should start, then a winning take.
export function solveAction(p, board) {
  const q = p.parameters;
  if (board.first === null) {
    const first = moverWins(q, board.piles) ? 'you' : 'opponent';
    return {type: 'move', action: {type: 'choose', first}, text: first === 'you' ? 'Go first: from here the first player can always win.' : 'Let the opponent start: whoever moves first from here can be beaten.'};
  }
  if (over(q, board)) return {type: 'move', action: {type: 'new'}, text: 'Try a new start.'};
  const win = winningMoves(q, board.piles)[0];
  if (win) {
    const rest = after(board.piles, win);
    return {type: 'move', action: {type: 'take', ...win}, text: `Take ${win.take}${q.start?.length > 1 || q.piles > 1 ? ` from pile ${win.pile}` : ''}, leaving ${describe(rest)}. Every reply from there can be answered.`};
  }
  const any = legalMoves(q, board.piles)[0];
  return {type: 'move', action: {type: 'take', ...any}, text: 'From here a careful opponent can always win. Undo your last turn and try a different take.'};
}
function hint(p, board) {
  if (!validBoard(p, board)) return {type: 'deadend', text: 'Restart to restore the pebbles.'};
  if (solvedBoard(p, board)) return {type: 'done'};
  // Choose-who-starts rounds are evidence: hints never name the answer.
  if (streakMode(p.parameters)) return over(p.parameters, board) ? {type: 'move', action: {type: 'new'}, text: 'Try a new start.'} : {type: 'note'};
  return solveAction(p, board);
}

const pips = (n, on) => `<span class="proof-pips menu-pips" role="img" aria-label="${on} of ${n} wins in a row">${Array.from({length: n}, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;
function statusLine(q, board) {
  if (board.first === null) return '';
  const last = board.turns.at(-1), w = winner(q, board);
  const took = last?.player === 'opponent' ? `Opponent took ${last.take}${board.piles.length > 1 ? ` from pile ${last.pile}` : ''}.` : '';
  if (w === 'you') return streakMode(q) ? (board.fresh ? 'You won.' : 'You won. Wins count from a new start.') : '';
  if (w === 'opponent') {
    if (q.misere) return 'You took the last pebble.';
    return last?.player === 'opponent' && board.piles.every(n => n === 0) ? 'Opponent took the last pebble.' : `${took} You have no move.`.trim();
  }
  return `${took ? `<span>${esc(took)}</span> ` : ''}<strong>Your turn</strong>`;
}
function render(p, attempt) {
  const q = p.parameters, board = attempt.board, streak = streakMode(q), done = solvedBoard(p, board);
  const yourTurn = board.first !== null && !over(q, board) && !done;
  const last = board.turns.at(-1)?.player === 'opponent' ? board.turns.at(-1) : null;
  const named = board.piles.length > 1;
  const piles = board.piles.map((size, i) => {
    const ghost = last && last.pile === i + 1 ? last.take : 0;
    const pebbles = Array.from({length: size + ghost}, (_, k) => k < size ? `<span class="menu-pebble" data-k="${size - k}"></span>` : '<span class="menu-pebble gone"></span>').join('');
    const takes = q.menu.map(take => actionButton(String(take), {type: 'take', pile: i + 1, take}, `data-n="${take}" aria-label="Take ${take}${named ? ` from pile ${i + 1}` : ''}" ${yourTurn && take <= size ? '' : 'disabled'}`).replace('class="secondary expansion-action"', 'class="secondary expansion-action menu-take"')).join('');
    return `<div class="menu-bowl" role="group" aria-label="${named ? `Pile ${i + 1}, ` : ''}${plural(size, 'pebble')}"><div class="menu-pile${size + ghost > 10 ? ' tall' : ''}" aria-hidden="true">${pebbles}</div><span class="menu-count" aria-hidden="true">${size}</span><div class="menu-takes">${takes}</div></div>`;
  }).join('');
  const status = statusLine(q, board);
  const controls = !streak || done ? '' : board.first === null
    ? `${actionButton('Me first', {type: 'choose', first: 'you'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"')}${actionButton('You first', {type: 'choose', first: 'opponent'})}`
    : over(q, board) ? `${winner(q, board) === 'opponent' ? actionButton('Same start again', {type: 'again'}) : ''}${actionButton('New start', {type: 'new'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"')}` : '';
  return `<div class="menu-puzzle${q.misere ? ' misere' : ''}">
    ${streak ? `<div class="menu-roundbar">${pips(q.streak, board.streak)}</div>` : ''}
    <p class="menu-status" role="status" tabindex="-1" data-focus="menu-status">${status}</p>
    <div class="menu-piles">${piles}</div>
    ${controls ? `<div class="menu-actions">${controls}</div>` : ''}
  </div>`;
}

export const menuMechanics = {
  menu: {
    fresh,
    valid: validBoard,
    solved: solvedBoard,
    move,
    hint,
    render,
    noUndo: p => streakMode(p.parameters),
    demo: 'Tap a number under a pile to take that many pebbles. The opponent replies. Only the numbers shown can be taken.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Pebble Duel as
// its Menus group, so the module adds no satchel family of its own.
export default {
  id: 'menus',
  mechanics: menuMechanics,
  pack: new URL('./menus.json', import.meta.url).href,
  css: new URL('./menus.css', import.meta.url).href,
  focus: '.menu-take:not(:disabled),.menu-actions .primary'
};
