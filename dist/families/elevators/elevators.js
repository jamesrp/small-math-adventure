// Doubling elevators (worksheet Week 74). A car stands on a whole-number
// ground coordinate x at a level h ≥ 0. A move rides up a level, down a level
// (never below the ground), or steps left or right, and a step on level h is
// 2^h long: 1 on the ground, then 2, 4, 8, 16, 32. Every trip starts at 0 on
// the ground and ends on the ground; every move costs one. A trip is a word in
// U, D, L and R, and the save is that word.
//
// A trip of at most N moves that climbs to level H spends at least 2H moves
// riding, so it ends at most (N − 2H)·2^H from 0, and climbing straight to the
// best H, stepping right and riding down reaches that: the farthest N moves
// can end is the largest of these numbers (16 needs 8 moves; 9 moves reach 24
// and 11 reach 48). Going past and stepping back can be shorter: 23 takes 10
// moves by way of 24, while every trip without a left step needs 11.
//
// A puzzle is a flag at `target` (or, with `farthest`, the farthest point the
// budget can reach, drawn without a flag), a budget equal to the fewest moves,
// and a window: x from `xmin` to `xmax` and `levels` levels, which contains
// every shortest trip. scripts/build-elevators.mjs checks both.
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const DIRS = ['U', 'D', 'L', 'R'];
export const stepAt = h => 2 ** h;
export const topOf = q => q.levels - 1;
const key = (x, h) => `${x},${h}`;

// One move from (x, h), or null when it leaves the window.
export function go(q, [x, h], dir) {
  if (dir === 'U') return h < topOf(q) ? [x, h + 1] : null;
  if (dir === 'D') return h > 0 ? [x, h - 1] : null;
  const to = dir === 'L' ? x - stepAt(h) : dir === 'R' ? x + stepAt(h) : null;
  return to !== null && to >= q.xmin && to <= q.xmax ? [to, h] : null;
}
// Every place a word visits, from 0 on the ground, or null if a move is illegal.
export function replay(q, word) {
  const at = [[0, 0]];
  for (const dir of word) {
    const next = go(q, at.at(-1), dir);
    if (!next) return null;
    at.push(next);
  }
  return at;
}

// Moves from every place in the window to (target, 0), by breadth-first
// search outward from the target (every move can be undone by its opposite,
// so the distances are the same both ways).
const searches = new Map();
export function distances(q, target) {
  const id = JSON.stringify([q.xmin, q.xmax, q.levels, target]);
  if (searches.has(id)) return searches.get(id);
  const dist = new Map([[key(target, 0), 0]]), queue = [[target, 0]];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i], d = dist.get(key(...here));
    for (const dir of DIRS) {
      const next = go(q, here, dir);
      if (next && !dist.has(key(...next))) { dist.set(key(...next), d + 1); queue.push(next); }
    }
  }
  searches.set(id, dist);
  return dist;
}
// The fewest moves from a place to (target, 0), and the first move of a
// shortest finish, preferring up, then right, down, left.
const ORDER = ['U', 'R', 'D', 'L'];
export function fewest(q, at, target = q.target) {
  return distances(q, target).get(key(...at)) ?? Infinity;
}
export function nextMove(q, at, target = q.target) {
  const d = fewest(q, at, target);
  if (!d || d === Infinity) return null;
  return ORDER.find(dir => { const next = go(q, at, dir); return next && fewest(q, next, target) === d - 1; });
}
// A shortest trip from 0, by following nextMove.
export function shortestTrip(q, target = q.target) {
  let at = [0, 0], word = '';
  for (let dir; (dir = nextMove(q, at, target));) { word += dir; at = go(q, at, dir); }
  return at[0] === target && at[1] === 0 ? word : null;
}

// Words for a move, used by hints, buttons and screen readers.
export function moveWords(dir, h, sentence = false) {
  const words = dir === 'U' ? 'Up' : dir === 'D' ? 'Down' : `${dir === 'L' ? 'Left' : 'Right'} ${stepAt(h)}`;
  if (!sentence) return words;
  return dir === 'U' ? 'Go up.' : dir === 'D' ? 'Go down.' : `Step ${dir === 'L' ? 'left' : 'right'} ${stepAt(h)}.`;
}
const placeWords = ([x, h]) => `At ${x}, ${h ? `level ${h}` : 'on the ground'}.`;

