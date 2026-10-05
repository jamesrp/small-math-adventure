// Rainbow triangles (worksheet Week 16, three-colour triangles). A big
// triangle is cut into little ones; its corners are R, B and Y, a dot on a
// side may use only that side's two corner letters, and a dot inside may use
// any. A little triangle with all three letters is a rainbow. Sperner's
// lemma: every such labelling has an odd number of rainbows. Five kinds of
// puzzle: make exactly so many rainbows; make each triangle the only rainbow
// in turn; find every number of rainbows a board allows; walk through every
// door (an R–B edge), which is the lemma's proof; and find a rainbow among
// hidden letters with few peeks, which is the proof used as a search. The
// maths is in sperner.js, the board in ../../tri-mesh.js; see
// docs/rainbow/README.md.
import {esc} from '../../expansion-controls.js';
import {wireTri} from '../../tri-grid.js';
import {meshBoard, pipRadius} from '../../tri-mesh.js';
import {boardOf, legal, rainbows, isRainbow, isDoor, doorsOf, cellDoors, fillings, countTable} from './sperner.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const MODES = ['count', 'only', 'counts', 'walk', 'peek'];
export const PLAY_BOARDS = {2: {steps: 2}, 3: {steps: 3}, 4: {steps: 4}, 5: {steps: 5}, fan: {steps: 2, centres: [0, 1, 2, 3]}};
export const PLAY_ORDER = ['2', '3', '4', '5', 'fan'];

// The simplest legal labelling: each dot takes its side's first letter.
export const plainLabels = board => board.allowed.map(s => s[0]).join('');
const boardFor = (p, b) => boardOf(p.parameters.mode === 'playground' ? PLAY_BOARDS[b.board] : p.parameters.board);
// The next letter a dot may take, in the order R, B, Y.
export const nextLetter = (board, labels, k) => { const s = board.allowed[k], i = s.indexOf(labels[k]); return s[(i + 1) % s.length]; };
const turn = (labels, k, c) => labels.slice(0, k) + c + labels.slice(k + 1);
const onlyCells = p => p.parameters.cells || boardFor(p).m.cells.map((_, i) => i);

// Every number of rainbows a board allows, once per board.
const possible = new Map();
export function countsOf(board) {
  const key = JSON.stringify(board.spec);
  if (!possible.has(key)) possible.set(key, [...countTable(board).keys()]);
  return possible.get(key);
}

/* ------------------------------------------------------------------ *
 * Boards and moves
 * ------------------------------------------------------------------ */
function freshPuzzle(p) {
  const q = p.parameters, board = boardFor(p);
  if (q.mode === 'walk') return {walks: [], at: -1};
  if (q.mode === 'peek') return {which: 0, seen: []};
  const labels = q.start, here = rainbows(board.m, labels);
  const found = q.mode === 'only' && here.length === 1 && onlyCells(p).includes(here[0]) ? [here[0]] : q.mode === 'counts' ? [here.length] : [];
  return {labels, found, claimed: false, missed: false};
}

// A walk is a list of doors, each crossing from the cell the walk is in.
// Walks start at an outside door or in a rainbow; `at` is the cell the
// current walk stands in, or -1 between walks.
function replay(m, labels, walks) {
  const used = new Set();
  let at = -1;
  for (const [w, walk] of walks.entries()) {
    if (!Array.isArray(walk) || !walk.length) return null;
    let cell = -1;
    for (const [k, step] of walk.entries()) {
      if (!integer(step)) return null;
      if (k === 0 && step < 0) {
        // A walk that starts inside a rainbow is written as -1 - cell.
        cell = -1 - step;
        if (cell >= m.cells.length || !isRainbow(m, labels, cell) || cellDoors(m, labels, cell).some(e => used.has(e))) return null;
        continue;
      }
      if (step < 0 || step >= m.edges.length || !isDoor(m, labels, step) || used.has(step)) return null;
      if (cell === -1) {
        if (k !== 0 || !m.outer[step]) return null;
        cell = m.edgeCells[step][0];
      } else {
        if (!m.cellEdges[cell].includes(step)) return null;
        cell = m.edgeCells[step].find(j => j !== cell) ?? -2;
      }
      used.add(step);
      if (cell === -2) { if (k !== walk.length - 1) return null; break; }
      if (!cellDoors(m, labels, cell).some(e => !used.has(e)) && k !== walk.length - 1) return null;
    }
    const open = cell >= 0 && cellDoors(m, labels, cell).some(e => !used.has(e));
    if (open && w !== walks.length - 1) return null;
    at = open ? cell : -1;
  }
  return {used, at};
}
const walkState = (p, b) => { const board = boardFor(p); return replay(board.m, p.parameters.start, b.walks); };

