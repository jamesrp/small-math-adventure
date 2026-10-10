// Take-away games with a move menu (worksheet Week 7), a group inside Pebble
// Duel. A menu such as 1, 3 or 4 says how many pebbles a turn may take from
// one pile. A player with no legal move loses (normal play), so with 1 on the
// menu, taking the last pebble wins; in misère puzzles taking it loses. Every
// position is a win or a loss for the player to move, found by working up
// from the end, and for a one-pile game the losses repeat with a fixed period.
// Besides games, the group has tracks (colour the piles to leave for the
// opponent, numbered squares 0 to N) and a design puzzle (choose a menu whose
// piles to leave are exactly the multiples of a number).
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
// Replies: the child goes second, and the opponent tries each first take in
// turn. Winning every round shows that the start loses for the first player.
const repliesMode = q => q.mode === 'replies';
export const firstMoves = q => legalMoves(q, q.start);
function roundBoard(q, round) {
  const m = firstMoves(q)[round];
  return {start: [...q.start], piles: after(q.start, m), first: 'opponent', turns: [{player: 'opponent', ...m}], streak: 0, fresh: true, round};
}

function validBoard(p, board) {
  const q = p.parameters, streak = streakMode(q), n = streak ? q.piles : q.start.length;
  if (!object(board) || !Array.isArray(board.start) || board.start.length !== n || !board.start.every(size => integer(size) && size >= 0 && size <= MAX_PILE)) return false;
  if (!streak && board.start.join(',') !== q.start.join(',')) return false;
  if (streak && !board.start.every(size => size >= q.range[0] && size <= q.range[1])) return false;
  if (![null, 'you', 'opponent'].includes(board.first) || (!streak && board.first !== (repliesMode(q) ? 'opponent' : 'you'))) return false;
  if (repliesMode(q)) {
    const first = firstMoves(q)[board.round];
    if (!integer(board.round) || !first || board.turns?.[0]?.pile !== first.pile || board.turns[0].take !== first.take) return false;
  } else if (Object.hasOwn(board, 'round')) return false;
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
function solvedBoard(p, board) {
  const q = p.parameters;
  if (!validBoard(p, board)) return false;
  if (streakMode(q)) return board.streak >= q.streak;
  return winner(q, board) === 'you' && (!repliesMode(q) || board.round === firstMoves(q).length - 1);
}

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
  if (repliesMode(q)) return roundBoard(q, 0);
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
  if (repliesMode(q) && over(q, board)) {
    if (action.type === 'next' && winner(q, board) === 'you') return roundBoard(q, board.round + 1);
    if (action.type === 'again' && winner(q, board) === 'opponent') return roundBoard(q, board.round);
    return null;
  }
  if (streakMode(q) && (action.type === 'new' || action.type === 'again') && board.first !== null && over(q, board)) {
    if (action.type === 'again' && winner(q, board) !== 'opponent') return null;
    const start = action.type === 'new' ? drawStart(q, random) : [...board.start];
    return {start, piles: [...start], first: null, turns: [], streak: board.streak, fresh: action.type === 'new'};
  }
  return null;
}

// The best next action from any board: who should start, then a winning take.
export function solveAction(p, board) {
  const q = p.parameters;
  if (board.first === null) {
    const first = moverWins(q, board.piles) ? 'you' : 'opponent';
    return {type: 'move', action: {type: 'choose', first}, text: first === 'you' ? 'Go first: from here the first player can always win.' : 'Let the opponent start: whoever moves first from here can be beaten.'};
  }
  if (over(q, board)) return {type: 'move', action: {type: 'new'}, text: 'Try a new start.'};
  const win = winningMoves(q, board.piles)[0];
  // The text nudges without naming the take; the third hint level applies it.
  if (win) return {type: 'move', action: {type: 'take', ...win}, text: board.piles.length > 1
    ? 'Some take wins from here. Which pairs of piles would you like to leave? Try small ones first.'
    : 'Some take wins from here. Which piles would you like to leave? Work up from 0.'};
  const any = legalMoves(q, board.piles)[0];
  return {type: 'move', action: {type: 'take', ...any}, text: 'From here a careful opponent can always win. Undo your last turn and try a different take.'};
}
function hint(p, board) {
  if (!validBoard(p, board)) return {type: 'deadend', text: 'Restart to restore the pebbles.'};
  if (solvedBoard(p, board)) return {type: 'done'};
  // Choose-who-starts rounds are evidence: hints never name the answer.
  if (streakMode(p.parameters)) return over(p.parameters, board) ? {type: 'move', action: {type: 'new'}, text: 'Try a new start.'} : {type: 'note'};
  if (repliesMode(p.parameters) && over(p.parameters, board)) return winner(p.parameters, board) === 'you' ? {type: 'move', action: {type: 'next'}, text: 'Try the next first take.'} : {type: 'move', action: {type: 'again'}, text: 'Play this first take again.'};
  return solveAction(p, board);
}

