// Buckets of fish (worksheet Week 81, after Joel David Hamkins's "Buckets of
// fish!", 2017), a group inside Pebble Duel. Buckets stand in a row, each
// holding some fish. A move takes one fish from a bucket and may add one fish
// to each bucket to its left (the capped game of Problems 1–3); in the encore
// a move takes 1, 2 or 3 fish and may add up to 3 to each bucket to its left.
// Whoever takes the last fish wins. The second player wins exactly when every
// bucket is even (in the encore, a multiple of 4): every move from such a
// position breaks it, and from any other position exactly one move restores
// it (take from the rightmost bucket that breaks it, and top up each bucket
// to its left).
//
// Mechanic `buckets`: duels (go first and win), every reply (go second and win
// against each first move) and who-starts rounds (choose who starts, then win,
// three in a row from new starts). Mechanic `bucketsort`: Every start, mark
// every two-bucket card where you would rather go second and claim That's
// all; a wrong mark is played out, the app going first and winning. A move is
// built on the board (take, then add) and ends with End turn, so it is one
// move for the save, the reply and Undo. Design notes: docs/buckets/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const keysAre = (value, keys) => object(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
export const STREAK = 3;

// --- The game -------------------------------------------------------------------
// q holds the rules: cap (the most added to each bucket, default 1) and takes
// (the most taken, default 1). A position lists the buckets left to right.
// A move is {from, take, add}: `from` is the bucket taken from (1 is the
// leftmost), and add[i] is what goes into bucket i + 1, zero from `from` on.
export const capOf = q => q.cap || 1;
export const takesOf = q => q.takes || 1;
export const bucketsOf = q => q.start ? q.start.length : q.buckets;
export function moves(q, pos) {
  const K = capOf(q), out = [];
  pos.forEach((count, j) => {
    for (let take = 1; take <= Math.min(takesOf(q), count); take++) {
      for (let code = 0; code < (K + 1) ** j; code++) {
        const add = pos.map(() => 0);
        for (let i = 0, r = code; i < j; i++, r = Math.floor(r / (K + 1))) add[i] = r % (K + 1);
        out.push({from: j + 1, take, add});
      }
    }
  });
  return out;
}
export const after = (pos, m) => pos.map((count, i) => count + m.add[i] - (i === m.from - 1 ? m.take : 0));
export function legal(q, pos, m) {
  if (!keysAre(m, ['from', 'take', 'add']) || !integer(m.from) || m.from < 1 || m.from > pos.length) return false;
  if (!integer(m.take) || m.take < 1 || m.take > takesOf(q) || m.take > pos[m.from - 1]) return false;
  return Array.isArray(m.add) && m.add.length === pos.length && m.add.every((a, i) => integer(a) && a >= 0 && (i < m.from - 1 ? a <= capOf(q) : a === 0));
}
const isPos = (q, pos) => Array.isArray(pos) && pos.length === bucketsOf(q) && pos.every(c => integer(c) && c >= 0);
const empty = pos => pos.every(c => c === 0);
// Whether the player to move wins, by searching every move (memoised). The
// player with no fish to take loses.
const memo = new Map();
export function moverWins(q, pos) {
  const key = `${capOf(q)}|${takesOf(q)}|${pos.join(',')}`;
  if (memo.has(key)) return memo.get(key);
  const result = moves(q, pos).some(m => !moverWins(q, after(pos, m)));
  memo.set(key, result);
  return result;
}
export const winningMoves = (q, pos) => moves(q, pos).filter(m => !moverWins(q, after(pos, m)));
// The most moves a game from pos can last: take one at a time and add the most
// to every bucket to the left, so a fish in bucket i is worth (cap + 1)^(i - 1)
// moves (the Week 81 card's card_appfit.py, check 4).
export const longest = (q, pos) => pos.reduce((sum, count, i) => sum + count * (capOf(q) + 1) ** i, 0);
// A perfect opponent: a winning move whenever there is one; otherwise a move
// that leaves the fewest winning replies, then the longest game. Every move
// from a losing position leaves exactly one winning reply here, so the
// longest game decides: take one and add the most to every bucket to its
// left, from a bucket chosen at random.
export function opponentMove(q, pos, random = Math.random) {
  const options = moves(q, pos), winning = options.filter(m => !moverWins(q, after(pos, m)));
  if (winning.length) return pick(winning, random);
  let best = [], score = -Infinity;
  for (const m of options) {
    const to = after(pos, m), s = longest(q, to) - 1e6 * winningMoves(q, to).length;
    if (s > score) { score = s; best = [m]; } else if (s === score) best.push(m);
  }
  return pick(best, random);
}
// A saved opponent move from a winning position must reach a losing one, so a
// saved win by the child is a real win against perfect play.
const perfect = (q, from, to) => !moverWins(q, from) || !moverWins(q, to);
const other = player => player === 'you' ? 'opponent' : 'you';
const moveOf = t => ({from: t.from, take: t.take, add: t.add});
const sameMove = (a, b) => object(a) && object(b) && a.from === b.from && a.take === b.take && same(a.add, b.add);
// One game replayed from its start: where it stands, whose turn it is and who
// won, or null. A game lasts at most longest(start) moves.
export function replay(q, game) {
  if (!object(game) || !isPos(q, game.start) || empty(game.start) || ![null, 'you', 'opponent'].includes(game.first) || !Array.isArray(game.turns)) return null;
  if ((game.first === null && game.turns.length) || game.turns.length > longest(q, game.start)) return null;
  let pos = [...game.start];
  for (const [i, t] of game.turns.entries()) {
    const expected = i % 2 === 0 ? game.first : other(game.first);
    if (!keysAre(t, ['player', 'from', 'take', 'add']) || t.player !== expected || !legal(q, pos, moveOf(t))) return null;
    const to = after(pos, moveOf(t));
    if (t.player === 'opponent' && !perfect(q, pos, to)) return null;
    pos = to;
  }
  const over = empty(pos), toMove = game.first === null ? null : game.turns.length % 2 === 0 ? game.first : other(game.first);
  return {pos, over, toMove, winner: over ? game.turns.at(-1).player : null};
}
// Starts for who-starts rounds: every position with each bucket 0 to max,
// except those where one move takes every fish (a free win for Me first).
// Half the draws are second-player starts, so always choosing Me first fails,
// and a new start differs from the one before.
export function startPool(q) {
  const out = [];
  (function build(prefix) {
    if (prefix.length === q.buckets) { if (!empty(prefix) && !moves(q, prefix).some(m => empty(after(prefix, m)))) out.push(prefix); return; }
    for (let c = 0; c <= q.max; c++) build([...prefix, c]);
  })([]);
  return out;
}
const pools = new Map();
const poolOf = q => { const key = JSON.stringify(q); if (!pools.has(key)) pools.set(key, startPool(q)); return pools.get(key); };
export const inPool = (q, s) => isPos(q, s) && poolOf(q).some(t => same(t, s));
export function drawStart(q, random = Math.random, previous = null) {
  const losing = random() < .5;
  let pool = poolOf(q).filter(s => moverWins(q, s) !== losing);
  if (previous && pool.length > 1) pool = pool.filter(s => !same(s, previous));
  return [...pick(pool, random)];
}
export const firstMoves = q => moves(q, q.start);

