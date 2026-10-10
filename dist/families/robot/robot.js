// Memory robot (worksheet Week 72, a robot that remembers area). A robot walks
// the streets of a square grid, one block per move, and carries a memory, a
// whole number that starts at 0. East and west leave it alone; a step north
// adds the robot's column number x, and a step south subtracts it, so after a
// walk the memory is z = Σ x·Δy over its north and south steps: the signed
// area between the walk and the wall (the column x = 0), strip by strip.
//
// Order matters: EN and NE both end at (1, 1), with memories 1 and 0, and
// the staircases to (a, b) leave every memory from 0 to ab. A walk that comes
// back to its start keeps only the strips inside it, so its memory is the
// area it encloses: positive anticlockwise, negative clockwise, the same
// wherever the loop is slid. A loop that remembers n ≥ 1 needs at least
// 2⌈2√n⌉ moves, the least perimeter of n unit squares (Harary and Harborth),
// and some open walks are shorter for going past the flag and back. The
// robot's state (x, y, z) is an element of the integer Heisenberg group, and
// a move multiplies it by a generator on the right.
//
// A puzzle gives a start, a flag corner, a goal memory and a budget of moves
// equal to the fewest that reach it. The board draws each north or south step
// as a strip of shading between the robot and the wall, so the squares add up
// to the memory and a closed loop keeps exactly its inside shaded. The board
// is the grid of ../../sq-grid.js, with the robot's corners as its points.
// See docs/robot/README.md.
import {esc, actionButton} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// The board: street corners with x and y from LO to HI, the wall at x = 0.
export const LO = -2, HI = 4;
export const BOARD = {x0: LO, x1: HI, y0: LO, y1: HI};
export const DIRS = {E: [1, 0], N: [0, 1], W: [-1, 0], S: [0, -1]};
// Hints and the witness take the first direction in this order that keeps a
// shortest finish, so loops go anticlockwise from the east.
export const ORDER = ['E', 'N', 'W', 'S'];
export const NAMES = {E: 'east', N: 'north', W: 'west', S: 'south'};
const KEYS = {ArrowRight: 'E', ArrowUp: 'N', ArrowLeft: 'W', ArrowDown: 'S'};
// Searches stop here: no puzzle needs more, and the playground has no search.
export const SEARCH_CAP = 16;
export const PLAY_CAP = 200;