const pips = (n, on) => `<span class="proof-pips menu-pips" role="img" aria-label="${on} of ${n} wins in a row">${Array.from({length: n}, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;
function statusLine(q, board) {
  if (board.first === null) return '';
  const last = board.turns.at(-1), w = winner(q, board);
  const took = last?.player === 'opponent' ? `Opponent took ${last.take}${board.piles.length > 1 ? ` from pile ${last.pile}` : ''}.` : '';
  if (w === 'you') return streakMode(q) ? (board.fresh ? 'You won.' : 'You won. Wins count from a new start.') : repliesMode(q) ? 'You won this game.' : '';
  if (w === 'opponent') {
    if (q.misere) return 'You took the last pebble.';
    return last?.player === 'opponent' && board.piles.every(n => n === 0) ? 'Opponent took the last pebble.' : `${took} You have no move.`.trim();
  }
  return `${took ? `<span>${esc(took)}</span> ` : ''}<strong>Your turn</strong>`;
}
// The piles as bowls of pebbles, with the menu as take buttons under each.
// The opponent's last take shows as dashed gaps.
function bowls(menu, piles, last, yourTurn) {
  const named = piles.length > 1;
  return piles.map((size, i) => {
    const ghost = last && last.pile === i + 1 ? last.take : 0;
    const pebbles = Array.from({length: size + ghost}, (_, k) => k < size ? `<span class="menu-pebble" data-k="${size - k}"></span>` : '<span class="menu-pebble gone"></span>').join('');
    const takes = menu.map(take => actionButton(String(take), {type: 'take', pile: i + 1, take}, `data-n="${take}" aria-label="Take ${take}${named ? ` from pile ${i + 1}` : ''}" ${yourTurn && take <= size ? '' : 'disabled'}`).replace('class="secondary expansion-action"', 'class="secondary expansion-action menu-take"')).join('');
    return `<div class="menu-bowl" role="group" aria-label="${named ? `Pile ${i + 1}, ` : ''}${plural(size, 'pebble')}"><div class="menu-pile${size + ghost > 10 ? ' tall' : ''}" aria-hidden="true">${pebbles}</div><span class="menu-count" aria-hidden="true">${size}</span><div class="menu-takes">${takes}</div></div>`;
  }).join('');
}
function render(p, attempt) {
  const q = p.parameters, board = attempt.board, streak = streakMode(q), replies = repliesMode(q), done = solvedBoard(p, board);
  const yourTurn = board.first !== null && !over(q, board) && !done;
  const last = board.turns.at(-1)?.player === 'opponent' ? board.turns.at(-1) : null;
  const piles = bowls(q.menu, board.piles, last, yourTurn);
  const status = statusLine(q, board);
  const rounds = replies ? firstMoves(q).length : 0, won = replies ? board.round + (winner(q, board) === 'you' ? 1 : 0) : 0;
  const controls = replies ? (done || !over(q, board) ? '' : winner(q, board) === 'you' ? actionButton('Next first take', {type: 'next'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"') : actionButton('Try again', {type: 'again'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"'))
    : !streak || done ? '' : board.first === null
    ? `${actionButton('Me first', {type: 'choose', first: 'you'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"')}${actionButton('You first', {type: 'choose', first: 'opponent'})}`
    : over(q, board) ? `${winner(q, board) === 'opponent' ? actionButton('Same start again', {type: 'again'}) : ''}${actionButton('New start', {type: 'new'}).replace('class="secondary expansion-action"', 'class="primary expansion-action"')}` : '';
  return `<div class="menu-puzzle${q.misere ? ' misere' : ''}">
    ${streak ? `<div class="menu-roundbar">${pips(q.streak, board.streak)}</div>` : replies ? `<div class="menu-roundbar">${pips(rounds, won).replace(/wins in a row/, 'first takes answered')}</div>` : ''}
    <p class="menu-status" role="status" tabindex="-1" data-focus="menu-status">${status}</p>
    <div class="menu-piles">${piles}</div>
    ${controls ? `<div class="menu-actions">${controls}</div>` : ''}
  </div>`;
}

// Tracks. Square s stands for a pile of s pebbles (in a two-pile chart, the
// square in row a and column b stands for piles of a and b). A square is one
// to leave for the opponent exactly when the player to move there loses.
// Checking reports the lowest square that disagrees, with the reason in terms
// of the child's own colouring (below it, the colouring is right), and can
// play the child from that square: the opponent wins.
const pileGame = menu => ({menu});
const chart = q => q.piles === 2;
// Positions in an order where every take leads to an earlier one.
export function trackPositions(q) {
  const n = q.last + 1;
  if (!chart(q)) return Array.from({length: n}, (_, s) => [s]);
  const out = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) out.push([a, b]);
  return out.sort((x, y) => x[0] + x[1] - y[0] - y[1] || x[0] - y[0]);
}
const squareId = (q, pos) => chart(q) ? pos[0] * (q.last + 1) + pos[1] : pos[0];
const squareCount = q => chart(q) ? (q.last + 1) ** 2 : q.last + 1;
const name = pos => pos.length === 1 ? String(pos[0]) : `(${pos[0]}, ${pos[1]})`;
export const toLeave = q => trackPositions(q).filter(pos => !moverWins(pileGame(q.menu), pos)).map(pos => squareId(q, pos)).sort((a, b) => a - b);
// The first square, in that order, where `marked` and the true squares to
// leave differ: {square, at, extra: true, move, leaves} when it is coloured
// but a take from it reaches a coloured square, or {square, at, extra: false,
// leaves} when it is not coloured but every take from it reaches an
// uncoloured one. `leaves` lists the positions reached.
export function firstDifference(q, marked) {
  const mine = new Set(marked), game = pileGame(q.menu);
  for (const pos of trackPositions(q)) {
    const lose = !moverWins(game, pos);
    if (lose === mine.has(squareId(q, pos))) continue;
    if (!lose) { const m = winningMoves(game, pos)[0]; return {square: squareId(q, pos), at: pos, extra: true, move: m, leaves: [after(pos, m)]}; }
    return {square: squareId(q, pos), at: pos, extra: false, leaves: legalMoves(game, pos).map(m => after(pos, m))};
  }
  return null;
}
const multiples = (period, last) => Array.from({length: Math.floor(last / period) + 1}, (_, i) => i * period);
// Design puzzles are checked to 60: a menu from 1 to 9 decides each square
// from the 9 below it, so agreement that far settles every larger square.
export const DESIGN_LAST = 60;
const designDifference = (q, menu) => menu.length ? firstDifference({menu, last: DESIGN_LAST}, multiples(q.period, DESIGN_LAST)) : {square: 0, empty: true};
const sorted = list => [...list].sort((a, b) => a - b);
const listWords = list => list.length === 1 ? String(list[0]) : `${list.slice(0, -1).join(', ')} or ${list.at(-1)}`;

// Playing out a wrong square. The child coloured a square that is not one to
// leave: the child leaves it, so the opponent moves first. Or the child left
// a square to leave uncoloured: the child moves first from it.
function playout(q, b) {
  const d = b.checked ? firstDifference(q, b.marked) : null;
  if (!d || !b.play) return null;
  const game = pileGame(q.menu), first = d.extra ? 'opponent' : 'you';
  let piles = [...d.at];
  for (const [i, t] of b.play.turns.entries()) {
    const expected = (i % 2 === 0) === (first === 'you') ? 'you' : 'opponent';
    if (!object(t) || t.player !== expected || !legalMoves(game, piles).some(m => m.pile === t.pile && m.take === t.take)) return null;
    piles = after(piles, t);
  }
  const done = !legalMoves(game, piles).length, toMove = (b.play.turns.length % 2 === 0) === (first === 'you') ? 'you' : 'opponent';
  return {d, first, piles, done, toMove, winner: done ? (toMove === 'you' ? 'opponent' : 'you') : null};
}
function opponentTurn(q, play, piles, random) {
  const game = pileGame(q.menu);
  if (!legalMoves(game, piles).length) return;
  const m = opponentMove(game, piles, random);
  play.turns.push({player: 'opponent', ...m});
}

function trackValid(p, b) {
  const q = p.parameters, design = q.mode === 'design';
  const field = design ? 'menu' : 'marked', count = design ? null : squareCount(q);
  if (!object(b) || !Array.isArray(b[field]) || typeof b.checked !== 'boolean' || Object.keys(b).length !== (design ? 2 : 3)) return false;
  const list = b[field];
  if (!list.every(v => design ? q.choices.includes(v) : integer(v) && v >= 0 && v < count) || !list.every((v, i) => !i || v > list[i - 1]) || (b.checked && !list.length)) return false;
  if (design) return true;
  if (b.play === null) return true;
  if (!object(b.play) || !Array.isArray(b.play.turns) || Object.keys(b.play).length !== 1 || b.play.turns.length > 200) return false;
  const run = playout(q, b);
  // Saves land on the child's turn or after the game.
  return Boolean(run) && (run.done || run.toMove === 'you');
}
function trackSolved(p, b) {
  if (!trackValid(p, b) || !b.checked) return false;
  const q = p.parameters;
  return q.mode === 'design' ? !designDifference(q, b.menu) : !firstDifference(q, b.marked);
}
const trackFresh = p => p.parameters.mode === 'design' ? {menu: [], checked: false} : {marked: [], checked: false, play: null};
function trackMove(p, b, action, random = Math.random) {
  const q = p.parameters, design = q.mode === 'design';
  if (!trackValid(p, b) || trackSolved(p, b) || !object(action)) return null;
  if (!design && b.play) {
    const run = playout(q, b);
    if (action.type === 'back') return {...b, play: null};
    if (action.type !== 'take' || run.done) return null;
    const m = {pile: index(action.pile), take: index(action.take)};
    if (!legalMoves(pileGame(q.menu), run.piles).some(o => o.pile === m.pile && o.take === m.take)) return null;
    const play = {turns: [...b.play.turns, {player: 'you', ...m}]};
    opponentTurn(q, play, after(run.piles, m), random);
    return {...b, play};
  }
  if (action.type === 'check') return b.checked || !(design ? b.menu : b.marked).length ? null : {...b, checked: true};
  if (!design && action.type === 'play') {
    const d = b.checked ? firstDifference(q, b.marked) : null;
    if (!d) return null;
    const play = {turns: []};
    if (d.extra) opponentTurn(q, play, d.at, random);
    return {...b, play};
  }
  const field = design ? 'menu' : 'marked', type = design ? 'choose' : 'mark', value = index(design ? action.take : action.square);
  if (action.type !== type || !(design ? q.choices.includes(value) : integer(value) && value >= 0 && value < squareCount(q))) return null;
  const list = b[field].includes(value) ? b[field].filter(v => v !== value) : sorted([...b[field], value]);
  return design ? {menu: list, checked: false} : {marked: list, checked: false, play: null};
}
function trackHint(p, b) {
  const q = p.parameters;
  if (!trackValid(p, b)) return {type: 'deadend', text: 'Restart to clear the track.'};
  if (trackSolved(p, b)) return {type: 'done'};
  // A design is a reverse goal: hints are the authored ones only.
  if (q.mode === 'design') return {type: 'note'};
  const wrong = firstDifference(q, b.marked);
  if (b.play) return {type: 'move', action: {type: 'back'}, text: `Go back to the ${chart(q) ? 'chart' : 'track'} and look again at ${name(wrong.at)}.`};
  if (!wrong) return {type: 'move', action: {type: 'check'}, text: `Check your ${chart(q) ? 'chart' : 'track'}.`};
  return {type: 'move', action: {type: 'mark', square: wrong.square}, text: `Look again at ${name(wrong.at)}. If you leave ${name(wrong.at)}, what can your opponent leave for you?`};
}
const pileWord = (q, m) => chart(q) ? ` from the ${m.pile === 1 ? 'first' : 'second'} pile` : '';
// What a check found, in words, or '' before a check.
function trackSay(q, b) {
  if (!b.checked) return '';
  if (q.mode === 'design') {
    const d = designDifference(q, b.menu), takes = `with takes of ${listWords(b.menu)}`;
    if (!d) return `Yes: ${takes}, the squares to leave are exactly ${multiples(q.period, 3 * q.period).join(', ')} and so on.`;
    const s = d.square;
    if (d.extra) return `Not yet: ${takes}, a player on ${s} can take ${d.move.take} and leave ${s - d.move.take}, so ${s} is not a square to leave.`;
    if (!d.leaves.length) return `Not yet: ${takes}, a player on ${s} cannot move at all, so ${s} is a square to leave.`;
    return `Not yet: ${takes}, a player on ${s} can only leave ${listWords(d.leaves.map(name))}, and none of those is a square to leave. So ${s} is one.`;
  }
  const d = firstDifference(q, b.marked);
  if (!d) return `Every coloured square is one to leave, and every other square is not.`;
  const at = name(d.at);
  if (d.extra) return `Leave ${at}, and your opponent can take ${d.move.take}${pileWord(q, d.move)} and leave you ${name(d.leaves[0])}, a square you coloured.`;
  if (!d.leaves.length) return `Leave ${at}, and your opponent cannot move at all.`;
  return `Leave ${at}, and your opponent can only leave ${listWords(d.leaves.map(name))}. ${d.leaves.length === 1 ? 'It is not' : 'None of those is'} coloured, so whatever they leave, you can answer.`;
}
const button = (label, action, cls, extra = '') => actionButton(label, action, extra).replace('class="secondary expansion-action"', `class="${cls} expansion-action"`);
function playPanel(q, b) {
  const run = playout(q, b), at = name(run.d.at), last = b.play.turns.at(-1);
  const opening = run.first === 'opponent' ? `You leave ${at}, so your opponent moves first.` : `You start from ${at}.`;
  const took = last?.player === 'opponent' ? `Opponent took ${last.take}${pileWord(q, last)}. ` : '';
  const status = !run.done ? `${took}<strong>Your turn</strong>` : run.winner === 'opponent'
    ? `${took}You have no move. ${run.first === 'opponent' ? `So ${at} is not a square to leave.` : `Whoever moves first from ${at} loses, so ${at} is a square to leave.`}`
    : 'You won this time. The opponent missed something; try again.';
  return `<div class="menu-playout">
    <p class="menu-label">${esc(opening)}</p>
    <p class="menu-status" role="status">${status}</p>
    <div class="menu-piles">${bowls(q.menu, run.piles, last?.player === 'opponent' ? last : null, !run.done && run.toMove === 'you')}</div>
    <div class="menu-actions">${button(`Back to the ${chart(q) ? 'chart' : 'track'}`, {type: 'back'}, run.done ? 'primary' : 'secondary')}</div></div>`;
}
function trackRender(p, a) {
  const q = p.parameters, b = a.board, done = trackSolved(p, b), say = trackSay(q, b);
  const shown = a.hintLevel >= 2 && !done ? trackHint(p, b) : null;
  const d = b.checked && !done ? (q.mode === 'design' ? designDifference(q, b.menu) : firstDifference(q, b.marked)) : null;
  const check = done || b.play ? '' : button('Check', {type: 'check'}, `primary${shown?.action?.type === 'check' ? ' hinted' : ''}`, b.checked || !(q.mode === 'design' ? b.menu : b.marked).length ? 'disabled' : '');
  const note = say ? `<p class="menu-note${done ? ' good' : ''}" role="status">${esc(say)}</p>` : '<p class="sr-only" role="status"></p>';
  if (q.mode === 'design') {
    const chosen = new Set(b.menu);
    const takes = q.choices.map(t => button(String(t), {type: 'choose', take: t}, `secondary menu-take menu-choice${chosen.has(t) ? ' on' : ''}`, `aria-pressed="${chosen.has(t)}" aria-label="Take ${t}" ${done ? 'disabled' : ''}`)).join('');
    const goal = new Set(multiples(q.period, q.last));
    const strip = Array.from({length: q.last + 1}, (_, s) => `<span class="menu-square goal${goal.has(s) ? ' on' : ''}${d && d.square === s ? ' flag' : ''}">${s}</span>`).join('');
    return `<div class="menu-puzzle menu-track-puzzle mode-design">
      <p class="menu-label">Allowed takes</p><div class="menu-takes menu-choices" role="group" aria-label="Allowed takes">${takes}</div>
      <p class="menu-label">Squares to leave</p><div class="menu-track goal" role="img" aria-label="Goal: squares ${multiples(q.period, q.last).join(', ')} coloured">${strip}</div>
      <div class="menu-actions">${check}</div>${note}</div>`;
  }
  const on = new Set(b.marked), hinted = shown?.action?.type === 'mark' ? shown.action.square : null, locked = done || Boolean(b.play);
  const cell = pos => {
    const id = squareId(q, pos), lit = on.has(id);
    const label = chart(q) ? `Piles of ${pos[0]} and ${pos[1]}` : `Square ${pos[0]}`;
    return button(chart(q) ? '' : String(pos[0]), {type: 'mark', square: id}, `secondary menu-square${lit ? ' on' : ''}${d && d.square === id ? ' flag' : ''}${hinted === id ? ' hinted' : ''}`, `aria-pressed="${lit}" aria-label="${label}${lit ? ', coloured' : ''}" ${locked ? 'disabled' : ''}`);
  };
  const n = q.last + 1;
  const grid = chart(q)
    ? `<div class="menu-chart" role="group" aria-label="Chart: first pile down, second pile across, 0 to ${q.last}" style="--n:${n}"><span class="menu-axis corner" aria-hidden="true"></span>${Array.from({length: n}, (_, b2) => `<span class="menu-axis" aria-hidden="true">${b2}</span>`).join('')}${Array.from({length: n}, (_, a1) => `<span class="menu-axis" aria-hidden="true">${a1}</span>${Array.from({length: n}, (_, b2) => cell([a1, b2])).join('')}`).join('')}</div>`
    : `<div class="menu-track" role="group" aria-label="Squares 0 to ${q.last}">${Array.from({length: n}, (_, s) => cell([s])).join('')}</div>`;
  const play = d && !b.play ? button(d.extra ? `Leave ${name(d.at)} and play` : `Start from ${name(d.at)} and play`, {type: 'play'}, 'secondary') : '';
  return `<div class="menu-puzzle menu-track-puzzle mode-track${chart(q) ? ' chart' : ''}">
    <p class="menu-label">Takes: ${q.menu.map(t => `<span class="menu-chip">${t}</span>`).join('')}${chart(q) ? ' <span class="menu-axes">First pile down, second pile across</span>' : ''}</p>
    ${grid}
    ${b.play ? '' : `<div class="menu-actions">${check}${play}</div>`}${note}${b.play ? playPanel(q, b) : ''}</div>`;
}

export const menuMechanics = {
  menu: {
    fresh,
    valid: validBoard,
    solved: solvedBoard,
    move,
    hint,
    render,
    noUndo: p => streakMode(p.parameters) || repliesMode(p.parameters),
    demo: 'Tap a number under a pile to take that many pebbles. The opponent replies. Only the numbers shown can be taken.'
  },
  menutrack: {
    fresh: trackFresh,
    valid: trackValid,
    solved: trackSolved,
    move: trackMove,
    hint: trackHint,
    render: trackRender,
    demo: 'Tap a square to colour it, and tap it again to clear it. Check says whether the colouring is right, and if not, explains the lowest square that is wrong.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Pebble Duel as
// its Menus group, so the module adds no satchel family of its own.
export default {
  id: 'menus',
  mechanics: menuMechanics,
  pack: new URL('./menus.json', import.meta.url).href,
  css: new URL('./menus.css', import.meta.url).href,
  focus: '.menu-take:not(:disabled),.menu-square:not(:disabled),.menu-actions .primary'
};
