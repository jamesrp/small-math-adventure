// Chip firing with a sink (worksheet Week 11). A circle holding at least one
// chip for every line that touches it may fire: one chip leaves along each of
// its lines. The sink keeps every chip it receives and never fires. On a board
// with a sink, every legal run stops, and every complete run from the same
// start has the same finish and the same number of firings at each circle.
import {esc} from '../../expansion-controls.js';

// Positions are percentages of the board box; S is the sink.
export const BOARDS = {
  triangle: {aspect: 1.3, nodes: {A: [24, 24], B: [76, 24]}, sink: [50, 76], edges: [['A', 'B'], ['A', 'S'], ['B', 'S']]},
  square: {aspect: 1.15, nodes: {A: [22, 20], B: [78, 20], C: [78, 78]}, sink: [22, 78], edges: [['A', 'B'], ['B', 'C'], ['C', 'S'], ['S', 'A']]},
  extra: {aspect: 1.15, nodes: {A: [22, 20], B: [78, 20], C: [78, 78]}, sink: [22, 78], edges: [['A', 'B'], ['B', 'C'], ['C', 'S'], ['S', 'A'], ['A', 'C']]},
  star: {aspect: 1.05, nodes: {H: [50, 15], A: [16, 52], B: [50, 52], C: [84, 52]}, sink: [50, 86], edges: [['H', 'A'], ['H', 'B'], ['H', 'C'], ['A', 'S'], ['B', 'S'], ['C', 'S']]},
  path: {aspect: 1.15, nodes: {A: [14, 56], B: [30, 16], C: [70, 16], D: [86, 56]}, sink: [50, 84], edges: [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'S']]},
  kite: {aspect: 1.05, nodes: {A: [50, 14], B: [15, 84], C: [85, 84]}, sink: [50, 58], edges: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'S'], ['B', 'S'], ['C', 'S']]},
  ring: {aspect: 1.15, nodes: {A: [50, 16], B: [17, 80], C: [83, 80]}, sink: null, edges: [['A', 'B'], ['B', 'C'], ['C', 'A']]}
};
export const PLAYGROUND_BOARDS = ['triangle', 'square', 'extra', 'kite', 'star', 'path', 'ring', 'grid'];
export const GRID = 25, GRID_AMOUNTS = [1, 10, 100, 1000];
const GRID_LIMIT = 20000, WORD_LIMIT = 400, PLAY_WORD = 60;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isInteger(value) && value >= 0;
const sum = list => list.reduce((a, b) => a + b, 0);
const key = list => list.join(',');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Degrees, neighbor indices and sink lines for each board, computed once.
const infos = new Map();
export function boardInfo(name) {
  if (infos.has(name)) return infos.get(name);
  const board = BOARDS[name];
  if (!board) return null;
  const ids = Object.keys(board.nodes), index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const nbr = ids.map(() => []), toSink = ids.map(() => 0);
  for (const [a, b] of board.edges) {
    if (a === 'S') toSink[index[b]]++;
    else if (b === 'S') toSink[index[a]]++;
    else { nbr[index[a]].push(index[b]); nbr[index[b]].push(index[a]); }
  }
  const info = {name, board, ids, index, nbr, toSink, deg: ids.map((_, i) => nbr[i].length + toSink[i]), sink: Boolean(board.sink)};
  infos.set(name, info);
  return info;
}
export const canFire = (g, piles, i) => piles[i] >= g.deg[i];
export const readyIndices = (g, piles) => g.ids.map((_, i) => i).filter(i => canFire(g, piles, i));
export function fireAt(g, piles, i) {
  if (!canFire(g, piles, i)) return null;
  const next = [...piles];
  next[i] -= g.deg[i];
  for (const j of g.nbr[i]) next[j]++;
  return {piles: next, sink: g.toSink[i]};
}
// One complete legal run, firing the first ready circle each time. On a board
// without a sink, it stops at the first repeated position.
export function stabilize(g, start, limit = WORD_LIMIT) {
  let piles = [...start], sink = 0, word = '';
  const seen = new Set([key(piles)]);
  for (let step = 0; step < limit; step++) {
    const i = g.ids.findIndex((_, j) => canFire(g, piles, j));
    if (i < 0) return {piles, sink, word, looped: false};
    const next = fireAt(g, piles, i);
    piles = next.piles; sink += next.sink; word += g.ids[i];
    if (seen.has(key(piles))) return {piles, sink, word, looped: true};
    seen.add(key(piles));
  }
  return null;
}
function compositions(total, slots) {
  if (slots === 1) return [[total]];
  const out = [];
  for (let first = 0; first <= total; first++) for (const rest of compositions(total - first, slots - 1)) out.push([first, ...rest]);
  return out;
}
const placeable = (p, g) => (p.parameters.on || g.ids).map(id => g.index[id]);
function startsWith(p, g) {
  const spots = placeable(p, g);
  return compositions(p.parameters.chips, spots.length).map(parts => {
    const start = g.ids.map(() => 0);
    parts.forEach((n, i) => { start[spots[i]] = n; });
    return start;
  });
}

// Every answer a puzzle accepts, with a witness: an order, or a start (and the
// dropped chip) that produces it. Exhaustive over the authored small boards.
const answerCache = new Map();
export function answers(p) {
  const cacheKey = `${p.id}|${JSON.stringify(p.parameters)}`;
  if (answerCache.has(cacheKey)) return answerCache.get(cacheKey);
  const q = p.parameters, g = boardInfo(q.board), found = new Map();
  if (q.mode === 'orders') {
    (function walk(piles, word) {
      const ready = readyIndices(g, piles);
      if (!ready.length) { found.set(word, {word}); return; }
      if (word.length >= WORD_LIMIT || found.size > 500) return;
      for (const i of ready) walk(fireAt(g, piles, i).piles, word + g.ids[i]);
    })([...q.start], '');
  } else if (q.mode === 'avalanche') {
    const caps = g.deg.map(d => d - 1);
    (function bases(i, base) {
      if (i === caps.length) {
        for (let j = 0; j < base.length; j++) {
          const start = [...base]; start[j]++;
          const run = stabilize(g, start);
          if (run.word.length >= q.firings) found.set(`${key(base)}+${g.ids[j]}`, {placed: base, drop: g.ids[j]});
        }
        return;
      }
      for (let n = 0; n <= caps[i]; n++) bases(i + 1, [...base, n]);
    })(0, []);
  } else {
    for (const start of startsWith(p, g)) {
      const run = stabilize(g, start);
      if (q.mode === 'finishes') { if (!run.looped && !found.has(key(run.piles))) found.set(key(run.piles), {placed: start}); }
      else if (q.mode === 'starts') { if (!run.looped && key(run.piles) === key(q.finish)) found.set(key(start), {placed: start}); }
      else if (q.mode === 'firings') { if (!run.looped && run.word.length === q.firings) found.set(key(start), {placed: start}); }
      else if (q.mode === 'loop') { if (run.looped) found.set(key(start), {placed: start}); }
    }
  }
  answerCache.set(cacheKey, found);
  return found;
}