// --- Words ------------------------------------------------------------------------
const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : String(items[0]);
export const startWords = pos => list(pos);
function moveWords(m) {
  const adds = m.add.map((a, i) => ({a, i})).filter(x => x.a);
  const added = !adds.length ? '' : adds.every(x => x.a === adds[0].a)
    ? ` and added ${adds[0].a} to bucket${adds.length > 1 ? 's' : ''} ${list(adds.map(x => x.i + 1))}`
    : ` and added ${list(adds.map(x => `${x.a} to bucket ${x.i + 1}`))}`;
  return `took ${m.take} from bucket ${m.from}${added}`;
}
// The line above the buckets: what my last move did, whose turn it is, or who won.
function gameStatus(run, turns) {
  const last = turns.at(-1);
  if (run.over) return run.winner === 'you' ? 'You took the last fish.' : 'I took the last fish.';
  if (run.toMove !== 'you') return '';
  return `${last?.player === 'opponent' ? `I ${moveWords(last)}. ` : ''}Your turn`;
}

// --- The move being built ------------------------------------------------------------
// View-only: the bucket chosen to take from, how many, and what is added to
// the buckets on its left, kept outside the save until End turn. It belongs
// to one board (a short hash of it) and is dropped when the board changes.
// Each bucket button carries the move its tap makes, so ui() only stores it.
const building = new Map();
function hash(value) {
  let h = 5381;
  for (const ch of JSON.stringify(value)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
function pendingFor(p, q, board, pos) {
  const state = building.get(p.id), key = hash(board);
  if (!state || state.key !== key) { building.delete(p.id); return null; }
  const m = {from: state.from, take: state.take, add: state.add};
  if (!legal(q, pos, m)) { building.delete(p.id); return null; }
  return m;
}
const storeUi = (p, payload) => {
  if (!object(payload) || !Object.hasOwn(payload, 'pending')) return;
  const s = payload.pending;
  if (s === null) building.delete(p.id);
  else if (object(s) && typeof s.key === 'string' && integer(s.from) && integer(s.take) && Array.isArray(s.add) && s.add.every(integer)) building.set(p.id, {key: s.key, from: s.from, take: s.take, add: [...s.add]});
};

// --- Drawing the buckets --------------------------------------------------------------
const FISH = '<path d="M2 9C6 2.6 14.6 2 21 7.4L28.6 2.6V15.4L21 10.6C14.6 16 6 15.4 2 9Z"/><circle cx="7.4" cy="7.8" r="1.35"/>';
const fish = (cls = '') => `<svg class="bk-fish${cls ? ` ${cls}` : ''}" viewBox="0 0 30 18" aria-hidden="true">${FISH}</svg>`;
const fishWords = n => `${n} fish`;
const button = (label, action, cls, enabled = true, hinted = false) => `<button type="button" class="${cls} bk-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="bk-${esc(action.type)}${action.first ? `-${action.first}` : ''}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const uiButton = (label, payload, cls, focus) => `<button type="button" class="${cls} bk-button" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="${focus}">${label}</button>`;
// The buckets of one position. `live` makes them buttons for building a move;
// `pending` is the move being built; `last` is my last move, drawn until the
// child starts a move (its taken fish dashed, its added fish ringed).
function bucketsHTML(q, pos, {live = false, pending = null, last = null, key = '', label = 'Buckets'}) {
  const K = capOf(q), T = takesOf(q), from = pending ? pending.from - 1 : -1;
  const shown = !pending && last ? last : null;
  const buckets = pos.map((count, i) => {
    let base = count, lifted = 0, added = 0, slots = 0, gone = 0, came = 0, off = false, role = 'none';
    if (pending) {
      if (i === from) { base = count - pending.take; lifted = pending.take; role = 'take'; }
      else if (i < from) { added = pending.add[i]; slots = K - added; role = 'add'; }
      else off = true;
    } else if (shown) {
      if (i === shown.from - 1) gone = shown.take;
      else if (i < shown.from - 1) { came = shown.add[i]; base = count - came; }
    }
    const shoal = [
      ...Array.from({length: base}, () => fish()), ...Array.from({length: came}, () => fish('came')),
      ...Array.from({length: added}, () => fish('new')), ...Array.from({length: slots}, () => fish('slot')),
      ...Array.from({length: lifted}, () => fish('lift')), ...Array.from({length: gone}, () => fish('gone'))
    ].join('');
    const cls = ['bk-bucket', role === 'take' ? 'taking' : '', role === 'add' ? 'adding' : '', off ? 'off' : ''].filter(Boolean).join(' ');
    const inner = `<span class="bk-shoal" aria-hidden="true">${shoal}</span>`;
    const name = `Bucket ${i + 1}, ${fishWords(count)}`;
    let next = null, words = name;
    if (live && !pending && count > 0) { next = {from: i + 1, take: 1, add: pos.map(() => 0)}; words = `${name}. Take one.`; }
    if (live && role === 'take') {
      const more = pending.take < Math.min(T, count);
      next = more ? {...pending, take: pending.take + 1} : null;
      words = `${name}, taking ${pending.take}. ${more ? 'Take one more.' : pending.take > 1 ? 'Put them back.' : 'Put it back.'}`;
    }
    if (live && role === 'add') {
      const more = added < K;
      next = {...pending, add: pending.add.map((a, k) => k === i ? (more ? a + 1 : 0) : a)};
      words = `${name}${added ? `, adding ${added}` : ''}. ${more ? 'Add one.' : 'Take the added fish out.'}`;
    }
    const tappable = live && (role === 'take' || role === 'add' || (!pending && count > 0));
    const body = tappable
      ? `<button type="button" class="${cls}" data-i="${i}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({pending: next ? {key, ...next} : null}))}" data-focus="bk-bucket-${i}" aria-label="${esc(words)}">${inner}</button>`
      : `<span class="${cls}" data-i="${i}" role="img" aria-label="${esc(name)}">${inner}</span>`;
    return `<div class="bk-column">${body}<span class="bk-num" aria-hidden="true">${i + 1}</span></div>`;
  }).join('');
  return `<div class="bk-board${K > 1 ? ' fours' : ''}" role="group" aria-label="${esc(label)}" style="--n:${pos.length}">${buckets}</div>`;
}
// The controls under the buckets on the child's turn: End turn, and Cancel
// while a move is being built.
function turnControls(pending) {
  const end = button('End turn', pending ? {type: 'move', ...pending} : {type: 'move'}, 'primary', Boolean(pending));
  return pending ? `${end}${uiButton('Cancel', {pending: null}, 'secondary', 'bk-cancel')}` : end;
}
const pips = (n, on, what) => `<span class="bk-pips" role="img" aria-label="${on} of ${n} ${what}">${Array.from({length: n}, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;

// --- Duels, every reply and who-starts rounds (mechanic `buckets`) ---------------------
// The save: the start, the buckets now, who went first and the turns; a round
// also keeps the streak, the games won in it (each its start, who went first
// and its turns, replayed against the perfect opponent when a save is checked)
// and whether this start was new; every reply keeps which first move it is on.
const FIELDS = {duel: ['start', 'pos', 'first', 'turns'], replies: ['start', 'pos', 'first', 'turns', 'round'], streak: ['start', 'pos', 'first', 'turns', 'streak', 'won', 'fresh']};
const gameOf = b => ({start: b.start, first: b.first, turns: b.turns});
const sameGame = (a, b) => JSON.stringify(gameOf(a)) === JSON.stringify(gameOf(b));
function roundBoard(q, round) {
  const m = firstMoves(q)[round];
  return {start: [...q.start], pos: after(q.start, m), first: 'opponent', turns: [{player: 'opponent', ...clone(m)}], round};
}
function gameValid(p, b) {
  const q = p.parameters, mode = q.mode;
  if (!FIELDS[mode] || !keysAre(b, FIELDS[mode])) return false;
  if (mode === 'streak' ? !inPool(q, b.start) : !same(b.start, q.start)) return false;
  if (mode === 'duel' && b.first !== 'you') return false;
  if (mode === 'replies' && (b.first !== 'opponent' || !integer(b.round) || b.round < 0 || b.round >= firstMoves(q).length || !sameMove(b.turns[0], firstMoves(q)[b.round]))) return false;
  const run = replay(q, b);
  if (!run || !same(run.pos, b.pos)) return false;
  // Saves land before the choice, on the child's turn, or after the game.
  if (!(b.first === null || run.over || run.toMove === 'you')) return false;
  if (mode !== 'streak') return true;
  // The streak is the list of won games: each a win against the perfect
  // opponent, each from a start new after the one before. A loss empties it
  // and a practice game (not fresh) never adds to it; a fresh win is its last entry.
  if (!integer(b.streak) || !Array.isArray(b.won) || b.won.length !== b.streak || b.streak > q.streak || typeof b.fresh !== 'boolean') return false;
  for (const [i, game] of b.won.entries()) {
    if (!keysAre(game, ['start', 'first', 'turns']) || !inPool(q, game.start)) return false;
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
function gameSolved(p, b) {
  const q = p.parameters;
  if (!gameValid(p, b)) return false;
  if (q.mode === 'streak') return b.streak >= q.streak;
  const run = replay(q, b);
  return run.winner === 'you' && (q.mode !== 'replies' || b.round === firstMoves(q).length - 1);
}
function gameFresh(p, random = Math.random) {
  const q = p.parameters;
  if (q.mode === 'replies') return roundBoard(q, 0);
  if (q.mode === 'duel') return {start: [...q.start], pos: [...q.start], first: 'you', turns: []};
  const start = drawStart(q, random);
  return {start, pos: [...start], first: null, turns: [], streak: 0, won: [], fresh: true};
}
function reply(q, b, random) {
  if (empty(b.pos)) return;
  const m = opponentMove(q, b.pos, random);
  b.turns.push({player: 'opponent', ...clone(m)});
  b.pos = after(b.pos, m);
}
function settle(q, b) {
  if (q.mode !== 'streak' || !empty(b.pos)) return;
  if (b.turns.at(-1).player === 'you') { if (b.fresh) { b.won.push(clone(gameOf(b))); b.streak = b.won.length; } return; }
  b.streak = 0; b.won = [];
}
// The child's move as an action: {type: 'move', from, take, add}.
const actionMove = action => ({from: index(action.from), take: index(action.take), add: Array.isArray(action.add) ? action.add.map(index) : null});
function gameMove(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!gameValid(p, b) || gameSolved(p, b) || !object(action)) return null;
  const next = clone(b), run = replay(q, b);
  if (action.type === 'choose') {
    if (q.mode !== 'streak' || b.first !== null || !['you', 'opponent'].includes(action.first)) return null;
    next.first = action.first;
    if (next.first === 'opponent') { reply(q, next, random); settle(q, next); }
    return next;
  }
  if (action.type === 'move') {
    const m = actionMove(action);
    if (b.first === null || run.over || run.toMove !== 'you' || !legal(q, b.pos, m)) return null;
    next.turns.push({player: 'you', ...m});
    next.pos = after(b.pos, m);
    reply(q, next, random);
    settle(q, next);
    return next;
  }
  if (q.mode === 'replies' && run.over) {
    if (action.type === 'next' && run.winner === 'you') return roundBoard(q, b.round + 1);
    if (action.type === 'again' && run.winner === 'opponent') return roundBoard(q, b.round);
    return null;
  }
  if (q.mode === 'streak' && (action.type === 'new' || action.type === 'again') && b.first !== null && run.over) {
    if (action.type === 'again' && run.winner !== 'opponent') return null;
    const start = action.type === 'new' ? drawStart(q, random, b.start) : [...b.start];
    return {start, pos: [...start], first: null, turns: [], streak: b.streak, won: clone(b.won), fresh: action.type === 'new'};
  }
  return null;
}
// The best next action from any board, for the validator and the tests.
export function gameSolve(p, b) {
  const q = p.parameters, run = replay(q, b);
  if (b.first === null) return {type: 'choose', first: moverWins(q, b.pos) ? 'you' : 'opponent'};
  if (run.over) return q.mode === 'replies' ? {type: run.winner === 'you' ? 'next' : 'again'} : {type: 'new'};
  return {type: 'move', ...(winningMoves(q, b.pos)[0] || moves(q, b.pos)[0])};
}
// Hints. In a duel or every reply they point toward a winning move without
// naming it, and Apply hint (the third press) makes it; after a losing move a
// duel says, only behind Hint, that I can now always win, and Undo goes back.
// Who-starts rounds are evidence: hints show the authored nudges by level and
// never say who should start.
const MOVE_HINT = 'Some move wins from here. Which buckets would you like to leave me?';
function gameHint(p, b) {
  const q = p.parameters;
  if (!gameValid(p, b)) return {type: 'deadend', text: 'Restart to fill the buckets again.'};
  if (gameSolved(p, b)) return {type: 'done'};
  const run = replay(q, b);
  if (q.mode === 'streak') return b.first !== null && run.over && run.winner === 'you' ? {type: 'move', action: {type: 'new'}, text: 'Try a new start.'} : {type: 'note'};
  if (run.over) {
    if (q.mode === 'replies') return run.winner === 'you' ? {type: 'move', action: {type: 'next'}, text: 'Try the next first move.'} : {type: 'move', action: {type: 'again'}, text: 'Play this first move again.'};
    return {type: 'deadend', text: 'I took the last fish. Undo or restart to try again.'};
  }
  const win = winningMoves(q, b.pos)[0];
  if (win) return {type: 'move', action: {type: 'move', ...win}, text: MOVE_HINT};
  if (q.mode === 'replies') return {type: 'move', action: {type: 'move', ...moves(q, b.pos)[0]}, text: 'From here I can always win. Finish this game, then Try again.'};
  return {type: 'deadend', quiet: true, text: 'From here I can always win. Undo your last turn and try a different move.'};
}
function gameRender(p, a) {
  const q = p.parameters, b = a.board, done = gameSolved(p, b), run = replay(q, b);
  const yourTurn = b.first !== null && !run.over && run.toMove === 'you' && !done;
  const pending = yourTurn ? pendingFor(p, q, b, b.pos) : null;
  if (!yourTurn) building.delete(p.id);
  const last = b.turns.at(-1)?.player === 'opponent' ? b.turns.at(-1) : null;
  const board = bucketsHTML(q, b.pos, {live: yourTurn, pending, last, key: hash(b)});
  let controls = '';
  if (yourTurn) controls = turnControls(pending);
  else if (!done && q.mode === 'streak') controls = b.first === null
    ? `${button('Me first', {type: 'choose', first: 'you'}, 'secondary')}${button('You first', {type: 'choose', first: 'opponent'}, 'secondary')}`
    : `${run.winner === 'opponent' ? button('Same start again', {type: 'again'}, 'secondary') : ''}${button('New start', {type: 'new'}, 'primary')}`;
  else if (!done && q.mode === 'replies' && run.over) controls = run.winner === 'you' ? button('Next first move', {type: 'next'}, 'primary') : button('Try again', {type: 'again'}, 'primary');
  let status = b.first === null ? '' : gameStatus(run, b.turns);
  if (q.mode === 'streak' && run.over && run.winner === 'you' && !b.fresh) status += ' Wins count from a new start.';
  const bar = q.mode === 'streak' ? pips(q.streak, b.streak, 'wins in a row') : q.mode === 'replies' ? pips(firstMoves(q).length, b.round + (run.winner === 'you' ? 1 : 0), 'first moves answered') : '';
  return `<div class="bk-puzzle" data-mechanic-wire="buckets">
    <div class="bk-roundbar"><p class="bk-status" role="status" tabindex="-1" data-focus="bk-status">${esc(status)}</p>${bar}</div>
    ${board}
    <div class="bk-actions">${controls}</div>
  </div>`;
}
// A tap on a bucket that takes no part in the move being built (an empty one,
// or one at or right of the bucket taken from) is reported as not allowed.
function wireBuckets(root, p, api) {
  root.addEventListener('click', event => {
    const bucket = event.target.closest('span.bk-bucket[data-i]');
    if (!bucket || !root.contains(bucket)) return;
    const b = api.attempt()?.board, ctx = b && gameContext(p, b);
    if (!ctx) return;
    const i = Number(bucket.dataset.i), pending = pendingFor(p, ctx.q, b, ctx.pos);
    api.apply(pending ? {type: 'move', ...pending, add: pending.add.map((x, k) => k === i ? x + 1 : x)} : {type: 'move', from: i + 1, take: 1, add: ctx.pos.map(() => 0)});
  });
}
// The game the child is moving in, if it is the child's turn.
function gameContext(p, b) {
  if (p.mechanic === 'buckets') {
    if (!gameValid(p, b) || gameSolved(p, b) || b.first === null) return null;
    const run = replay(p.parameters, b);
    return !run.over && run.toMove === 'you' ? {q: p.parameters, pos: b.pos} : null;
  }
  if (!sortValid(p, b) || !b.play || b.play.first === null) return null;
  const run = playState(b);
  return run && !run.over && run.toMove === 'you' ? {q: PLAY, pos: run.pos} : null;
}

// --- Every start (mechanic `bucketsort`) --------------------------------------------------
// Fifteen cards, every two-bucket start with 0 to 3 fish in each (not both
// empty), laid out as on the worksheet: card c is the start (c mod 4, c div 4),
// left bucket first. The save: the marked cards (ascending), That's all's
// verdict ({more} while a second-player start is missing; {wrong} names the
// first marked card the first player can win from, given only when none is
// missing), a game being played, and done. A game is a practice try (Play,
// then a card, then who starts) or the play-out of a wrong That's all: I go
// first from the wrong card and win, and when that game ends the marks are
// cleared, since a final claim is final.
export const PLAY = {cap: 1, takes: 1, buckets: 2};
export const cardStart = c => [c % 4, Math.floor(c / 4)];
export const CARDS = Array.from({length: 15}, (_, i) => i + 1);
export const secondCards = () => CARDS.filter(c => !moverWins(PLAY, cardStart(c)));
const isCard = c => integer(c) && c >= 1 && c <= 15;
// That's all on these marks: null (right), {more: true} or {wrong}. Whether a
// start is missing is asked first, so That's all with a few marks says
// nothing about them; only marks holding every answer and something more have
// a wrong card named, and played out.
export function judge(marked) {
  const answers = secondCards(), wrong = [...marked].sort((x, y) => x - y).find(c => moverWins(PLAY, cardStart(c)));
  if (!answers.every(c => marked.includes(c))) return {more: true};
  return wrong === undefined ? null : {wrong};
}
const sameVerdict = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isOrdered = list => Array.isArray(list) && list.every((c, i) => isCard(c) && (!i || list[i - 1] < c));
// A play replayed from its start: where it stands and whose turn it is. A try
// may still be choosing its card (start null) or who starts.
function playState(b) {
  const play = b.play;
  if (!keysAre(play, ['kind', 'start', 'first', 'turns']) || !['try', 'out'].includes(play.kind)) return null;
  if (play.kind === 'out' && (play.first !== 'opponent' || b.refused?.wrong === undefined || play.start !== b.refused.wrong)) return null;
  if (play.start === null) return play.kind === 'try' && play.first === null && Array.isArray(play.turns) && !play.turns.length ? {pos: null, over: false, toMove: null, winner: null} : null;
  if (!isCard(play.start)) return null;
  return replay(PLAY, {start: cardStart(play.start), first: play.first, turns: play.turns});
}
const playOver = b => Boolean(b.play && playState(b)?.over);
function sortValid(p, b) {
  if (!keysAre(b, ['marked', 'refused', 'play', 'done']) || typeof b.done !== 'boolean' || !isOrdered(b.marked)) return false;
  const run = b.play === null ? null : playState(b);
  if (b.play !== null && !run) return false;
  if (b.play?.kind === 'out') {
    // A wrong That's all: the play-out runs on the marks it judged, and when it
    // ends (I win, since I go first from a first-player start) they are cleared.
    if (!keysAre(b.refused, ['wrong']) || !isCard(b.refused.wrong) || !moverWins(PLAY, cardStart(b.refused.wrong))) return false;
    if (run.over ? b.marked.length || run.winner !== 'opponent' : !b.marked.length || !sameVerdict(judge(b.marked), b.refused)) return false;
  } else if (b.refused !== null && !(b.marked.length && keysAre(b.refused, ['more']) && sameVerdict(judge(b.marked), b.refused))) return false;
  if (b.done && (b.play !== null || b.refused !== null || !b.marked.length || judge(b.marked) !== null)) return false;
  // Saves land before a choice, on the child's turn, or after a game.
  if (run && !(run.over || run.toMove === 'you' || b.play.first === null)) return false;
  return true;
}
const sortSolved = (p, b) => sortValid(p, b) && b.done;
const sortFresh = () => ({marked: [], refused: null, play: null, done: false});
function playReply(b, random) {
  const run = playState(b);
  if (!run || run.over) return;
  b.play.turns.push({player: 'opponent', ...clone(opponentMove(PLAY, run.pos, random))});
}
// When the play-out of a wrong That's all ends, the marks are cleared.
function settleOut(b) {
  if (b.play?.kind === 'out' && playState(b)?.over) b.marked = [];
}
function sortMove(p, b, action, random = Math.random) {
  if (!sortValid(p, b) || b.done || !object(action)) return null;
  const next = clone(b);
  if (b.play) {
    const run = playState(b), out = b.play.kind === 'out';
    if (action.type === 'back') {
      // The play-out is played to the end; then Back returns to the cleared cards.
      if (out && !run.over) return null;
      next.play = null;
      if (out) next.refused = null;
      return next;
    }
    if (action.type === 'start') {
      const c = index(action.cell);
      if (out || b.play.first !== null || !isCard(c)) return null;
      next.play.start = c;
      return next;
    }
    if (action.type === 'choose') {
      if (out || b.play.first !== null || b.play.start === null || !['you', 'opponent'].includes(action.first)) return null;
      next.play.first = action.first;
      if (action.first === 'opponent') playReply(next, random);
      return next;
    }
    if (action.type !== 'move' || b.play.first === null || run.over || run.toMove !== 'you') return null;
    const m = actionMove(action);
    if (!legal(PLAY, run.pos, m)) return null;
    next.play.turns.push({player: 'you', ...m});
    playReply(next, random);
    settleOut(next);
    return next;
  }
  // That's all judges every mark at once (see judge). A wrong card is played
  // out at once, I going first; a missing one is only "There is another.",
  // until the marks change.
  if (action.type === 'all') {
    if (!b.marked.length || b.refused) return null;
    const verdict = judge(b.marked);
    if (!verdict) { next.done = true; return next; }
    next.refused = verdict;
    if (verdict.wrong !== undefined) {
      next.play = {kind: 'out', start: verdict.wrong, first: 'opponent', turns: []};
      playReply(next, random);
      settleOut(next);
    }
    return next;
  }
  if (action.type === 'try') { next.play = {kind: 'try', start: null, first: null, turns: []}; return next; }
  if (action.type === 'mark') {
    const c = index(action.cell);
    if (!isCard(c)) return null;
    next.marked = b.marked.includes(c) ? b.marked.filter(x => x !== c) : [...b.marked, c].sort((x, y) => x - y);
    next.refused = null;
    return next;
  }
  return null;
}
// Hints move toward the answer: take off a wrong mark, then add a missing one,
// then That's all. The child sees the puzzle's first authored hint before any
// tap; its second and third are for grown-ups (the notes list them).
export function sortHint(p, b) {
  if (!sortValid(p, b)) return {type: 'deadend', text: 'Restart to clear the cards.'};
  if (b.done) return {type: 'done'};
  if (b.play) {
    const run = playState(b);
    if (b.play.kind === 'out' && !run.over) return {type: 'move', action: {type: 'move', ...moves(PLAY, run.pos)[0]}, text: 'From here I can always win. Make any move.'};
    return {type: 'move', action: {type: 'back'}, text: 'Go back to your marks.'};
  }
  const wrong = b.marked.find(c => moverWins(PLAY, cardStart(c)));
  if (wrong !== undefined) return {type: 'move', action: {type: 'mark', cell: wrong}, text: 'One marked card is a start where whoever starts can win. Take that mark off.'};
  const missing = secondCards().find(c => !b.marked.includes(c));
  if (missing !== undefined) return {type: 'move', action: {type: 'mark', cell: missing}, text: 'There is another start where you would rather go second.'};
  return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
}
// One card: two small buckets of fish, a button that marks it (or, when
// picking a start to play, chooses it).
function cardsHTML(b, {live, pick = false, chosen = null, flag = null, hinted = null}) {
  const cells = Array.from({length: 16}, (_, c) => {
    if (c === 0) return '<span class="bk-card blank" aria-hidden="true"></span>';
    const [l, r] = cardStart(c), on = b.marked.includes(c);
    const mini = n => `<span class="bk-mini">${Array.from({length: n}, () => fish()).join('')}</span>`;
    const cls = ['bk-card', !pick && on ? 'marked' : '', pick && chosen === c ? 'chosen' : '', flag === c ? 'flag' : '', hinted === c ? 'hinted' : ''].filter(Boolean).join(' ');
    const label = `${l} and ${r}${!pick && on ? ', marked' : ''}`;
    const action = pick ? {type: 'start', cell: c} : {type: 'mark', cell: c};
    const inner = `${mini(l)}${mini(r)}`;
    if (!live) return `<span class="${cls}" role="img" aria-label="${esc(label)}">${inner}</span>`;
    return `<button type="button" class="${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="bk-card-${c}" aria-label="${esc(label)}" aria-pressed="${pick ? chosen === c : on}">${inner}</button>`;
  }).join('');
  return `<div class="bk-cards" role="group" aria-label="Starts">${cells}</div>`;
}
function sortRender(p, a) {
  const b = a.board, done = b.done;
  const shown = a.hintLevel >= 2 && !done ? sortHint(p, b) : null, act = shown?.type === 'move' ? shown.action : null;
  if (!b.play) {
    building.delete(p.id);
    const note = `<p class="bk-note" role="status">${b.refused?.more ? 'There is another.' : ''}</p>`;
    const tools = done ? '' : `${button('Play', {type: 'try'}, 'secondary')}${button('That’s all', {type: 'all'}, 'primary', b.marked.length > 0 && !b.refused, act?.type === 'all')}`;
    return `<div class="bk-puzzle sort" data-mechanic-wire="bucketsort">${cardsHTML(b, {live: !done, hinted: act?.type === 'mark' ? act.cell : null})}<div class="bk-actions">${tools}</div>${note}</div>`;
  }
  const play = b.play, run = playState(b), out = play.kind === 'out';
  if (play.first === null) {
    // Picking a start for a practice game: tap a card, then who starts.
    building.delete(p.id);
    const choose = play.start === null ? '' : `${button('Me first', {type: 'choose', first: 'you'}, 'secondary')}${button('You first', {type: 'choose', first: 'opponent'}, 'secondary')}`;
    return `<div class="bk-puzzle sort" data-mechanic-wire="bucketsort"><p class="bk-status" role="status" tabindex="-1" data-focus="bk-status">${play.start === null ? 'Tap a card to start from.' : ''}</p>${cardsHTML(b, {live: true, pick: true, chosen: play.start})}<div class="bk-actions">${choose}${button('Back', {type: 'back'}, 'secondary')}</div></div>`;
  }
  const yourTurn = !run.over && run.toMove === 'you';
  const pending = yourTurn ? pendingFor(p, PLAY, b, run.pos) : null;
  if (!yourTurn) building.delete(p.id);
  const last = play.turns.at(-1)?.player === 'opponent' ? play.turns.at(-1) : null;
  let status = gameStatus(run, play.turns);
  if (out && run.over) status += ' The marks are cleared.';
  // During a play-out, why I go first leads the line.
  const opening = out && !run.over ? `<span class="bk-label">${esc(`Whoever starts from ${startWords(cardStart(play.start))} can win. I go first.`)}</span> ` : '';
  const back = out && !run.over ? '' : button('Back', {type: 'back'}, run.over ? 'primary' : 'secondary');
  const controls = `${yourTurn ? turnControls(pending) : ''}${back}`;
  return `<div class="bk-puzzle sort" data-mechanic-wire="bucketsort">
    <p class="bk-status" role="status" tabindex="-1" data-focus="bk-status">${opening}${esc(status)}</p>
    ${bucketsHTML(PLAY, run.pos, {live: yourTurn, pending, last, key: hash(b), label: `Buckets, from ${startWords(cardStart(play.start))}`})}
    <div class="bk-actions">${controls}</div>
  </div>`;
}

export const bucketMechanics = {
  buckets: {
    fresh: gameFresh,
    valid: gameValid,
    solved: gameSolved,
    move: gameMove,
    hint: gameHint,
    solve: gameSolve,
    render: gameRender,
    wire: wireBuckets,
    ui: storeUi,
    reset: p => { building.delete(p.id); },
    noUndo: p => p.parameters.mode !== 'duel'
  },
  bucketsort: {
    fresh: sortFresh,
    valid: sortValid,
    solved: sortSolved,
    move: sortMove,
    hint: sortHint,
    render: sortRender,
    wire: wireBuckets,
    ui: storeUi,
    reset: p => { building.delete(p.id); },
    noUndo: () => true
  }
};

// The family seam entry (dist/families.js). The puzzles join Pebble Duel as
// the Buckets group, so the module adds no satchel family of its own.
export default {
  id: 'buckets',
  mechanics: bucketMechanics,
  pack: new URL('./buckets.json', import.meta.url).href,
  css: new URL('./buckets.css', import.meta.url).href,
  // Buckets first, then the move controls; the status line only when the
  // board has no control left (a lost duel).
  focus: ':is([data-mechanic-wire="buckets"],[data-mechanic-wire="bucketsort"]) :is(button.bk-bucket,button.bk-card,.bk-actions button:not(:disabled)),:is([data-mechanic-wire="buckets"],[data-mechanic-wire="bucketsort"]):not(:has(button:not(:disabled))) .bk-status'
};