const hiddenOf = (p, b) => p.parameters.hidden[b.which];
const seenSet = (p, b) => new Set([...boardFor(p).corners, ...b.seen]);
const foundIn = (p, b) => { const m = boardFor(p).m, seen = seenSet(p, b), labels = hiddenOf(p, b); return m.cells.findIndex((c, i) => c.every(k => seen.has(k)) && isRainbow(m, labels, i)); };

function validPuzzle(p, b) {
  const q = p.parameters, board = boardFor(p), m = board.m;
  if (!object(b)) return false;
  if (q.mode === 'walk') return Array.isArray(b.walks) && b.walks.length <= m.edges.length && integer(b.at) && walkState(p, b)?.at === b.at;
  if (q.mode === 'peek') {
    if (!integer(b.which) || b.which < 0 || b.which >= q.hidden.length || !Array.isArray(b.seen) || b.seen.length > q.budget) return false;
    if (new Set(b.seen).size !== b.seen.length || !b.seen.every(k => integer(k) && k >= 0 && k < m.points.length && !board.corners.includes(k))) return false;
    // Peeking stops once a rainbow shows.
    const before = {...b, seen: b.seen.slice(0, -1)};
    return !b.seen.length || foundIn(p, before) < 0;
  }
  if (!legal(board, b.labels) || !Array.isArray(b.found) || !['claimed', 'missed'].every(k => typeof b[k] === 'boolean')) return false;
  if ([...b.labels].some((c, k) => (q.locked || []).includes(k) && c !== q.start[k])) return false;
  if (new Set(b.found).size !== b.found.length || !b.found.every(integer)) return false;
  const now = rainbows(m, b.labels);
  if (q.mode === 'only') return b.found.every(i => onlyCells(p).includes(i)) && (now.length !== 1 || !onlyCells(p).includes(now[0]) || b.found.includes(now[0])) && !b.claimed && !b.missed;
  if (q.mode === 'counts') {
    const all = countsOf(board);
    if (!b.found.every(n => all.includes(n)) || !b.found.includes(now.length)) return false;
    const every = all.every(n => b.found.includes(n));
    return !(b.claimed && !every) && !(b.missed && every) && !(b.claimed && b.missed);
  }
  return !b.found.length && !b.claimed && !b.missed;
}
function solvedPuzzle(p, b) {
  if (!validPuzzle(p, b)) return false;
  const q = p.parameters, m = boardFor(p).m;
  if (q.mode === 'count') return rainbows(m, b.labels).length === q.target;
  if (q.mode === 'only') return onlyCells(p).every(i => b.found.includes(i));
  if (q.mode === 'counts') return b.claimed;
  if (q.mode === 'walk') return b.at === -1 && walkState(p, b).used.size === doorsOf(m, q.start).length;
  return foundIn(p, b) >= 0;
}