const exhaustive = p => ['orders', 'finishes', 'starts'].includes(p.parameters.mode);
// That's all needs something on the shelf, and after a refusal it stays off
// until the shelf grows (a stale refusal on a full shelf from an older save
// does not lock it).
const claimOpen = (p, b) => exhaustive(p) && b.found.length > 0 && !(b.claim === 'more' && b.found.length < p.parameters.answers);
const supplied = q => ['finishes', 'starts', 'firings', 'loop'].includes(q.mode);
const emptyRun = (p, g) => ({placed: p.parameters.mode === 'orders' ? [...p.parameters.start] : g.ids.map(() => 0), word: '', drop: null});
// Replays the current run from its start. Returns null for an impossible board.
export function runOf(p, b) {
  const q = p.parameters, g = boardInfo(q.board);
  const start = [...b.placed];
  if (b.drop) start[g.index[b.drop]]++;
  const placing = q.mode === 'orders' ? false : q.mode === 'avalanche' ? !b.drop : sum(b.placed) < q.chips;
  if (placing && b.word) return null;
  let piles = [...start], sink = 0, looped = false;
  const seen = new Set([key(piles)]), path = [{piles, sink}];
  for (const id of b.word) {
    if (looped) return null;
    const next = Object.hasOwn(g.index, id) ? fireAt(g, piles, g.index[id]) : null;
    if (!next) return null;
    piles = next.piles; sink += next.sink;
    if (seen.has(key(piles))) looped = true;
    seen.add(key(piles)); path.push({piles, sink});
  }
  const ready = placing || looped ? [] : readyIndices(g, piles);
  const finished = !placing && (looped || !ready.length);
  let item = null;
  if (finished) {
    if (q.mode === 'orders') item = b.word;
    else if (q.mode === 'finishes' && !looped) item = key(piles);
    else if (q.mode === 'starts' && key(piles) === key(q.finish)) item = key(b.placed);
    else if (q.mode === 'firings' && b.word.length === q.firings) item = key(b.placed);
    else if (q.mode === 'avalanche' && b.word.length >= q.firings) item = `${key(b.placed)}+${b.drop}`;
    else if (q.mode === 'loop' && looped) item = key(b.placed);
  }
  return {g, start, piles, sink: g.sink ? sink : null, placing, ready, finished, looped, item, path, left: supplied(q) ? q.chips - sum(b.placed) : null};
}
function validPuzzleBoard(p, b) {
  const q = p.parameters, g = boardInfo(q.board);
  if (!g || !object(b) || !Array.isArray(b.placed) || b.placed.length !== g.ids.length || !b.placed.every(count)) return false;
  if (typeof b.word !== 'string' || b.word.length > WORD_LIMIT || !Array.isArray(b.found) || !b.found.every(item => typeof item === 'string')) return false;
  if (new Set(b.found).size !== b.found.length || b.found.length > q.answers || !b.found.every(item => answers(p).has(item))) return false;
  if (q.mode === 'orders') { if (key(b.placed) !== key(q.start) || b.drop !== null) return false; }
  else if (q.mode === 'avalanche') {
    if (!b.placed.every((n, i) => n < g.deg[i])) return false;
    if (b.drop !== null && (!Object.hasOwn(g.index, b.drop) || b.placed[g.index[b.drop]] + 1 < g.deg[g.index[b.drop]])) return false;
  } else {
    if (b.drop !== null || sum(b.placed) > q.chips) return false;
    const spots = new Set(placeable(p, g));
    if (b.placed.some((n, i) => n && !spots.has(i))) return false;
  }
  if (b.claim !== undefined && (!['open', 'more', 'all'].includes(b.claim) || !exhaustive(p) || b.claim === 'all' && b.found.length !== q.answers)) return false;
  if (b.told !== undefined && !(b.told === true && ['more', 'open'].includes(b.claim))) return false;
  return Boolean(runOf(p, b));
}
// Missing claim is the legacy count-based save format: preserve completed saves.
const solvedPuzzle = (p, b) => validPuzzleBoard(p, b) && b.found.length >= p.parameters.answers && (!exhaustive(p) || b.claim === undefined || b.claim === 'all');
function record(p, b) {
  const run = runOf(p, b);
  return run?.item !== null && run?.item !== undefined && answers(p).has(run.item) && !b.found.includes(run.item) ? {...b, found: [...b.found, run.item], ...(exhaustive(p) ? {claim: 'open'} : {})} : b;
}
function movePuzzle(p, b, action) {
  if (!validPuzzleBoard(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, g = boardInfo(q.board), run = runOf(p, b);
  // A refusal's line shows only on the board the claim made.
  b = untold(b);
  if (action.type === 'all') {
    if (!claimOpen(p, b)) return null;
    return b.found.length === q.answers ? {...b, claim: 'all'} : {...b, claim: 'more', told: true};
  }
  // A new run keeps the shelf and any refusal of it.
  if (action.type === 'again') {
    const fresh = emptyRun(p, g);
    return b.word || b.drop || key(b.placed) !== key(fresh.placed) ? {...b, ...fresh, ...(exhaustive(p) ? {claim: b.claim ?? 'open'} : {})} : null;
  }
  const i = typeof action.node === 'string' && Object.hasOwn(g.index, action.node) ? g.index[action.node] : -1;
  if (i < 0) return null;
  if (action.type === 'add') {
    if (!run.placing || !placeable(p, g).includes(i)) return null;
    const placed = [...b.placed];
    if (q.mode === 'avalanche' && placed[i] + 1 >= g.deg[i]) return record(p, {...b, drop: g.ids[i]});
    placed[i]++;
    return record(p, {...b, placed});
  }
  if (action.type === 'fire') {
    if (run.finished || !run.ready.includes(i)) return null;
    return record(p, {...b, word: b.word + g.ids[i]});
  }
  return null;
}
// Hints aim at an answer not yet found and never undo a discovery.
function hintPuzzle(p, b) {
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, g = boardInfo(q.board), run = runOf(p, b);
  if (exhaustive(p) && b.found.length === q.answers) return {type: 'move', action: {type: 'all'}, text: 'Every answer is saved. Press That’s all.'};
  const open = [...answers(p)].filter(([item]) => !b.found.includes(item)).map(([, witness]) => witness);
  const again = text => ({type: 'move', action: {type: 'again'}, text});
  if (q.mode === 'orders') {
    const word = !run.finished && open.find(w => w.word.startsWith(b.word))?.word;
    if (word) return {type: 'move', action: {type: 'fire', node: word[b.word.length]}, text: `Fire ${word[b.word.length]}. An order you haven’t found yet goes this way.`};
    return again(run.finished ? 'Press New run. Next time, choose a different circle at an earlier step.' : 'Every order from here has been found. Press New run and choose differently earlier.');
  }
  const fits = w => b.placed.every((n, i) => n <= w.placed[i]);
  if (run.placing) {
    const target = open.find(fits);
    if (!target) return again('No new answer starts with these chips. Press New run and place them differently.');
    const i = target.placed.findIndex((n, j) => n > b.placed[j]);
    const node = i >= 0 ? g.ids[i] : target.drop;
    return {type: 'move', action: {type: 'add', node}, text: `Put a chip on ${node}.`};
  }
  const live = !run.finished && open.some(w => key(w.placed) === key(b.placed) && (q.mode !== 'avalanche' || w.drop === b.drop));
  if (live) { const node = g.ids[run.ready[0]]; return {type: 'move', action: {type: 'fire', node}, text: `Fire ${node}.`}; }
  return again(run.finished ? 'Press New run and try a different start.' : 'This start won’t give a new answer. Press New run and try a different start.');
}

// The playground: any board, chips added and fired freely, nothing to solve.
function freshPlay(name = 'triangle') {
  if (name === 'grid') return {board: 'grid', piles: Array(GRID * GRID).fill(0), sink: 0, fired: 0};
  const g = boardInfo(name);
  return {board: name, piles: g.ids.map(() => 0), sink: g.sink ? 0 : null, word: '', loop: false};
}
function validPlay(b) {
  if (!object(b) || !PLAYGROUND_BOARDS.includes(b.board) || !Array.isArray(b.piles) || !b.piles.every(count)) return false;
  if (b.board === 'grid') return b.piles.length === GRID * GRID && sum(b.piles) <= GRID_LIMIT && count(b.sink) && count(b.fired) && b.piles.every(n => n < 4);
  const g = boardInfo(b.board);
  return b.piles.length === g.ids.length && sum(b.piles) <= 999 && (g.sink ? count(b.sink) : b.sink === null) && typeof b.word === 'string' && b.word.length <= PLAY_WORD && [...b.word].every(id => Object.hasOwn(g.index, id)) && typeof b.loop === 'boolean';
}
// Sandpile waves: every ready cell fires at once (as often as it can), and
// chips that cross the edge fall into the sink. The order cannot matter.
export function gridWave(piles) {
  const next = [...piles];
  let lost = 0, fired = 0;
  for (let i = 0; i < piles.length; i++) {
    const k = Math.floor(piles[i] / 4);
    if (!k) continue;
    const x = i % GRID, y = Math.floor(i / GRID);
    next[i] -= 4 * k; fired += k;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) lost += k; else next[ny * GRID + nx] += k;
    }
  }
  return {piles: next, lost, fired};
}
export function settleGrid(piles) {
  let current = piles, lost = 0, fired = 0, waves = 0;
  while (current.some(n => n >= 4)) { const w = gridWave(current); current = w.piles; lost += w.lost; fired += w.fired; waves++; }
  return {piles: current, lost, fired, waves};
}
function playStep(g, b, i) {
  const next = fireAt(g, b.piles, i);
  return next && {...b, piles: next.piles, sink: g.sink ? b.sink + next.sink : null, word: (b.word + g.ids[i]).slice(-PLAY_WORD), loop: false};
}
// Fire All: fire the first ready circle until none can; without a sink, stop
// at the first repeated board.
function settleRun(g, start) {
  const run = stabilize(g, start);
  return {piles: run.piles, sink: run.sink, word: run.word, loop: run.looped};
}
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  if (action.type === 'board') return PLAYGROUND_BOARDS.includes(action.board) && action.board !== b.board ? freshPlay(action.board) : null;
  if (action.type === 'clear') return freshPlay(b.board);
  if (b.board === 'grid') {
    const cell = action.cell, amount = action.amount;
    if (action.type !== 'add' || !Number.isInteger(cell) || cell < 0 || cell >= GRID * GRID || !GRID_AMOUNTS.includes(amount)) return null;
    const piles = [...b.piles]; piles[cell] += amount;
    const settled = settleGrid(piles);
    return {...b, piles: settled.piles, sink: b.sink + settled.lost, fired: b.fired + settled.fired};
  }
  const g = boardInfo(b.board), i = typeof action.node === 'string' && Object.hasOwn(g.index, action.node) ? g.index[action.node] : -1;
  if (action.type === 'add' && i >= 0) { if (sum(b.piles) >= 999) return null; const piles = [...b.piles]; piles[i]++; return {...b, piles, loop: false}; }
  if (action.type === 'fire' && i >= 0) return playStep(g, b, i);
  if (action.type === 'settle') {
    if (!readyIndices(g, b.piles).length) return null;
    const run = settleRun(g, b.piles);
    return {...b, piles: run.piles, sink: g.sink ? b.sink + run.sink : null, word: (b.word + run.word).slice(-PLAY_WORD), loop: run.loop};
  }
  return null;
}