export const onBoard = (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= LO && x <= HI && y >= LO && y <= HI;
// One move: east and west keep the memory; north adds the column, south subtracts it.
export function step([x, y, z], d) {
  const [dx, dy] = DIRS[d];
  return [x + dx, y + dy, z + x * dy];
}
export const startOf = q => [...(q.start || [0, 0]), 0];
// Every state of a walk, from the start; null when a letter is unknown or a
// step leaves the board.
export function trace(q, walk) {
  let s = startOf(q);
  const out = [s];
  for (const d of walk) {
    if (!Object.hasOwn(DIRS, d)) return null;
    s = step(s, d);
    if (!onBoard(s[0], s[1])) return null;
    out.push(s);
  }
  return out;
}
export const stateOf = (q, walk) => trace(q, walk)?.at(-1) ?? null;
export const reached = (q, s) => s[0] === q.flag[0] && s[1] === q.flag[1] && s[2] === q.goal;

// The shading. A north or south step at column x adds sign(x)·Δy to each of
// the |x| unit squares between the wall and the robot in the row it crosses,
// so a step's squares add up to x·Δy and all the squares to the memory. A
// square is named by its lower-left corner, "a,b". Squares at 0 are left out.
export function shading(q, walk) {
  const counts = new Map();
  let [x, y] = startOf(q);
  for (const d of walk) {
    const [dx, dy] = DIRS[d];
    if (dy && x) {
      const row = Math.min(y, y + dy), sign = Math.sign(x) * dy;
      for (let a = Math.min(0, x); a < Math.max(0, x); a++) counts.set(`${a},${row}`, (counts.get(`${a},${row}`) || 0) + sign);
    }
    x += dx; y += dy;
  }
  for (const [k, v] of counts) if (!v) counts.delete(k);
  return counts;
}

// The fewest moves from each state to the flag with the goal memory, by a
// breadth-first search backwards from the goal up to `depth` moves: the step
// d that leads to (x, y, z) comes from (x − dx, y − dy, z − (x − dx)·dy).
const tables = new Map();
function distances(q, depth) {
  const key = JSON.stringify([q.flag, q.goal, depth]);
  if (tables.has(key)) return tables.get(key);
  const goal = [q.flag[0], q.flag[1], q.goal], dist = new Map([[goal.join(), 0]]);
  let frontier = [goal];
  for (let n = 1; n <= depth && frontier.length; n++) {
    const next = [];
    for (const [x, y, z] of frontier) for (const d of ORDER) {
      const [dx, dy] = DIRS[d], px = x - dx, py = y - dy;
      if (!onBoard(px, py)) continue;
      const prev = [px, py, z - px * dy], k = prev.join();
      if (!dist.has(k)) { dist.set(k, n); next.push(prev); }
    }
    frontier = next;
  }
  tables.set(key, dist);
  return dist;
}
export const toGo = (q, s, depth = q.budget ?? SEARCH_CAP) => distances(q, depth).get(s.join()) ?? Infinity;
// A shortest finish from state s within `limit` moves, as letters, or null.
// Each move is the first direction in ORDER that brings the goal one closer.
export function finish(q, s = startOf(q), limit = q.budget ?? SEARCH_CAP) {
  const depth = q.budget ?? SEARCH_CAP;
  if (toGo(q, s, depth) > limit) return null;
  let walk = '';
  while (!reached(q, s)) {
    const here = toGo(q, s, depth);
    const d = ORDER.find(k => { const t = step(s, k); return onBoard(t[0], t[1]) && toGo(q, t, depth) === here - 1; });
    walk += d; s = step(s, d);
  }
  return walk;
}

// The save is the walk, a string of E, N, W and S; everything shown comes from it.
const playground = p => p.parameters.mode === 'playground';
const walkOk = (q, b, cap) => object(b) && Object.keys(b).join() === 'walk' && typeof b.walk === 'string' && /^[ENWS]*$/.test(b.walk) && b.walk.length <= cap && trace(q, b.walk) !== null;
const PLAY = {start: [0, 0]};
function valid(p, b) {
  if (playground(p)) return walkOk(PLAY, b, PLAY_CAP);
  const q = p.parameters;
  // A solve ends the walk: no state before the last may be one.
  return walkOk(q, b, q.budget) && !trace(q, b.walk).slice(0, -1).some(s => reached(q, s));
}
const solved = (p, b) => !playground(p) && valid(p, b) && reached(p.parameters, stateOf(p.parameters, b.walk));
// The letter of a move to a corner next to the robot, or null.
function letterOf(q, walk, action) {
  if (!object(action) || action.type !== 'go' || !Array.isArray(action.to) || action.to.length !== 2 || !onBoard(...action.to)) return null;
  const [x, y] = stateOf(q, walk), dx = action.to[0] - x, dy = action.to[1] - y;
  return ORDER.find(d => DIRS[d][0] === dx && DIRS[d][1] === dy) || null;
}
const goTo = s => ({type: 'go', to: [s[0], s[1]]});
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b)) return null;
  if (playground(p)) {
    if (object(action) && action.type === 'clear') return b.walk ? {walk: ''} : null;
    const d = b.walk.length < PLAY_CAP ? letterOf(PLAY, b.walk, action) : null;
    return d ? {walk: b.walk + d} : null;
  }
  const q = p.parameters, d = b.walk.length < q.budget ? letterOf(q, b.walk, action) : null;
  return d ? {walk: b.walk + d} : null;
}
// Hints: the next move of a shortest finish within the moves left, searched
// from where the robot is now; Undo when no finish fits.
function hint(p, b) {
  if (playground(p)) return {type: 'note'};
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  const q = p.parameters, s = stateOf(q, b.walk), rest = finish(q, s, q.budget - b.walk.length);
  if (!rest) return {type: 'deadend', text: 'Too few moves are left. Undo.'};
  return {type: 'move', action: goTo(step(s, rest[0])), text: `Move ${NAMES[rest[0]]}.`};
}