// Puzzles: the save is {word}.
const wordOk = (b, cap) => object(b) && Object.keys(b).join() === 'word' && typeof b.word === 'string' && /^[UDLR]*$/.test(b.word) && b.word.length <= cap;
const at = (q, word) => replay(q, word)?.at(-1) ?? null;
const home = (q, place) => Boolean(place) && place[0] === q.target && place[1] === 0;
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!wordOk(b, q.budget)) return false;
  const path = replay(q, b.word);
  // Nothing after a solve: only the whole word may end at the target.
  return Boolean(path) && path.slice(0, -1).every(place => !home(q, place));
}
const solvedPuzzle = (p, b) => validPuzzle(p, b) && home(p.parameters, at(p.parameters, b.word));
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action) || action.type !== 'move' || !DIRS.includes(action.dir) || b.word.length >= q.budget) return null;
  return go(q, at(q, b.word), action.dir) ? {word: b.word + action.dir} : null;
}
// Hints: the next move of a shortest finish within the moves left, searched
// from where the car is; Undo when no finish fits.
function plan(p, b) {
  const q = p.parameters, place = at(q, b.word), left = q.budget - b.word.length;
  if (fewest(q, place) <= left) {
    const dir = nextMove(q, place);
    return {type: 'move', action: {type: 'move', dir}, text: moveWords(dir, place[1], true)};
  }
  return {type: 'deadend', text: !b.word.length ? 'Restart.' : q.farthest ? 'Some trip goes farther. Undo.' : 'Too few moves are left. Undo.'};
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  return plan(p, b);
}

// The playground: a wide board, no goal, and Clear.
export const PLAYGROUND = {levels: 6, xmin: -8, xmax: 72};
const PLAY_CAP = 200;
const validPlay = b => wordOk(b, PLAY_CAP) && Boolean(replay(PLAYGROUND, b.word));
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  if (action.type === 'clear') return b.word ? {word: ''} : null;
  if (action.type !== 'move' || !DIRS.includes(action.dir) || b.word.length >= PLAY_CAP) return null;
  return go(PLAYGROUND, at(PLAYGROUND, b.word), action.dir) ? {word: b.word + action.dir} : null;
}