// The board after a dot changes: an only rainbow or a new count is collected.
function withLabels(p, b, labels) {
  const next = {...b, labels, missed: false}, now = rainbows(boardFor(p).m, labels);
  if (p.parameters.mode === 'only' && now.length === 1 && onlyCells(p).includes(now[0]) && !b.found.includes(now[0])) next.found = [...b.found, now[0]];
  if (p.parameters.mode === 'counts' && !b.found.includes(now.length)) next.found = [...b.found, now.length];
  return next;
}
function stepWalk(p, b, action) {
  const board = boardFor(p), m = board.m, labels = p.parameters.start, walks = b.walks.map(w => [...w]);
  if (action.type === 'start') {
    if (b.at !== -1 || !integer(action.cell)) return null;
    walks.push([-1 - action.cell]);
  } else if (action.type === 'door' && integer(action.door)) {
    if (b.at === -1) walks.push([action.door]); else walks[walks.length - 1].push(action.door);
  } else return null;
  const state = replay(m, labels, walks);
  return state && {walks, at: state.at};
}
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, board = boardFor(p);
  if (q.mode === 'walk') return stepWalk(p, b, action);
  if (q.mode === 'peek') {
    if (action.type === 'again') return b.seen.length ? {which: (b.which + 1) % q.hidden.length, seen: []} : null;
    if (action.type !== 'peek' || !integer(action.point) || b.seen.length >= q.budget) return null;
    const next = {...b, seen: [...b.seen, action.point]};
    return validPuzzle(p, next) ? next : null;
  }
  if (action.type === 'claim') {
    if (q.mode !== 'counts' || b.missed) return null;
    return countsOf(board).every(n => b.found.includes(n)) ? {...b, claimed: true} : {...b, missed: true};
  }
  if (action.type !== 'turn' || !integer(action.point) || action.point < 0 || action.point >= board.allowed.length) return null;
  const k = action.point;
  if (board.allowed[k].length < 2 || (q.locked || []).includes(k)) return null;
  const c = action.letter === undefined ? nextLetter(board, b.labels, k) : action.letter;
  if (typeof c !== 'string' || c.length !== 1 || !board.allowed[k].includes(c) || c === b.labels[k]) return null;
  return withLabels(p, b, turn(b.labels, k, c));
}

/* ------------------------------------------------------------------ *
 * Hints: the nearest labelling that does the job, one dot at a time.
 * ------------------------------------------------------------------ */
const distance = (a, b) => { let d = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) d++; return d; };
function nearestFilling(p, labels, good) {
  const q = p.parameters, board = boardFor(p);
  let best = null, bestD = Infinity;
  for (const f of fillings(board)) {
    if ((q.locked || []).some(k => f[k] !== q.start[k])) continue;
    const d = distance(f, labels);
    if (d < bestD && good(f)) { best = f; bestD = d; if (d <= 1) break; }
  }
  return best;
}
const turnHint = (labels, target) => { const k = [...labels].findIndex((c, i) => c !== target[i]); return {type: 'move', action: {type: 'turn', point: k, letter: target[k]}, text: `Make the glowing dot ${target[k]}.`}; };
function walkHint(p, b) {
  const board = boardFor(p), m = board.m, labels = p.parameters.start, used = walkState(p, b).used;
  if (b.at !== -1) {
    const door = cellDoors(m, labels, b.at).find(e => !used.has(e));
    return {type: 'move', action: {type: 'door', door}, text: 'Go through the glowing door.'};
  }
  const outside = doorsOf(m, labels).find(e => m.outer[e] && !used.has(e));
  if (outside !== undefined) return {type: 'move', action: {type: 'door', door: outside}, text: 'Come in through the glowing door.'};
  // Puzzles have no closed loops of doors, so the rest start in rainbows.
  const start = rainbows(m, labels).find(i => cellDoors(m, labels, i).every(e => !used.has(e)));
  return {type: 'move', action: {type: 'start', cell: start}, text: 'Start a walk in the glowing rainbow.'};
}