// Drawing. The board is a grid of squares whose corners are the street
// corners; a view gives its corners' x and y ranges.
const f = n => Number(n.toFixed(2));
const minus = n => n < 0 ? `−${-n}` : String(n);
const gridFor = v => gridOf({cols: v.x1 - v.x0, rows: v.y1 - v.y0});
const at = (v, [x, y]) => [(x - v.x0) * UNIT, (v.y1 - y) * UNIT];
const squareOf = (v, g, i) => [g.cells[i][0] + v.x0, v.y1 - 1 - g.cells[i][1]];
const ROBOT = '<rect class="mr-body" x="-2.8" y="-2.8" width="5.6" height="5.6" rx="1.4"/><path class="mr-antenna" d="M0-2.8V-4"/><circle class="mr-antenna-tip" cy="-4.3" r=".55"/><circle class="mr-eye" cx="-1.15" cy="-.55" r=".62"/><circle class="mr-eye" cx="1.15" cy="-.55" r=".62"/><path class="mr-mouth" d="M-1.1 1.25h2.2"/>';
const FLAG = '<path class="mr-pole" d="M0 0V-7.6"/><path class="mr-cloth" d="M0-7.6l5.2 1.9L0-3.8z"/>';
const icon = (inner, box) => `<svg class="mr-icon" viewBox="${box}" aria-hidden="true">${inner}</svg>`;
export const ROBOT_ICON = icon(ROBOT, '-3.6 -5.2 7.2 8.4'), FLAG_ICON = icon(FLAG, '-1 -8.4 7 9.2');
const ARROW = {E: 0, N: -90, W: 180, S: 90};
const arrow = d => `<svg class="mr-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10h12M11 5l5 5-5 5" transform="rotate(${ARROW[d]} 10 10)"/></svg>`;

// The robot glides from its last corner when the walk has just grown by one
// move; a re-render for any other reason leaves it still.
const lastDrawn = new Map();
function glide(id, walk) {
  const before = lastDrawn.get(id);
  lastDrawn.set(id, walk);
  if (before === undefined || walk.length !== before.length + 1 || !walk.startsWith(before)) return '';
  const [dx, dy] = DIRS[walk.at(-1)];
  return ` style="--mr-dx:${-dx * UNIT}px;--mr-dy:${dy * UNIT}px"`;
}

// The board as an SVG on the shared square grid. opts: q (start, flag),
// walk, live (whether the neighbours are moves), hinted (a direction),
// glide (the robot's style attribute), picture (a small drawing for How to
// play), label.
export function boardSvg(v, q, walk, opts = {}) {
  const g = gridFor(v), states = trace(q, walk), shade = shading(q, walk), now = states.at(-1);
  const count = i => shade.get(squareOf(v, g, i).join()) || 0;
  const cell = i => { const c = count(i); return {cls: c > 0 ? `mr-pos${c > 1 ? ' deep' : ''}` : c < 0 ? `mr-neg${c < -1 ? ' deep' : ''}` : ''}; };
  const [wx] = at(v, [0, 0]), [, top] = at(v, [0, v.y1]), [, bottom] = at(v, [0, v.y0]);
  const wall = v.x0 <= 0 && v.x1 >= 0 ? `<path class="mr-wall" d="M${f(wx)} ${f(top)}V${f(bottom)}"/>` : '';
  const numbers = g.cells.map((_, i) => {
    const c = count(i);
    if (Math.abs(c) < 2) return '';
    const [cx, cy] = g.centre[i];
    return `<text class="mr-num${c < 0 ? ' neg' : ''}" x="${f(cx)}" y="${f(cy)}">${minus(c)}</text>`;
  }).join('');
  const columns = Array.from({length: v.x1 - v.x0 + 1}, (_, k) => {
    const x = v.x0 + k, [cx] = at(v, [x, v.y0]);
    return `<text class="mr-col${x ? '' : ' wall'}" x="${f(cx)}" y="${f(bottom + 3.9)}">${minus(x)}</text>`;
  }).join('');
  const pts = states.map(s => at(v, s).map(f).join(',')).join(' ');
  const trail = walk.length ? `<polyline class="mr-trail-case" points="${pts}"/><polyline class="mr-trail" points="${pts}"/>` : '';
  const start = at(v, states[0]), [rx, ry] = at(v, now);
  const flag = q.flag ? `<g class="mr-flag" transform="translate(${f(at(v, q.flag)[0])},${f(at(v, q.flag)[1])})">${FLAG}</g>` : '';
  const robot = `<g class="mr-robot" transform="translate(${f(rx)},${f(ry)})"><g class="mr-glide"${opts.glide || ''}>${ROBOT}</g></g>`;
  const steps = opts.live ? ORDER.map((d, k) => {
    const t = step(now, d);
    if (!onBoard(t[0], t[1]) || t[0] < v.x0 || t[0] > v.x1 || t[1] < v.y0 || t[1] > v.y1) return '';
    const [tx, ty] = at(v, t);
    return `<g class="mr-step${opts.hinted === d ? ' hinted' : ''}" transform="translate(${f(tx)},${f(ty)})" role="button" tabindex="0" aria-label="Move ${NAMES[d]}" data-sg-point="${k}" data-focus="mr-${d}"><circle class="mr-reach" r="4.6"/><circle class="mr-pip" r="1.25"/></g>`;
  }).join('') : '';
  return squareBoard(g, {
    cls: `mr-board${opts.picture ? ' mr-mini' : ''}`, label: opts.label || 'Streets', picture: opts.picture, pad: .6, cell,
    under: `${wall}${numbers}${columns}`,
    over: `${trail}<circle class="mr-start" cx="${f(start[0])}" cy="${f(start[1])}" r="1.5"/>${flag}${robot}${steps}`
  });
}