// Drawing. The board is an SVG whose width follows the page and whose height
// is fixed: columns are placed in percent, levels in pixels, so the dots
// spread out on a wide screen while the levels, labels and car keep their
// size. A step is a shallow arc over the dots it spans, drawn in a nested SVG
// stretched to the arc's width.
const GAP = 44, TOP = 26, BOTTOM = 28, CAR = 9;
export const levelY = (q, h) => TOP + (topOf(q) - h) * GAP;
const boardHeight = q => TOP + topOf(q) * GAP + BOTTOM;
const columns = q => q.xmax - q.xmin + 1;
const pct = (q, x) => `${(((x - q.xmin + 0.5) / columns(q)) * 100).toFixed(3)}%`;
const span = (q, n) => `${((n / columns(q)) * 100).toFixed(3)}%`;
const ARC = [6, 8, 10, 12, 14, 16];
const ARROW = '<svg class="elv-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5V4M4.5 9.5 10 4l5.5 5.5"/></svg>';
const arrow = dir => ARROW.replace('elv-arrow', `elv-arrow to-${dir}`);
function trailHtml(q, path, word) {
  return [...word].map((dir, i) => {
    const [x, h] = path[i], [x2, h2] = path[i + 1], cls = `elv-trail${i === word.length - 1 ? ' last' : ''}`;
    if (dir === 'U' || dir === 'D') return `<line class="${cls}" x1="${pct(q, x)}" x2="${pct(q, x)}" y1="${levelY(q, h)}" y2="${levelY(q, h2)}"/>`;
    const lo = Math.min(x, x2), y = levelY(q, h), rise = ARC[Math.min(h, ARC.length - 1)];
    return `<svg x="${pct(q, lo)}" y="${y - rise}" width="${span(q, stepAt(h))}" height="${rise}" viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible"><path class="${cls}" d="M0 10Q50-10 100 10" vector-effect="non-scaling-stroke"/></svg>`;
  }).join('');
}
const flagHtml = (q, x) => `<svg class="elv-flag" x="${pct(q, x)}" y="${levelY(q, 0)}" overflow="visible"><path class="elv-flag-pole" d="M0 0V-28"/><path class="elv-flag-cloth" d="M0-28 15-22.5 0-17z"/><circle class="elv-flag-foot" r="3"/></svg>`;
// The car, and a point at its place that the tap test reads (the car itself
// may be mid-slide).
const carHtml = (q, [x, h]) => `<circle class="elv-here" cx="${pct(q, x)}" cy="${levelY(q, h)}" r="1"/><svg x="${pct(q, x)}" y="${levelY(q, h)}" overflow="visible"><g class="elv-car"><rect class="elv-car-body" x="-${CAR}" y="-${CAR + 1}" width="${2 * CAR}" height="${2 * CAR + 2}" rx="4"/><rect class="elv-car-window" x="-5" y="-6" width="10" height="7" rx="1.5"/></g></svg>`;
// The board: step lengths at the left of each level, the dots, ground
// coordinates every 4 or 8, the flag, the trail, a ring on each place one
// move away (a hinted one in ochre) and the car.
function boardHtml(q, word, {target = null, solved = false, open = true, hinted = null, label}) {
  const path = replay(q, word), place = path.at(-1), n = columns(q), every = n > 40 ? 8 : 4;
  const levels = Array.from({length: q.levels}, (_, h) => h);
  const steps = levels.map(h => `<span style="top:${levelY(q, h)}px">${stepAt(h)}</span>`).join('');
  const dots = levels.map(h => `<line class="elv-level${h ? '' : ' ground'}" x1="0" x2="100%" y1="${levelY(q, h)}" y2="${levelY(q, h)}"/>${Array.from({length: n}, (_, i) => `<circle class="elv-dot" cx="${pct(q, q.xmin + i)}" cy="${levelY(q, h)}" r="${n > 40 ? 1.4 : 2.1}"/>`).join('')}`).join('');
  const coords = Array.from({length: n}, (_, i) => q.xmin + i).filter(x => x % every === 0).map(x => `<text class="elv-coord" x="${pct(q, x)}" y="${boardHeight(q) - 6}">${String(x).replace('-', '−')}</text>`).join('');
  const rings = open ? DIRS.map(dir => [dir, go(q, place, dir)]).filter(([, to]) => to).map(([dir, [x, h]]) => `<circle class="elv-dest${hinted === dir ? ' hinted' : ''}" data-dir="${dir}" cx="${pct(q, x)}" cy="${levelY(q, h)}" r="7"/>`).join('') : '';
  const flag = target === null ? '' : flagHtml(q, target);
  const max = Math.max(320, n * 28 + 40);
  return `<div class="elv-field${solved ? ' solved' : ''}" style="--elv-max:${max}px" tabindex="0" role="application" data-focus="elevator-board" aria-label="${esc(label)}"><div class="elv-steps" aria-hidden="true">${steps}</div><svg class="elv-svg" data-elv-svg width="100%" height="${boardHeight(q)}" aria-hidden="true">${dots}${coords}${flag}${trailHtml(q, path, word)}${rings}${carHtml(q, place)}</svg></div>`;
}
// The four move buttons, as an inverted T, named with the step length.
function padHtml(q, place, canMove, hinted) {
  const button = dir => actionButton(arrow(dir), {type: 'move', dir}, `aria-label="${moveWords(dir, place[1])}" ${canMove && go(q, place, dir) ? '' : 'disabled'}`)
    .replace('class="secondary expansion-action"', `class="secondary expansion-action elv-move to-${dir}${hinted === dir ? ' hinted' : ''}"`);
  return `<div class="elv-pad" role="group" aria-label="Moves">${['U', 'L', 'D', 'R'].map(button).join('')}</div>`;
}
function slotsHtml(word, budget) {
  const filled = [...word].map(dir => `<li class="elv-played">${arrow(dir)}</li>`).join('');
  const empty = budget === null ? '' : Array.from({length: budget - word.length}, () => '<li class="elv-slot"></li>').join('');
  return filled || empty ? `<ol class="elv-slots" aria-hidden="true">${filled}${empty}</ol>` : '';
}