// The search the peek puzzles teach: on the bottom side, between an R and the
// next B, peek halfway; once an R sits next to a B, go through that door
// and peek at the far corner of each triangle until a rainbow shows. A
// walk that comes back out leaves the next R–B pair to try.
export function peekPlan(board, labels, seen) {
  const m = board.m, n = board.steps, known = new Set(seen), tried = new Set();
  for (;;) {
    const bottom = [...Array(n + 1).keys()].filter(k => known.has(k));
    let pair = null;
    for (let i = 0; i + 1 < bottom.length; i++) {
      const a = bottom[i], z = bottom[i + 1];
      if (labels[a] === 'R' && labels[z] === 'B' && !tried.has(`${a},${z}`)) { pair = [a, z]; break; }
    }
    if (!pair) return null;
    const [a, z] = pair;
    if (z - a > 1) return Math.floor((a + z) / 2);
    tried.add(`${a},${z}`);
    let door = m.index.get(`${a},${z}`), cell = m.edgeCells[door][0];
    for (;;) {
      const unseen = m.cells[cell].find(k => !known.has(k));
      if (unseen !== undefined) return unseen;
      if (isRainbow(m, labels, cell)) return -1;
      door = cellDoors(m, labels, cell).find(e => e !== door);
      const other = m.edgeCells[door].find(j => j !== cell);
      if (other === undefined) { tried.add(m.edges[door].join(',')); break; }
      cell = other;
    }
  }
}
// How many more peeks the plan needs from here.
export function planCost(board, labels, seen) {
  const list = [...seen];
  for (;;) {
    const k = peekPlan(board, labels, list);
    if (k === -1) return list.length - seen.length;
    if (k === null) return Infinity;
    list.push(k);
  }
}
function peekHint(p, b) {
  const q = p.parameters, board = boardFor(p), labels = hiddenOf(p, b), seen = [...board.corners, ...b.seen];
  if (b.seen.length + planCost(board, labels, seen) > q.budget) return {type: 'move', action: {type: 'again'}, text: `That is too many peeks for ${q.budget}. Start again.`};
  return {type: 'move', action: {type: 'peek', point: peekPlan(board, labels, seen)}, text: 'Peek at the glowing dot.'};
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart this puzzle.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, m = boardFor(p).m;
  if (q.mode === 'walk') return walkHint(p, b);
  if (q.mode === 'peek') return peekHint(p, b);
  if (q.mode === 'counts' && countsOf(boardFor(p)).every(n => b.found.includes(n))) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
  const good = q.mode === 'count' ? f => rainbows(m, f).length === q.target
    : q.mode === 'only' ? f => { const r = rainbows(m, f); return r.length === 1 && onlyCells(p).includes(r[0]) && !b.found.includes(r[0]); }
    : f => !b.found.includes(rainbows(m, f).length);
  return turnHint(b.labels, nearestFilling(p, b.labels, good));
}

/* ------------------------------------------------------------------ *
 * The playground: boards of 2 to 5 rows and the fan, with doors on show.
 * ------------------------------------------------------------------ */
const freshPlay = (key = '3') => ({board: key, labels: plainLabels(boardOf(PLAY_BOARDS[key]))});
const validPlay = b => object(b) && PLAY_ORDER.includes(b.board) && legal(boardOf(PLAY_BOARDS[b.board]), b.labels);
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  if (action.type === 'size') return PLAY_ORDER.includes(action.board) && (action.board !== b.board || b.labels !== freshPlay(b.board).labels) ? freshPlay(action.board) : null;
  const board = boardOf(PLAY_BOARDS[b.board]), k = action.point;
  if (action.type !== 'turn' || !integer(k) || k < 0 || k >= board.allowed.length || board.allowed[k].length < 2) return null;
  return {...b, labels: turn(b.labels, k, nextLetter(board, b.labels, k))};
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {doors: false}); return uiState.get(p.id); };
const LETTER_NAMES = {R: 'R, red', B: 'B, blue', Y: 'Y, yellow'};
// Accessible names: a dot by its row from the bottom and place in the row,
// a middle dot by the triangle it sits in; triangles as numbered in the guide.
function pointName(board, k) {
  const n = board.steps;
  let row = 0, start = 0;
  while (row <= n && k >= start + n - row + 1) { start += n - row + 1; row++; }
  return row > n ? 'Middle dot' : `Dot ${k - start + 1} in row ${row + 1}`;
}
const rainbowDefs = '<defs><linearGradient id="rb-glow" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#eeaa98"/><stop offset=".5" stop-color="#f4d27e"/><stop offset="1" stop-color="#a6d0e4"/></linearGradient></defs>';
const mid = (m, e, t = .5) => { const [a, b] = m.edges[e]; return [0, 1].map(d => m.xy[a][d] + (m.xy[b][d] - m.xy[a][d]) * t); };
// A door: the middle part of an R–B edge, drawn as a thick bar.
const doorPath = (m, e) => { const [x1, y1] = mid(m, e, .3), [x2, y2] = mid(m, e, .7); return `M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`; };
// A walk drawn from door to door through the middles of its triangles.
function trail(m, walk) {
  const pts = [];
  let cell = -1;
  for (const [k, step] of walk.entries()) {
    if (k === 0 && step < 0) { cell = -1 - step; pts.push(m.centre[cell]); continue; }
    const [a, b] = m.edges[step], out = [0, 1].map(d => (m.xy[a][d] + m.xy[b][d]) / 2);
    if (cell === -1) {
      // From just outside the door.
      const c = m.centre[m.edgeCells[step][0]];
      pts.push(out.map((v, d) => v + (v - c[d]) * .35));
      cell = m.edgeCells[step][0];
      pts.push(out, m.centre[cell]);
    } else {
      const other = m.edgeCells[step].find(j => j !== cell);
      pts.push(out);
      if (other === undefined) { const c = m.centre[cell]; pts.push(out.map((v, d) => v + (v - c[d]) * .35)); break; }
      cell = other; pts.push(m.centre[cell]);
    }
  }
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('');
}