// Still boards, a group of this family (mechanic `chipstill`): boards where no
// circle can fire. A board holds its piles and sink count as they are, so a
// long game never runs out of room; in the cycle puzzle these are the start,
// and `steps` replays the run from it: '+' adds a chip at the puzzle's own
// circle and a capital letter fires that circle.
//
// capacity: the most chips with nothing glowing. Each circle holds at most one
//   chip fewer than its lines, so the most is the sum of those; a right Most
//   claim draws that argument on the board.
// cycle: a still start, then a chip at A again and again, firing until still
//   after each. Each still board joins the row; the run ends when one repeats.
//   A start that comes back is shelved. That's all is judged with two
//   different boards tapped in the row that go to the same board: where a
//   start that never comes back runs into the loop.
//
// A refusal sets `told` only on the board the claim made, and its line shows
// only there: the next move or the Undo of the claim press removes it, while
// the lock (`claim`) stays until the board, row or shelf changes. Undo back
// onto that board shows the line again, so each Undo changes the screen.
// A saved still board must also be one play can reach: if anything has fired
// (the sink holds chips, or a circle holds more chips than lines, which adds
// alone can't do), the circles next to the last circle that fired each still
// hold a chip.
const STILL_LIMIT = 30, STEP_LIMIT = 240, SINK_LIMIT = 1e6;
const zeros = g => g.ids.map(() => 0);
const untold = b => { const {told, ...rest} = b; return rest; };
// Undo onto the board a refusal made keeps its line, while the claim it
// carries is still that refusal or one the shelf has since grown past.
const keepTold = (to, next) => to.told === true && (next.claim === to.claim || to.claim === 'more' && next.claim === 'open') ? {...next, told: true} : next;
const reachable = (g, piles, sink) => !(sink > 0 || piles.some((n, i) => n > g.deg[i])) || g.ids.some((_, x) => g.nbr[x].every(j => piles[j] > 0));
export function stillRun(p, b) {
  const q = p.parameters, g = boardInfo(q.board), cycle = q.mode === 'cycle';
  if (!g || !object(b) || !Array.isArray(b.piles) || b.piles.length !== g.ids.length || !b.piles.every(count) || sum(b.piles) > STILL_LIMIT) return null;
  if (!count(b.sink) || b.sink > SINK_LIMIT || !g.sink && b.sink || !reachable(g, b.piles, b.sink)) return null;
  const steps = cycle ? b.steps : '';
  if (typeof steps !== 'string' || steps.length > STEP_LIMIT) return null;
  let piles = [...b.piles], sink = b.sink, ended = false;
  const started = steps.length > 0, record = [], drop = cycle ? g.index[q.at] : -1;
  const still = () => !g.ids.some((_, i) => canFire(g, piles, i));
  const note = () => { const k = key(piles); ended = record.some(r => key(r) === k); record.push([...piles]); };
  if (started) { if (!still()) return null; note(); }
  for (const t of steps) {
    if (ended) return null;
    if (t === '+') {
      if (!still()) return null;
      piles[drop]++;
      if (still()) note();
      continue;
    }
    const next = Object.hasOwn(g.index, t) ? fireAt(g, piles, g.index[t]) : null;
    if (!next) return null;
    piles = next.piles; sink += next.sink;
    if (still()) note();
  }
  const ready = ended ? [] : readyIndices(g, piles);
  const returned = ended && key(record.at(-1)) === key(record[0]);
  return {g, piles, sink, started, ended, ready, record, returned, item: returned ? key(record[0]) : null};
}
// Every still board: each circle holds fewer chips than it has lines.
export function stillBoards(g) {
  return g.deg.reduce((list, d) => list.flatMap(b => Array.from({length: d}, (_, n) => [...b, n])), [[]]);
}
// One chip at the drop circle, then firing until still.
export function addAndSettle(g, piles, at) {
  const start = [...piles]; start[g.index[at]]++;
  return stabilize(g, start).piles;
}
// The still starts that come back (cycle), or the still boards with the most
// chips (capacity), each with its piles.
const stillCache = new Map();
export function stillAnswers(p) {
  const q = p.parameters, cacheKey = `${p.id}|${JSON.stringify(q)}`;
  if (stillCache.has(cacheKey)) return stillCache.get(cacheKey);
  const g = boardInfo(q.board), found = new Map();
  if (q.mode === 'capacity') {
    const most = Math.max(...stillBoards(g).map(sum));
    for (const b of stillBoards(g)) if (sum(b) === most) found.set(key(b), {placed: b});
  } else {
    for (const start of stillBoards(g)) {
      const seen = [key(start)];
      let piles = start;
      while (true) {
        piles = addAndSettle(g, piles, q.at);
        if (seen.includes(key(piles))) { if (key(piles) === seen[0]) found.set(seen[0], {placed: start}); break; }
        seen.push(key(piles));
      }
    }
  }
  stillCache.set(cacheKey, found);
  return found;
}
// Two boards in the row, tapped by position: the same board twice, or two
// different boards whose next boards (a chip at A, then still) are the same.
const sameBoard = (run, i, j) => key(run.record[i]) === key(run.record[j]);
export function mergesAt(p, run, i, j) {
  const n = run.record.length;
  if (![i, j].every(k => Number.isInteger(k) && k >= 0 && k < n) || i === j || sameBoard(run, i, j)) return false;
  const at = p.parameters.at;
  return key(addAndSettle(run.g, run.record[i], at)) === key(addAndSettle(run.g, run.record[j], at));
}
function mergePair(p, run) {
  for (let i = 0; i < run.record.length; i++) for (let j = i + 1; j < run.record.length; j++) if (mergesAt(p, run, i, j)) return [i, j];
  return null;
}
const freshStill = p => {
  const g = boardInfo(p.parameters.board);
  return p.parameters.mode === 'capacity' ? {piles: zeros(g), sink: 0, claim: null} : {piles: zeros(g), sink: 0, steps: '', found: [], claim: 'open', taps: []};
};
const STILL_KEYS = {capacity: ['piles', 'sink', 'claim'], cycle: ['piles', 'sink', 'steps', 'found', 'claim', 'taps']};
const keysAre = (b, list) => { const own = Object.keys(b).filter(k => k !== 'told'); return own.length === list.length && list.every(k => Object.hasOwn(b, k)); };
// That's all (cycle) needs a finished run, something on the shelf and no
// standing refusal; Most (capacity) needs a still board with chips on it.
const pickOpen = (p, b, run) => p.parameters.mode === 'cycle' && b.claim === 'open' && b.found.length > 0 && run.ended;
const mostOpen = (p, b, run) => p.parameters.mode === 'capacity' && b.claim === null && !run.ready.length && sum(run.piles) > 0;
function validStill(p, b) {
  const q = p.parameters;
  if (!object(b) || !STILL_KEYS[q.mode] || !keysAre(b, STILL_KEYS[q.mode])) return false;
  const run = stillRun(p, b);
  if (!run) return false;
  if (b.told !== undefined && !(b.told === true && (q.mode === 'capacity' ? ['more'] : ['more', 'apart', 'open']).includes(b.claim))) return false;
  if (q.mode === 'capacity') {
    if (![null, 'more', 'most'].includes(b.claim)) return false;
    if (b.claim === null) return true;
    // A claim is only ever made on a still board, and judged by its total.
    return !run.ready.length && sum(run.piles) > 0 && (b.claim === 'most') === (sum(run.piles) === q.most);
  }
  if (!Array.isArray(b.found) || !b.found.every(k => typeof k === 'string') || new Set(b.found).size !== b.found.length) return false;
  const answers = stillAnswers(p);
  if (b.found.length > q.answers || !b.found.every(k => answers.has(k))) return false;
  if (run.item && !b.found.includes(run.item)) return false;
  if (!['open', 'more', 'apart', 'all'].includes(b.claim) || !Array.isArray(b.taps)) return false;
  if (b.claim === 'more' && !(b.found.length > 0 && b.found.length < q.answers)) return false;
  // A refused pair belongs to its row: it stands only once a run has started.
  if (b.claim === 'apart' && !(b.found.length && run.started)) return false;
  if (b.claim === 'all') return b.found.length === q.answers && run.ended && b.taps.length === 2 && mergesAt(p, run, ...b.taps);
  return b.taps.length === 0;
}
const solvedStill = (p, b) => validStill(p, b) && (p.parameters.mode === 'capacity' ? b.claim === 'most' : b.claim === 'all');
// A move to a new board; capacity lifts a refused Most, and the cycle shelves
// a start that came back.
function stepStill(p, b, change) {
  const next = {...untold(b), ...change}, run = stillRun(p, next);
  if (!run) return null;
  if (p.parameters.mode === 'capacity') return {...next, claim: null};
  const grew = run.item && !next.found.includes(run.item);
  return grew ? {...next, found: [...next.found, run.item], claim: 'open'} : next;
}
function moveStill(p, b, action) {
  if (!validStill(p, b) || solvedStill(p, b) || !object(action)) return null;
  const q = p.parameters, run = stillRun(p, b), g = run.g;
  if (action.type === 'add' || action.type === 'fire') {
    const i = typeof action.node === 'string' && Object.hasOwn(g.index, action.node) ? g.index[action.node] : -1;
    if (i < 0) return null;
    if (action.type === 'add') {
      if (run.started || canFire(g, run.piles, i) || sum(run.piles) >= STILL_LIMIT) return null;
      const piles = [...b.piles]; piles[i]++;
      return stepStill(p, b, {piles});
    }
    if (!run.ready.includes(i)) return null;
    if (run.started) return stepStill(p, b, {steps: b.steps + g.ids[i]});
    const next = fireAt(g, b.piles, i);
    return stepStill(p, b, {piles: next.piles, sink: b.sink + next.sink});
  }
  if (action.type === 'drop') return q.mode === 'cycle' && !run.ended && !run.ready.length ? stepStill(p, b, {steps: b.steps + '+'}) : null;
  if (action.type === 'most') {
    if (!mostOpen(p, b, run)) return null;
    return sum(run.piles) === q.most ? {...untold(b), claim: 'most'} : {...untold(b), claim: 'more', told: true};
  }
  if (q.mode !== 'cycle') return null;
  // A new run keeps the shelf and a refusal of it; a refused pair belonged to
  // the old row.
  if (action.type === 'again') return b.steps || sum(b.piles) || b.sink ? {...untold(b), piles: zeros(g), sink: 0, steps: '', claim: b.claim === 'apart' ? 'open' : b.claim} : null;
  if (action.type === 'claim') {
    const taps = action.taps;
    if (!pickOpen(p, b, run) || !Array.isArray(taps) || taps.length !== 2) return null;
    const [i, j] = taps;
    if (![i, j].every(k => Number.isInteger(k) && k >= 0 && k < run.record.length) || i === j || sameBoard(run, i, j)) return null;
    if (!mergesAt(p, run, i, j)) return {...untold(b), claim: 'apart', told: true};
    if (b.found.length < q.answers) return {...untold(b), claim: 'more', told: true};
    return {...untold(b), claim: 'all', taps: [i, j]};
  }
  return null;
}
function hintStill(p, b) {
  if (solvedStill(p, b)) return {type: 'done'};
  const q = p.parameters, run = stillRun(p, b), g = run.g;
  const fire = () => { const node = g.ids[run.ready[0]]; return {type: 'move', action: {type: 'fire', node}, text: `Fire ${node}.`}; };
  const add = (i, text = `Put a chip on ${g.ids[i]}.`) => ({type: 'move', action: {type: 'add', node: g.ids[i]}, text});
  if (q.mode === 'capacity') {
    if (run.ready.length) return fire();
    const short = run.piles.findIndex((n, i) => n < g.deg[i] - 1);
    return short >= 0 ? add(short) : {type: 'move', action: {type: 'most'}, text: 'Every circle has one chip fewer than its lines. Press Most.'};
  }
  const again = text => ({type: 'move', action: {type: 'again'}, text});
  const drop = {type: 'move', action: {type: 'drop'}, text: `Add a chip at ${q.at}.`};
  const missing = [...stillAnswers(p).keys()].filter(k => !b.found.includes(k));
  const begin = target => {
    if (run.ready.length || !run.piles.every((n, i) => n <= target[i])) return again('Press New run.');
    const short = run.piles.findIndex((n, i) => n < target[i]);
    return short >= 0 ? add(short) : drop;
  };
  if (missing.length) {
    if (!run.started) return begin(missing[0].split(',').map(Number));
    // A start already saved is not worth finishing; any other run is played out.
    if (!run.ended && !b.found.includes(key(run.record[0]))) return run.ready.length ? fire() : drop;
    return again(run.ended ? 'Press New run and try another start.' : 'This start is saved already. Press New run.');
  }
  // Every start that comes back is saved: show where one that doesn't joins the loop.
  const pair = run.ended && b.claim === 'open' ? mergePair(p, run) : null;
  if (pair) return {type: 'move', action: {type: 'claim', taps: pair}, text: 'Press That’s all, then tap the two different boards that go to the same board.'};
  const empty = g.ids.map(() => 0);
  if (!run.started) return begin(empty);
  if (!run.ended && key(run.record[0]) === key(empty) && b.claim === 'open') return run.ready.length ? fire() : drop;
  return again('Press New run and start with no chips.');
}
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {tool: 'add', amount: 100, cursor: Math.floor(GRID * GRID / 2), pick: null, taps: [], said: null}); return uiState.get(p.id); };
let pending = null;