const where = s => `At ${minus(s[0])} across, ${minus(s[1])} up.`;
const memoryReadout = z => `<span class="mr-readout mr-memory" role="img" aria-label="Memory ${minus(z)}">${ROBOT_ICON}<b>${minus(z)}</b></span>`;
function slotsHtml(walk, budget) {
  const played = [...walk].map(d => `<li class="mr-played">${arrow(d)}<span class="sr-only">${NAMES[d]}</span></li>`).join('');
  // More than eight boxes go in two even rows.
  return `<ol class="mr-slots" aria-label="Moves" style="--mr-row:${budget > 8 ? Math.ceil(budget / 2) : budget}">${played}${Array.from({length: budget - walk.length}, () => '<li class="mr-slot" aria-hidden="true"></li>').join('')}</ol>`;
}
function render(p, a) {
  const b = a.board, play = playground(p), q = play ? PLAY : p.parameters, done = solved(p, b), now = stateOf(q, b.walk);
  const shown = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const hinted = shown?.type === 'move' ? letterOf(q, b.walk, shown.action) : null;
  const live = !done && b.walk.length < (play ? PLAY_CAP : q.budget);
  const goal = play ? '' : `<span class="mr-readout mr-goal" role="img" aria-label="Goal: memory ${minus(q.goal)} on the flag">${FLAG_ICON}<b>${minus(q.goal)}</b></span>`;
  const board = boardSvg(BOARD, q, b.walk, {live, hinted, glide: glide(p.id, b.walk)});
  const below = play ? `<div class="mr-tools">${actionButton('Clear', {type: 'clear'}, b.walk ? '' : 'disabled').replace('class="secondary expansion-action"', 'class="secondary expansion-action mr-clear"')}</div>` : slotsHtml(b.walk, q.budget);
  const left = play ? '' : ` ${plural(q.budget - b.walk.length, 'move')} left.`;
  return `<div class="mr-puzzle${done ? ' solved' : ''}${play ? ' mr-play' : ''}" data-mechanic-wire="robot"><div class="mr-table"><div class="mr-bar">${memoryReadout(now[2])}${goal}</div>${board}</div>${below}<p class="sr-only" role="status">${esc(`Memory ${minus(now[2])}. ${where(now)}${left}`)}</p></div>`;
}
// How to play: one worked step, east, east, north from the wall, which
// shades the two squares it climbs past and leaves memory 2.
function help() {
  const v = {x0: -1, x1: 3, y0: 0, y1: 2};
  return `<figure class="mr-help">${boardSvg(v, {start: [0, 0]}, 'EEN', {picture: true, label: 'East, east, north from the wall: two squares shaded, memory 2'})}${memoryReadout(2)}</figure>`;
}

// Taps on a corner next to the robot, and the arrow keys, move it.
function wire(root, p, api) {
  const q = playground(p) ? PLAY : p.parameters;
  const moveTo = d => {
    const b = api.attempt().board, s = stateOf(q, b.walk);
    if (!s) return null;
    const t = step(s, d);
    return onBoard(t[0], t[1]) ? goTo(t) : null;
  };
  wireSquare(root, gridFor(BOARD), {point: k => moveTo(ORDER[k])}, api.apply);
  root.addEventListener('keydown', e => {
    const d = KEYS[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const action = moveTo(d);
    if (action) api.apply(action);
  });
}

export const robotMechanics = {
  robot: {
    fresh: () => ({walk: ''}),
    valid, solved, move, hint, render, wire, help,
    reset: p => { lastDrawn.delete(p.id); },
    noHint: playground
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'robot',
  family: {id: 'robot', symbol: '⟲'},
  mechanics: robotMechanics,
  pack: new URL('./robot.json', import.meta.url).href,
  css: new URL('./robot.css', import.meta.url).href,
  focus: '.mr-step,.mr-clear:not(:disabled)'
};