function drawBoard(p, board, labels, opts) {
  const m = board.m, hint = opts.hint?.action, live = !opts.solved, seen = opts.seen, found = new Set(opts.found || []);
  // Only rainbows whose three letters show count as seen.
  const rb = new Set(rainbows(m, labels).filter(i => !seen || m.cells[i].every(k => seen.has(k))));
  const cell = i => ({
    cls: [rb.has(i) ? 'rb-rainbow' : '', hint?.type === 'start' && hint.cell === i ? 'hinted' : ''].join(' '),
    act: Boolean(opts.startCells?.has(i)),
    label: `Triangle ${i + 1}${rb.has(i) ? ', rainbow' : ''}${found.has(i) ? ', collected' : ''}${opts.startCells?.has(i) ? '. Start a walk here' : ''}`,
    dot: found.has(i) ? 'rb-star' : false
  });
  const known = k => !seen || seen.has(k);
  const doors = opts.doors ? m.edges.map((_, e) => e).filter(e => m.edges[e].every(known) && isDoor(m, labels, e)) : [];
  const used = opts.used || new Set();
  const edge = e => opts.doorControls?.has(e) ? {act: true, cls: `rb-door-hit${hint?.type === 'door' && hint.door === e ? ' hinted' : ''}`, label: `Door ${m.outer[e] ? 'on the outside' : `between triangles ${m.edgeCells[e].map(i => i + 1).join(' and ')}`}${used.has(e) ? ', walked' : ''}`} : null;
  const free = new Set(board.spec.free || []);
  const point = k => {
    const letter = known(k) ? labels[k] : null, fixed = board.allowed[k].length < 2 || (p.parameters.locked || []).includes(k);
    const act = live && (opts.peek ? !known(k) && opts.canPeek : opts.turn && !fixed);
    const hinted = (hint?.type === 'turn' || hint?.type === 'peek') && hint.point === k;
    const what = letter ? LETTER_NAMES[letter] : 'hidden';
    const verb = act ? (opts.peek ? '. Peek' : `. Change to ${nextLetter(board, labels, k)}`) : '';
    return {cls: `rb-dot ${letter ? `rb-${letter}` : 'rb-hidden'}${fixed && opts.turn ? ' fixed' : ''}${free.has(k) ? ' rb-free' : ''}${hinted ? ' hinted' : ''}`, act, text: letter || '?', label: `${pointName(board, k)}${free.has(k) ? ', starred, may be any letter' : ''}, ${what}${verb}`};
  };
  // A starred dot's star sits just outside the big triangle, beside its dot.
  const pip = pipRadius(m, {pipPx: opts.pipPx ?? 16}), [cx, cy] = [0, 1].map(d => board.corners.reduce((s, k) => s + m.xy[k][d], 0) / 3);
  const stars = [...free].map(k => {
    const [x, y] = m.xy[k], d = Math.hypot(x - cx, y - cy);
    return `<text class="rb-star-mark" x="${(x + (x - cx) / d * pip * 1.9).toFixed(2)}" y="${(y + (y - cy) / d * pip * 1.9 + pip * .45).toFixed(2)}" font-size="${(pip * 1.3).toFixed(2)}" aria-hidden="true">★</text>`;
  }).join('');
  const doorMarks = doors.map(e => `<path class="rb-door-halo" d="${doorPath(m, e)}"/><path class="rb-door${used.has(e) ? ' walked' : ''}${m.outer[e] ? ' outer' : ''}" d="${doorPath(m, e)}"/>`).join('');
  const trails = (opts.walks || []).map((w, i, all) => `<path class="rb-trail${i === all.length - 1 && opts.at >= 0 ? ' live' : ''}" d="${trail(m, w)}"/>`).join('');
  const walker = opts.at >= 0 ? `<circle class="rb-walker" cx="${m.centre[opts.at][0].toFixed(2)}" cy="${m.centre[opts.at][1].toFixed(2)}" r="${(Math.min(10, m.shortest) * .16).toFixed(2)}"/>` : '';
  return meshBoard(m, {cls: `rb-board${opts.solved ? ' solved' : ''} ${opts.cls || ''}`, label: opts.label || 'Board', cell, edge, point, pipPx: opts.pipPx ?? 16, reach: .42, under: rainbowDefs, over: `${doorMarks}${trails}${walker}${stars}`, picture: opts.picture});
}