const chipDots = n => `<span class="chip-dots" aria-hidden="true">${Array.from({length: Math.min(n, 9)}, () => '<i></i>').join('')}${n > 9 ? '<b>+</b>' : ''}</span>`;
const pileCount = n => `<span class="chip-count">${n}</span>`;
function boardSVG(g, marks = '') {
  const at = id => id === 'S' ? g.board.sink : g.board.nodes[id];
  return `<svg class="chip-lines" viewBox="0 0 100 ${(100 / g.board.aspect).toFixed(2)}" preserveAspectRatio="none" aria-hidden="true">${g.board.edges.map(([a, b]) => { const [x1, y1] = at(a), [x2, y2] = at(b); return `<line x1="${x1}" y1="${(y1 / g.board.aspect).toFixed(2)}" x2="${x2}" y2="${(y2 / g.board.aspect).toFixed(2)}"/>`; }).join('')}${marks}</svg>`;
}
// The capacity argument, drawn after a right claim: at every circle each chip
// waits at the end of one line, and one line end is left with no chip, so no
// circle can fire. Units are percent of the board's width on both axes.
function lineEnds(g, piles) {
  const at = id => id === 'S' ? g.board.sink : g.board.nodes[id], y = v => v / g.board.aspect;
  return g.ids.map((id, i) => {
    const [x0, y0] = at(id), ends = g.board.edges.filter(e => e.includes(id)).map(([a, b]) => a === id ? b : a);
    // The bare end goes on the line to the sink where there is one.
    ends.sort((a, b) => (a === 'S') - (b === 'S'));
    return ends.map((to, k) => {
      // Further out on a slanted line, clear of the letter and count badges at the circle's corners.
      const [x1, y1] = at(to), dx = x1 - x0, dy = y(y1) - y(y0), d = Math.hypot(dx, dy), r = 17 + 8 * Math.abs(2 * dx * dy) / (d * d);
      const cx = (x0 + dx * r / d).toFixed(2), cy = (y(y0) + dy * r / d).toFixed(2);
      return k < piles[i] ? `<circle class="chip-end" cx="${cx}" cy="${cy}" r="2.6"/>` : `<circle class="chip-end bare" cx="${cx}" cy="${cy}" r="3.2"/>`;
    }).join('');
  }).join('');
}
const place = ([x, y]) => `left:${x}%;top:${y}%`;
// The main board: lines, a button for each circle, and the sink.
function chipBoard(g, piles, sink, opts) {
  const nodes = g.ids.map((id, i) => {
    const n = piles[i], ready = opts.fire && canFire(g, piles, i), add = opts.add?.(i);
    const enabled = ready || add;
    const label = `${id}: ${plural(n, 'chip')}${ready ? '. Can fire' : opts.showReady && canFire(g, piles, i) ? '. Ready' : ''}${add ? '. Add a chip' : ''}`;
    return `<button type="button" class="chip-node ${(opts.fire || opts.showReady) && canFire(g, piles, i) ? 'ready' : ''} ${ready ? 'can-fire' : ''} ${add ? 'can-add' : ''} ${opts.hinted === id ? 'hinted' : ''}" style="${place(g.board.nodes[id])}" data-chip-move="${esc(JSON.stringify({type: ready ? 'fire' : 'add', node: id}))}" data-node="${id}" data-focus="chip-node-${id}" aria-label="${esc(label)}" ${enabled ? '' : 'aria-disabled="true"'}><span class="chip-letter" aria-hidden="true">${id}</span>${chipDots(n)}${pileCount(n)}</button>`;
  }).join('');
  const sinkBox = g.sink ? `<div class="chip-sink" style="${place(g.board.sink)}" data-node="S" role="img" aria-label="Sink: ${plural(sink, 'chip')}"><span class="chip-sink-label" aria-hidden="true">Sink</span>${chipDots(sink)}${pileCount(sink)}</div>` : '';
  return `<div class="chip-board ${opts.cls || ''}" style="--aspect:${g.board.aspect}" role="group" aria-label="${g.sink ? 'Circles and the sink' : 'Circles, no sink'}">${boardSVG(g, opts.marks)}${sinkBox}${nodes}<div class="chip-fly-layer" aria-hidden="true"></div></div>`;
}
// A small drawing of a board with numbers, for answers and the goal card.
function miniBoard(g, piles, label, cls = '') {
  const at = id => id === 'S' ? g.board.sink : g.board.nodes[id];
  const points = [...Object.values(g.board.nodes), ...(g.sink ? [g.board.sink] : [])], xs = points.map(([x]) => x), ys = points.map(([, y]) => y / g.board.aspect);
  const box = [Math.min(...xs) - 17, Math.min(...ys) - 17, Math.max(...xs) - Math.min(...xs) + 34, Math.max(...ys) - Math.min(...ys) + 34].map(n => n.toFixed(1)).join(' ');
  const lines = g.board.edges.map(([a, b]) => { const [x1, y1] = at(a), [x2, y2] = at(b); return `<line x1="${x1}" y1="${y1 / g.board.aspect}" x2="${x2}" y2="${y2 / g.board.aspect}"/>`; }).join('');
  const nodes = g.ids.map((id, i) => { const [x, y] = g.board.nodes[id]; return `<circle cx="${x}" cy="${y / g.board.aspect}" r="15"/><text x="${x}" y="${y / g.board.aspect + 6.5}">${piles[i]}</text>`; }).join('');
   const sink = g.sink ? `<rect x="${g.board.sink[0] - 13}" y="${g.board.sink[1] / g.board.aspect - 10}" width="26" height="20" rx="4" class="mini-sink"/>` : '';
  return `<svg class="chip-mini ${cls}" viewBox="${box}" role="img" aria-label="${esc(label)}">${lines}${sink}${nodes}</svg>`;
}
const describe = (g, piles) => g.ids.map((id, i) => `${id} ${piles[i]}`).join(', ');
function wordStrip(word, extra = '') {
  return `<div class="chip-word" aria-label="${word ? `Fired: ${[...word].join(' ')}` : 'Nothing fired yet'}">${[...word].map(c => `<span>${c}</span>`).join('')}${extra}</div>`;
}
function renderPuzzle(p, a, ctx = {}) {
  const b = a.board, q = p.parameters, run = runOf(p, b), g = run.g;
  const solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null;
  const hinted = hint?.action?.node || null;
  const spots = new Set(placeable(p, g));
  const goal = q.mode === 'starts' ? `<figure class="chip-goal">${miniBoard(g, q.finish, `Goal finish: ${describe(g, q.finish)}`, 'goal')}</figure>` : '';
  const tray = run.left ? `<div class="chip-tray" role="img" aria-label="${plural(run.left, 'chip')} to place">${chipDots(run.left)}<span class="chip-count">${run.left}</span></div>` : '';
  const counted = ['firings', 'avalanche'].includes(q.mode) ? `<span class="chip-word-count" aria-hidden="true">${b.word.length}</span>` : '';
  const loopMark = run.looped ? '<span class="chip-loop" role="img" aria-label="The board repeated">↻</span>' : '';
  const againButton = (b.word || b.drop || (q.mode !== 'orders' && sum(b.placed))) && !solved ? `<button type="button" class="primary chip-again ${hint?.action?.type === 'again' ? 'hinted' : ''}" data-chip-move="${esc(JSON.stringify({type: 'again'}))}" data-focus="chip-again"><span aria-hidden="true">↺</span> New run</button>` : '';
  const items = exhaustive(p) && b.found.length ? `<ol class="chip-found" aria-label="Saved answers">${b.found.map(item => {
    const fresh = item === run.item ? ' fresh' : '';
    if (q.mode === 'orders') { const finish = stabilize(g, q.start).piles; return `<li class="chip-slot${fresh}"><strong class="chip-slot-word">${esc(item)}</strong>${miniBoard(g, finish, `Finish: ${describe(g, finish)}`)}</li>`; }
    const piles = item.split(',').map(Number);
    return `<li class="chip-slot${fresh}">${miniBoard(g, piles, `${q.mode === 'finishes' ? 'Finish' : 'Start'}: ${describe(g, piles)}`)}</li>`;
  }).join('')}</ol>` : '';
  const claim = exhaustive(p) && !solved ? `<button type="button" class="secondary chip-claim ${hint?.action?.type === 'all' ? 'hinted' : ''}" data-chip-move="${esc(JSON.stringify({type: 'all'}))}" data-focus="chip-all" ${claimOpen(p, b) ? '' : 'disabled'}>That’s all</button>${b.told && b.found.length < q.answers ? '<p class="chip-feedback" role="status">There is another.</p>' : ''}` : '';
  const board = chipBoard(g, run.piles, run.sink, {fire: !run.placing && !run.finished && !solved, add: i => run.placing && !solved && spots.has(i), hinted});
  const missed = run.finished && !run.item && !solved ? ' missed' : '';
  const status = run.placing ? `${run.left === null ? 'Add chips' : `${plural(run.left, 'chip')} to place`}. ${describe(g, run.piles)}.` : `${b.word ? `Fired ${[...b.word].join(' ')}. ` : ''}${describe(g, run.piles)}${g.sink ? `, sink ${run.sink}` : ''}.${run.looped ? ' The board repeated.' : run.finished ? ' No circle can fire.' : ''}`;
  return `<div class="chips-puzzle mode-${q.mode}${missed}" data-mechanic-wire="chips">${goal}${board}${tray}<div class="chip-run">${wordStrip(b.word, counted + loopMark)}${againButton}</div>${items}${claim}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

const thumb = name => {
  if (name === 'grid') return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="2" class="thumb-sink"/>' + [0, 1, 2].flatMap(r => [0, 1, 2].map(c => `<rect x="${9 + c * 8}" y="${9 + r * 8}" width="6" height="6" rx="1"/>`)).join('') + '</svg>';
  const g = boardInfo(name), at = id => id === 'S' ? g.board.sink : g.board.nodes[id], y = v => 4 + v * 32 / 100;
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${g.board.edges.map(([a, b]) => `<line x1="${y(at(a)[0])}" y1="${y(at(a)[1])}" x2="${y(at(b)[0])}" y2="${y(at(b)[1])}"/>`).join('')}${g.sink ? `<rect x="${y(g.board.sink[0]) - 4}" y="${y(g.board.sink[1]) - 3.5}" width="8" height="7" rx="1" class="thumb-sink"/>` : ''}${g.ids.map(id => `<circle cx="${y(g.board.nodes[id][0])}" cy="${y(g.board.nodes[id][1])}" r="4"/>`).join('')}</svg>`;
};
const BOARD_NAMES = {triangle: 'Triangle', square: 'Square', extra: 'Square with a diagonal', kite: 'Sink in the middle', star: 'Star', path: 'Ring of four', ring: 'Triangle with no sink', grid: 'Big grid'};
const uiButton = (label, payload, pressed, extra = '') => `<button type="button" class="secondary chip-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="ui-${esc(JSON.stringify(payload))}" aria-pressed="${pressed}" ${extra}>${label}</button>`;
function renderPlay(p, a) {
  const b = a.board, state = ui(p);
  const picker = `<div class="chip-picker" role="group" aria-label="Boards">${PLAYGROUND_BOARDS.map(name => `<button type="button" class="chip-pick" data-chip-move="${esc(JSON.stringify({type: 'board', board: name}))}" data-focus="chip-board-${name}" aria-label="${BOARD_NAMES[name]}" aria-pressed="${b.board === name}">${thumb(name)}</button>`).join('')}</div>`;
  const clear = `<button type="button" class="secondary chip-tool" data-chip-move="${esc(JSON.stringify({type: 'clear'}))}" data-focus="chip-clear">Clear</button>`;
  if (b.board === 'grid') {
    const amounts = `<div class="chip-tools" role="group" aria-label="Chips per tap">${GRID_AMOUNTS.map(n => uiButton(`+${n}`, {amount: n}, state.amount === n, `aria-label="Add ${n} ${n === 1 ? 'chip' : 'chips'} per tap"`)).join('')}${clear}</div>`;
    const total = sum(b.piles);
    const cells = b.piles.map((n, i) => `<i class="g${n}${i === state.cursor ? ' cursor' : ''}"></i>`).join('');
    return `<div class="chips-play chips-grid-play" data-mechanic-wire="chips">${picker}${amounts}<div class="chip-grid" style="--n:${GRID}" tabindex="0" role="application" data-focus="chip-grid" aria-label="Grid of ${GRID} by ${GRID} squares, edges lead to the sink. Arrow keys move, Enter adds ${state.amount} chips. ${total} chips on the grid, ${b.sink} in the sink.">${cells}</div><div class="chip-grid-stats"><span class="chip-stat" aria-label="${plural(b.fired, 'firing')}">✸ ${b.fired}</span><span class="chip-stat" aria-label="Sink: ${plural(b.sink, 'chip')}"><span class="chip-sink-swatch" aria-hidden="true"></span> ${b.sink}</span></div><p class="sr-only" role="status">${total} chips on the grid. ${b.sink} in the sink.</p></div>`;
  }
  const g = boardInfo(b.board), tool = state.tool;
  const tools = `<div class="chip-tools" role="group" aria-label="Tool">${uiButton('<span class="chip-dot-icon" aria-hidden="true"></span> Add', {tool: 'add'}, tool === 'add')}${uiButton('✸ Fire', {tool: 'fire'}, tool === 'fire')}<button type="button" class="secondary chip-tool" data-chip-move="${esc(JSON.stringify({type: 'settle'}))}" data-focus="chip-settle" ${readyIndices(g, b.piles).length ? '' : 'disabled'}>Fire all</button>${clear}</div>`;
  const board = chipBoard(g, b.piles, b.sink, {fire: tool === 'fire', showReady: true, add: () => tool === 'add' && sum(b.piles) < 999});
  const loopMark = b.loop ? '<span class="chip-loop" role="img" aria-label="The board repeated">↻</span>' : '';
  return `<div class="chips-play" data-mechanic-wire="chips">${picker}${tools}${board}<div class="chip-run">${wordStrip(b.word, loopMark)}</div><p class="sr-only" role="status">${esc(`${describe(g, b.piles)}${g.sink ? `, sink ${b.sink}` : ''}.${b.loop ? ' The board repeated.' : ''}`)}</p></div>`;
}