function renderPuzzle(p, attempt) {
  const q = p.parameters, b = attempt.board, solved = solvedPuzzle(p, b), place = at(q, b.word), left = q.budget - b.word.length;
  const hint = attempt.hintLevel >= 2 && !solved ? plan(p, b) : null, hinted = hint?.type === 'move' ? hint.action.dir : null;
  const canMove = !solved && left > 0, goal = q.farthest ? '' : ` Flag at ${q.target} on the ground.`;
  const label = `Elevator board. ${placeWords(place)}${goal} Arrow keys move.`;
  const status = solved ? `${placeWords(place)} Done.` : `${placeWords(place)} ${left} of ${q.budget} moves left.`;
  return `<div class="elv-board" data-mechanic-wire="elevators">${boardHtml(q, b.word, {target: q.farthest ? null : q.target, solved, open: canMove, hinted, label})}${slotsHtml(b.word, q.budget)}${padHtml(q, place, canMove, hinted)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPlay(p, attempt) {
  const b = attempt.board, place = at(PLAYGROUND, b.word), canMove = b.word.length < PLAY_CAP;
  const label = `Elevator board. ${placeWords(place)} Arrow keys move.`;
  const clear = actionButton('Clear', {type: 'clear'}, b.word ? '' : 'disabled');
  return `<div class="elv-board" data-mechanic-wire="elevators">${boardHtml(PLAYGROUND, b.word, {open: canMove, label})}${slotsHtml(b.word.slice(-24), null)}${padHtml(PLAYGROUND, place, canMove, null)}<div class="elv-tools">${clear}</div><p class="sr-only" role="status">${esc(`${placeWords(place)} ${b.word.length} ${b.word.length === 1 ? 'move' : 'moves'}.`)}</p></div>`;
}

// Gestures: arrow keys anywhere on the board or its buttons, and a tap on the
// board goes to the ringed place nearest the tap (the car itself is a
// candidate too, so a tap on the car does nothing). The move that produced
// this render slides the car from where it was, along the arc for a step.
const KEYS = {ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R'};
const reach = 34;
let seen = null;
function wire(root, p, api) {
  const play = playground(p), q = play ? PLAYGROUND : p.parameters;
  const legal = dir => Boolean(play ? movePlay(api.attempt().board, {type: 'move', dir}) : movePuzzle(p, api.attempt().board, {type: 'move', dir}));
  root.addEventListener('keydown', e => {
    const dir = KEYS[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    if (legal(dir)) api.apply({type: 'move', dir});
  });
  const svg = root.querySelector('[data-elv-svg]');
  svg?.addEventListener('click', e => {
    const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const car = root.querySelector('.elv-here');
    const options = [...root.querySelectorAll('.elv-dest')].map(el => [el.dataset.dir, centre(el)]);
    if (car) options.push([null, centre(car)]);
    let best = null, near = reach;
    for (const [dir, [x, y]] of options) { const d = Math.hypot(e.clientX - x, e.clientY - y); if (d < near) { best = dir; near = d; } }
    if (best && legal(best)) api.apply({type: 'move', dir: best});
  });
  // Slide the car for the move just made, once.
  const word = api.attempt().board.word, before = seen;
  seen = {id: p.id, word};
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!before || before.id !== p.id || word.length !== before.word.length + 1 || !word.startsWith(before.word) || reduced || !svg) return;
  const g = root.querySelector('.elv-car'), path = replay(q, word);
  if (!g?.animate || !path) return;
  const [[x0, h0], [x1, h1]] = path.slice(-2), width = svg.getBoundingClientRect().width;
  const dx = ((x0 - x1) / columns(q)) * width, dy = levelY(q, h0) - levelY(q, h1);
  const frames = dx ? [{transform: `translate(${dx}px,0)`}, {transform: `translate(${dx / 2}px,${-ARC[Math.min(h1, ARC.length - 1)] - 4}px)`}, {transform: 'translate(0,0)'}] : [{transform: `translate(0,${dy}px)`}, {transform: 'translate(0,0)'}];
  g.animate(frames, {duration: 260, easing: 'ease-out'});
}

const playground = p => p.parameters.mode === 'playground';
export const elevatorMechanics = {
  elevator: {
    fresh: () => ({word: ''}),
    valid: (p, b) => playground(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => playground(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action) => playground(p) ? movePlay(b, action) : movePuzzle(p, b, action),
    hint: (p, b) => playground(p) ? {type: 'note'} : hintPuzzle(p, b),
    render: (p, a) => playground(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    noHint: playground
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'elevators',
  family: {id: 'elevators', symbol: '⇞'},
  mechanics: elevatorMechanics,
  pack: new URL('./elevators.json', import.meta.url).href,
  css: new URL('./elevators.css', import.meta.url).href,
  focus: '.elv-field'
};