const moveButton = (label, action, cls = '', extra = '') => `<button type="button" class="secondary rb-action ${cls}" data-rb-move="${esc(JSON.stringify(action))}" data-focus="rb-${action.type}" ${extra}>${label}</button>`;
const doorToggle = on => `<button type="button" class="secondary rb-toggle" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({doors: !on}))}" data-focus="rb-doors" aria-pressed="${on}">Doors</button>`;
const counter = (label, n, of, over) => `<p class="rb-counter" aria-label="${label}: ${n}${of === undefined ? '' : ` of ${of}`}">${label} <strong class="${over ? 'over' : ''}">${n}</strong>${of === undefined ? '' : ` / ${of}`}</p>`;

function renderPuzzle(p, a) {
  const q = p.parameters, b = a.board, board = boardFor(p), m = board.m, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action?.type, state = ui(p);
  let body, top = '', bottom = '', status;
  if (q.mode === 'walk') {
    const labels = q.start, {used, at} = walkState(p, b), all = doorsOf(m, labels);
    const doorControls = new Set(solved ? [] : at >= 0 ? cellDoors(m, labels, at).filter(e => !used.has(e)) : all.filter(e => m.outer[e] && !used.has(e)));
    const startCells = new Set(solved || at >= 0 ? [] : rainbows(m, labels).filter(i => cellDoors(m, labels, i).every(e => !used.has(e))));
    body = drawBoard(p, board, labels, {hint, solved, doors: true, used, doorControls, startCells, walks: b.walks, at, label: 'Board'});
    top = counter('Doors walked', used.size, all.length);
    status = `${used.size} of ${plural(all.length, 'door', 'doors')} walked${at >= 0 ? `, in triangle ${at + 1}` : ''}.`;
  } else if (q.mode === 'peek') {
    const labels = hiddenOf(p, b), seen = seenSet(p, b), over = b.seen.length >= q.budget && !solved;
    body = drawBoard(p, board, labels, {hint, solved, peek: true, canPeek: b.seen.length < q.budget, seen, doors: true, label: 'Hidden board'});
    top = counter('Peeks', b.seen.length, q.budget, over);
    bottom = solved ? '' : `<div class="rb-actions">${moveButton('Start again', {type: 'again'}, h === 'again' ? 'hinted' : '', b.seen.length ? '' : 'disabled')}</div>`;
    status = `${plural(b.seen.length, 'peek', 'peeks')} of ${q.budget}.`;
  } else {
    const now = rainbows(m, b.labels).length;
    body = drawBoard(p, board, b.labels, {hint, solved, turn: true, doors: state.doors, found: q.mode === 'only' ? b.found : [], label: 'Board'});
    top = `<div class="rb-bar">${counter('Rainbows', now)}${doorToggle(state.doors)}</div>`;
    if (q.mode === 'counts') {
      const shelf = `<ol class="rb-shelf" aria-label="Numbers found">${[...b.found].sort((x, y) => x - y).map(n => `<li class="${n === now ? 'here' : ''}">${n}</li>`).join('')}</ol>`;
      const actions = solved ? '' : `<div class="rb-actions">${moveButton('That’s all', {type: 'claim'}, h === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '')}</div>`;
      bottom = `${shelf}${actions}${b.missed ? '<p class="rb-note" role="status">There’s another.</p>' : ''}`;
    }
    status = `${plural(now, 'rainbow', 'rainbows')}.`;
  }
  return `<div class="rb-puzzle mode-${q.mode}${solved ? ' solved' : ''}" data-mechanic-wire="rainbow">${top}<div class="rb-stage">${body}</div>${bottom}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const sizeIcon = key => { const board = boardOf(PLAY_BOARDS[key]); return meshBoard(board.m, {cls: 'rb-size-icon', label: key === 'fan' ? 'Fan board' : `${key} rows`, picture: true}); };
function renderPlay(p, a) {
  const b = a.board, board = boardOf(PLAY_BOARDS[b.board]), state = ui(p), now = rainbows(board.m, b.labels).length;
  const sizes = `<div class="rb-tools" role="group" aria-label="Board">${PLAY_ORDER.map(key => `<button type="button" class="secondary rb-tool rb-size" data-rb-move="${esc(JSON.stringify({type: 'size', board: key}))}" data-focus="rb-size-${key}" aria-pressed="${b.board === key}" aria-label="${key === 'fan' ? 'Fan board' : `${key} rows`}">${sizeIcon(key)}</button>`).join('')}</div>`;
  const body = drawBoard(p, board, b.labels, {turn: true, doors: state.doors, label: 'Board'});
  return `<div class="rb-puzzle mode-playground" data-mechanic-wire="rainbow">${sizes}<div class="rb-bar">${counter('Rainbows', now)}${doorToggle(state.doors)}</div><div class="rb-stage">${body}</div><p class="sr-only" role="status">${esc(`${plural(now, 'rainbow', 'rainbows')}.`)}</p></div>`;
}

function wire(root, p, api) {
  const b = () => api.attempt().board;
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-rb-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    try { api.apply(JSON.parse(control.dataset.rbMove)); } catch { /* malformed control data is ignored */ }
  });
  const m = boardFor(p, b()).m;
  wireTri(root, m, {
    point: k => (p.parameters.mode === 'peek' ? {type: 'peek', point: k} : {type: 'turn', point: k}),
    edge: e => ({type: 'door', door: e}),
    cell: i => ({type: 'start', cell: i})
  }, api.apply);
}

const hooks = {
  fresh: p => p.parameters.mode === 'playground' ? freshPlay() : freshPuzzle(p),
  valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : MODES.includes(p.parameters.mode) && validPuzzle(p, b),
  solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
  move: (p, b, action) => p.parameters.mode === 'playground' ? movePlay(b, action) : movePuzzle(p, b, action),
  hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
  render: (p, a) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a),
  wire,
  ui(p, payload) { if (object(payload) && typeof payload.doors === 'boolean') ui(p).doors = payload.doors; },
  reset: p => { uiState.delete(p.id); },
  // Undo takes back a move but keeps what was collected.
  carry: (p, from, to) => !['only', 'counts'].includes(p.parameters.mode) || !object(to) || !object(from) ? to : {...to, found: [...to.found, ...from.found.filter(k => !to.found.includes(k))], missed: false},
  noHint: p => p.parameters.mode === 'playground'
};
// Starred dots, a group in this family, plays by the same hooks: its boards
// carry their starred dots.
export const rainbowMechanics = {rainbow: hooks, starred: hooks};

// The family seam entry (dist/families.js).
export default {
  id: 'rainbow',
  family: {id: 'rainbow', symbol: '◭'},
  mechanics: rainbowMechanics,
  pack: new URL('./rainbow.json', import.meta.url).href,
  css: new URL('./rainbow.css', import.meta.url).href,
  focus: '.tg-point[role=button],.tg-hit,.tm-edge-hit,.rb-action:not([disabled])'
};