// Still boards. Picking the two boards for That's all is view state, so the
// claim is one move judged when the second board is tapped; it holds only
// while the board it was opened on is unchanged.
const pickSig = b => JSON.stringify([b.piles, b.sink, b.steps, b.found, b.claim]);
const picking = (p, b) => ui(p).pick === pickSig(b);
const STILL_TOLD = {more: 'There is another.', apart: 'Those two don’t go to the same board.'};
const toldLine = text => `<p class="chip-feedback" role="status">${text}</p>`;
function renderStill(p, a) {
  const b = a.board, q = p.parameters, run = stillRun(p, b), g = run.g, solved = solvedStill(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintStill(p, b) : null, act = hint?.action || {};
  const hinted = act.node || null, total = sum(run.piles);
  if (q.mode === 'capacity') {
    const board = chipBoard(g, run.piles, run.sink, {fire: !solved, add: i => !solved && !canFire(g, run.piles, i) && total < STILL_LIMIT, hinted, marks: solved ? lineEnds(g, run.piles) : ''});
    const most = solved ? '<p class="chip-argued">One more chip on any circle would make it glow.</p>' : `<div class="chip-claims"><button type="button" class="secondary chip-claim ${act.type === 'most' ? 'hinted' : ''}" data-chip-move="${esc(JSON.stringify({type: 'most'}))}" data-focus="chip-most" ${mostOpen(p, b, run) ? '' : 'disabled'}>Most</button>${b.told && b.claim === 'more' ? toldLine('More chips fit.') : ''}</div>`;
    const status = `${describe(g, run.piles)}, sink ${run.sink}.${run.ready.length ? ` ${run.ready.map(i => g.ids[i]).join(' and ')} can fire.` : ''}`;
    return `<div class="chips-puzzle chips-still mode-capacity" data-mechanic-wire="chips">${board}${most}<p class="sr-only" role="status">${esc(status)}</p></div>`;
  }
  const pick = !solved && picking(p, b) && pickOpen(p, b, run), taps = pick ? ui(p).taps : solved ? b.taps : [];
  const hintTaps = act.type === 'claim' ? act.taps : [];
  const ask = `<p class="chip-ask">${pick ? 'Tap two different boards that go to the same board.' : esc(p.objective)}</p>`;
  const board = chipBoard(g, run.piles, run.sink, {fire: !run.ended && !solved && !pick, add: i => !run.started && !solved && !pick && !canFire(g, run.piles, i) && total < STILL_LIMIT, hinted});
  const canDrop = !solved && !pick && !run.ended && !run.ready.length;
  const dropButton = solved || pick || run.ended ? '' : `<button type="button" class="secondary chip-drop ${act.type === 'drop' ? 'hinted' : ''}" data-chip-move="${esc(JSON.stringify({type: 'drop'}))}" data-focus="chip-drop" aria-label="Add a chip at ${q.at}" ${canDrop ? '' : 'disabled'}><span aria-hidden="true">+</span><span class="chip-dot-icon" aria-hidden="true"></span><span aria-hidden="true">${q.at}</span></button>`;
  const fresh = !b.steps && !total && !b.sink;
  const againButton = !fresh && !solved && !pick ? `<button type="button" class="primary chip-again ${act.type === 'again' ? 'hinted' : ''}" data-chip-move="${esc(JSON.stringify({type: 'again'}))}" data-focus="chip-again"><span aria-hidden="true">↺</span> New run</button>` : '';
  const claimButton = solved ? '' : `<button type="button" class="secondary chip-claim ${act.type === 'claim' ? 'hinted' : ''}" data-chip-pick="1" data-focus="chip-all" aria-pressed="${pick}" ${pickOpen(p, b, run) ? '' : 'disabled'}>That’s all</button>`;
  // One line of controls, then one line for a refusal or a pair that is one board twice.
  const refused = !b.told ? '' : b.claim === 'apart' ? STILL_TOLD.apart : b.found.length < q.answers ? STILL_TOLD.more : '';
  const said = pick && ui(p).said === 'same' ? toldLine('Those are the same board.') : refused ? toldLine(refused) : '';
  const controls = dropButton || againButton || claimButton ? `<div class="chip-run">${dropButton}${againButton}${claimButton}</div>` : '';
  // The row: the start, then the still board after each chip added at A.
  const row = run.record.length ? `<ol class="chip-row" aria-label="Still boards in this run"${pick ? ' tabindex="-1" data-focus="chip-row"' : ''}>${run.record.map((piles, k) => {
    const label = `${k ? `After ${plural(k, 'chip')}` : 'Start'}: ${describe(g, piles)}`;
    const cls = `chip-rec${taps.includes(k) ? ' tapped' : ''}${solved && b.taps.includes(k) ? ' merge' : ''}${solved && b.taps.some(t => t + 1 === k) ? ' meet' : ''}${hintTaps.includes(k) ? ' hinted' : ''}`;
    const inner = miniBoard(g, piles, label);
    const cell = pick ? `<button type="button" class="${cls}" data-chip-tap="${k}" data-focus="chip-rec-${k}" aria-pressed="${taps.includes(k)}" aria-label="${esc(label)}">${inner}</button>` : `<span class="${cls}">${inner}</span>`;
    return `<li>${k ? '<span class="chip-arrow" aria-hidden="true">→</span>' : ''}${cell}${k === run.record.length - 1 && run.ended ? '<span class="chip-loop" role="img" aria-label="The board repeated">↻</span>' : ''}</li>`;
  }).join('')}</ol>` : '';
  const shelf = b.found.length ? `<ol class="chip-found" aria-label="Starts that came back">${b.found.map(item => `<li class="chip-slot${item === run.item ? ' fresh' : ''}">${miniBoard(g, item.split(',').map(Number), `Comes back: ${describe(g, item.split(',').map(Number))}`)}<span class="chip-loop" aria-hidden="true">↻</span></li>`).join('')}</ol>` : '';
  const argued = solved ? '<p class="chip-argued">The start runs into the loop and never comes back.</p>' : '';
  const status = `${run.started ? `${plural(run.record.length - 1, 'chip')} added at ${q.at}. ` : ''}${describe(g, run.piles)}, sink ${run.sink}.${run.returned ? ' The start came back.' : run.ended ? ' The board repeated.' : ''}`;
  return `<div class="chips-puzzle chips-still mode-cycle${pick ? ' picking' : ''}" data-mechanic-wire="chips">${ask}${board}${controls}${said}${row}${argued}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Animation after a move: chips fly along the lines of each circle that fired.
// The board is already drawn in its final state; this only adds motion.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function center(root, id) {
  const board = root.querySelector('.chip-board'), node = board?.querySelector(`[data-node="${id}"]`);
  if (!board || !node) return null;
  const outer = board.getBoundingClientRect(), r = node.getBoundingClientRect();
  return [r.left + r.width / 2 - outer.left, r.top + r.height / 2 - outer.top];
}
function flyFrom(root, g, id, delay = 0) {
  const layer = root.querySelector('.chip-fly-layer'), from = center(root, id);
  if (!layer || !from) return;
  const i = g.index[id], targets = [...g.nbr[i].map(j => g.ids[j]), ...Array(g.toSink[i]).fill('S')];
  for (const target of targets) {
    const to = center(root, target);
    if (!to) continue;
    const chip = document.createElement('i');
    chip.style.cssText = `--x0:${from[0]}px;--y0:${from[1]}px;--x1:${to[0]}px;--y1:${to[1]}px;animation-delay:${delay}ms`;
    layer.append(chip);
    chip.addEventListener('animationend', () => chip.remove());
  }
}
// Replays a multi-firing move (Fire all) one firing at a time on the drawn board.
function replay(root, g, before, word, withSink) {
  const nodes = g.ids.map(id => root.querySelector(`.chip-node[data-node="${id}"]`)), sinkNode = root.querySelector('.chip-sink');
  const paint = (piles, sink) => {
    nodes.forEach((node, i) => { if (!node) return; node.querySelector('.chip-dots').outerHTML = chipDots(piles[i]); node.querySelector('.chip-count').textContent = piles[i]; node.classList.toggle('ready', canFire(g, piles, i)); });
    if (sinkNode && withSink) { sinkNode.querySelector('.chip-dots').outerHTML = chipDots(sink); sinkNode.querySelector('.chip-count').textContent = sink; }
  };
  const frames = [];
  let piles = [...before.piles], sink = before.sink ?? 0;
  for (const id of word) { const next = fireAt(g, piles, g.index[id]); piles = next.piles; sink += next.sink; frames.push({id, piles, sink}); }
  const final = frames.at(-1);
  if (!final) return;
  paint(before.piles, before.sink ?? 0);
  const step = Math.max(140, Math.min(420, 2400 / frames.length));
  frames.forEach((frame, k) => setTimeout(() => { if (!root.isConnected) return; flyFrom(root, g, frame.id); paint(frame.piles, frame.sink); }, k * step));
}
function animateGrid(root, before, cell, amount) {
  const grid = root.querySelector('.chip-grid');
  if (!grid) return;
  const cells = [...grid.children];
  let piles = [...before]; piles[cell] += amount;
  const paint = list => list.forEach((n, i) => { cells[i].className = (n >= 4 ? 'hot' : `g${n}`) + (cells[i].classList.contains('cursor') ? ' cursor' : ''); });
  const frames = [];
  while (piles.some(n => n >= 4) && frames.length < 2000) { frames.push(piles); piles = gridWave(piles).piles; }
  if (!frames.length) return;
  const final = cells.map(c => c.className);
  const delay = Math.max(12, Math.min(60, 4000 / frames.length));
  let k = 0;
  const tick = () => {
    if (!grid.isConnected || grid.dataset.animating !== String(token)) return;
    if (k >= frames.length) { cells.forEach((c, i) => { c.className = final[i]; }); return; }
    paint(frames[k++]); setTimeout(tick, delay);
  };
  const token = Date.now();
  grid.dataset.animating = String(token);
  tick();
}
function wire(root, p, api) {
  const q = p.parameters, state = ui(p);
  const apply = action => {
    pending = {id: p.id, moves: api.attempt().moves, before: api.attempt().board, action};
    api.apply(action);
  };
  root.addEventListener('click', e => {
    // That's all (still boards) opens the picking of two boards in the row;
    // the second board tapped makes the claim.
    const opener = e.target.closest('[data-chip-pick]');
    if (opener && root.contains(opener)) {
      if (opener.disabled) return;
      const board = api.attempt().board;
      state.pick = state.pick === pickSig(board) ? null : pickSig(board); state.taps = []; state.said = null;
      api.ui({});
      // Focus moves to the row itself, not to a board in it: the first board
      // in a row from no chips is half of the answer.
      if (state.pick) document.querySelector('[data-mechanic-wire="chips"] .chip-row')?.focus({preventScroll: true});
      return;
    }
    const entry = e.target.closest('[data-chip-tap]');
    if (entry && root.contains(entry)) {
      const k = Number(entry.dataset.chipTap), taps = state.taps.includes(k) ? state.taps.filter(t => t !== k) : [...state.taps, k];
      state.said = null;
      if (taps.length < 2) { state.taps = taps; api.ui({}); return; }
      // The same board twice is not a pair: say so and keep picking.
      const run = stillRun(p, api.attempt().board);
      if (run && sameBoard(run, ...taps)) { state.taps = []; state.said = 'same'; api.ui({}); return; }
      state.pick = null; state.taps = [];
      apply({type: 'claim', taps});
      return;
    }
    const control = e.target.closest('[data-chip-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    if (control.getAttribute('aria-disabled') === 'true') return;
    try { apply(JSON.parse(control.dataset.chipMove)); } catch { /* malformed control data is ignored */ }
  });
  const grid = root.querySelector('.chip-grid');
  if (grid) {
    const cellAt = e => { const r = grid.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * GRID), y = Math.floor((e.clientY - r.top) / r.height * GRID); return x >= 0 && y >= 0 && x < GRID && y < GRID ? y * GRID + x : -1; };
    grid.addEventListener('click', e => { const cell = cellAt(e); if (cell >= 0) { state.cursor = cell; apply({type: 'add', cell, amount: state.amount}); } });
    grid.addEventListener('keydown', e => {
      const moves = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -GRID, ArrowDown: GRID};
      if (moves[e.key]) {
        e.preventDefault();
        const next = state.cursor + moves[e.key];
        if (next < 0 || next >= GRID * GRID || (Math.abs(moves[e.key]) === 1 && Math.floor(next / GRID) !== Math.floor(state.cursor / GRID))) return;
        grid.children[state.cursor]?.classList.remove('cursor'); state.cursor = next; grid.children[next]?.classList.add('cursor');
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply({type: 'add', cell: state.cursor, amount: state.amount}); }
    });
  }
  // Animate the move that produced this render, once.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1 || reduced()) return;
  const action = last.action, board = api.attempt().board;
  if (q.mode === 'playground') {
    if (board.board === 'grid' && action.type === 'add') { animateGrid(root, last.before.piles, action.cell, action.amount); return; }
    if (board.board === 'grid') return;
    const g = boardInfo(board.board);
    if (action.type === 'fire') flyFrom(root, g, action.node);
    if (action.type === 'settle') replay(root, g, last.before, settleRun(g, last.before.piles).word, Boolean(g.sink));
    return;
  }
  if (action.type === 'fire') flyFrom(root, boardInfo(q.board), action.node);
}

export const chipMechanics = {
  chips: {
    fresh: p => p.parameters.mode === 'playground' ? freshPlay() : {...emptyRun(p, boardInfo(p.parameters.board)), found: [], ...(exhaustive(p) ? {claim: 'open'} : {})},
    valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : validPuzzleBoard(p, b),
    solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
    move: (p, b, action) => p.parameters.mode === 'playground' ? movePlay(b, action) : movePuzzle(p, b, action),
    hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a, ctx) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a, ctx),
    wire,
    ui(p, payload) {
      if (!object(payload)) return;
      if (['add', 'fire'].includes(payload.tool)) ui(p).tool = payload.tool;
      if (GRID_AMOUNTS.includes(payload.amount)) ui(p).amount = payload.amount;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back a move but never a discovery, and never a refused
    // That's all: the shelf is carried, so the claim about it stands.
    carry: (p, from, to) => p.parameters.mode === 'playground' || !object(to) || !object(from) ? to : keepTold(to, {...untold(to), found: [...from.found], ...(from.claim !== undefined ? {claim: from.claim} : {})}),
    noHint: p => p.parameters.mode === 'playground'
  },
  chipstill: {
    fresh: p => freshStill(p),
    valid: validStill,
    solved: solvedStill,
    move: moveStill,
    hint: hintStill,
    render: (p, a) => renderStill(p, a),
    wire,
    ui: () => {},
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the shelf and every lock; a refusal's line goes with the
    // Undo of the claim press and comes back on the board the claim made: a
    // refused Most stays off while the board is the same, a refused That's
    // all until the shelf grows, and a refused pair while Undo stays in its
    // row (or goes back to it past New run).
    carry(p, from, to) {
      if (!object(from) || !object(to)) return to;
      const base = untold(to), same = Array.isArray(from.piles) && Array.isArray(to.piles) && key(from.piles) === key(to.piles) && from.sink === to.sink;
      if (p.parameters.mode === 'capacity') return keepTold(to, from.claim === 'more' && same ? {...base, claim: 'more'} : base);
      // A refused pair stands while Undo stays in its row (a run already
      // started from the same start), and comes back with that row when Undo
      // goes back past New run.
      const sameRow = same && typeof to.steps === 'string' && to.steps.length > 0 && from.steps.startsWith(to.steps);
      const claim = from.claim === 'all' || from.claim === 'more' ? from.claim : from.claim === 'apart' ? (sameRow ? 'apart' : 'open') : to.claim === 'apart' && to.steps ? 'apart' : 'open';
      return keepTold(to, {...base, found: [...from.found], claim, taps: claim === 'all' ? [...from.taps] : []});
    }
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'chips',
  family: {id: 'chips', symbol: '◉'},
  mechanics: chipMechanics,
  pack: new URL('./chips.json', import.meta.url).href,
  css: new URL('./chips.css', import.meta.url).href,
  focus: '.chip-node:not([aria-disabled]),.chip-drop:not([disabled]),.chip-again'
};
