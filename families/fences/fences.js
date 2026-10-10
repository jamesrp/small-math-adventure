// Garden fences (worksheet Week 26, same area and different boundaries).
// Square tiles are planted on a plot; tiles that share a whole side make one
// garden, and the fence is every tile side with no tile beside it, round
// ponds and other holes too. Each shared side hides two tile sides, so the
// fence of n tiles with s shared sides is 4n − 2s: always even. A garden is
// joined, so s ≥ n − 1 and the fence is at most 2n + 2, reached exactly when
// no tiles close a loop (the sides form a tree), which a pond sealed at a
// corner does not prevent. A garden over r rows and c columns has a fence of
// at least 2(r + c) and at most rc tiles, so the shortest fence for n tiles
// is 2⌈2√n⌉ and a fence of 2s holds at most ⌊s/2⌋·⌈s/2⌉ tiles. Puzzles ask
// for a given fence, the shortest or the longest, the most tiles inside a
// fence, every garden of a kind, or every length a fence can have. A plot may
// ask the garden to reach every row and column (so the fence is at least
// 2(rows + columns)), or start planted with a limit on how many tiles move.
// The grid is ../../sq-grid.js; see docs/fences/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, boundaryOf, piecesOf, holesOf, freeKey, cellsOfKey, normalize, symmetries, squareBoard, wireSquare, edgeEnds, cellKey} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MODES = ['target', 'fewest', 'longest', 'most', 'every', 'fences', 'playground'];
export const CLAIMS = {fewest: 'Shortest', longest: 'Longest', most: 'Most', every: 'That’s all', fences: 'That’s all'};
export const TOLD = {shorter: 'There’s a shorter fence.', longer: 'There’s a longer fence.', more: 'More tiles fit.', another: 'There’s another.'};
const TOLD_FOR = {fewest: 'shorter', longest: 'longer', most: 'more', every: 'another', fences: 'another'};
export const PLAY_SIZES = [4, 6, 8];

/* ------------------------------------------------------------------ *
 * Plots and gardens
 * ------------------------------------------------------------------ */
const play = p => p.parameters.mode === 'playground';
export const gridFor = (p, b) => play(p) ? gridOf({cols: b.size, rows: b.size}) : gridOf({cols: p.parameters.cols, rows: p.parameters.rows});
const pondsOf = (p, g) => (p.parameters.ponds || []).map(c => g.index.get(cellKey(c)));
const plantable = (p, g, i) => integer(i) && i >= 0 && i < g.cells.length && !pondsOf(p, g).includes(i);
// Fixed-count puzzles give every tile at the start; Most and the playground
// have as many as the plot holds.
const fixedCount = p => play(p) || p.parameters.mode === 'most' ? null : p.parameters.tiles;
const room = (p, b) => fixedCount(p) === null ? Infinity : fixedCount(p) - b.tiles.length;
// Puzzles that start planted may limit how many tiles leave their starting
// squares; a tile carried back home gives its move back.
const limited = p => p.parameters.moves !== undefined;
const homesOf = p => new Set(limited(p) ? startCells(p) : []);
export const movedOf = (p, b) => { const has = new Set(b.tiles); return [...homesOf(p)].filter(i => !has.has(i)).length; };
const withinMoves = (p, b) => !limited(p) || movedOf(p, b) <= p.parameters.moves;

// Everything a puzzle asks of a garden: how many tiles, its fence, whether
// it is one piece, which ponds it leaves open, and its shape up to turns and
// flips. A garden is legal when it is one piece with every pond inside it
// and, where the plot asks, a tile in every row and every column.
export function gardenOf(p, b) {
  const g = gridFor(p, b), tiles = b.tiles, fence = boundaryOf(g, tiles).length;
  const pieces = tiles.length ? piecesOf(g, tiles).length : 0;
  const inside = new Set(holesOf(g, tiles).flat().map(cellKey));
  const open = (p.parameters.ponds || []).filter(c => !inside.has(cellKey(c))).length;
  const count = fixedCount(p), full = count === null ? tiles.length > 0 : tiles.length === count;
  const reach = !p.parameters.span || (new Set(tiles.map(i => g.cells[i][0])).size === g.cols && new Set(tiles.map(i => g.cells[i][1])).size === g.rows);
  const legal = full && pieces === 1 && open === 0 && reach;
  return {g, n: tiles.length, fence, pieces, open, reach, full, legal, key: legal ? freeKey(tiles.map(i => g.cells[i])) : null};
}
// The garden counts toward the goal: a legal garden that also meets the
// puzzle's own condition (its fence, or a fence within the budget).
function meets(p, gd) {
  const q = p.parameters;
  if (!gd.legal) return false;
  if (q.mode === 'target' || (q.mode === 'every' && q.fence !== undefined)) return gd.fence === q.fence;
  if (q.mode === 'most') return gd.fence <= q.fence;
  if (q.mode === 'fences') return q.chips.includes(gd.fence);
  return true;
}
const foundKey = (p, gd) => p.parameters.mode === 'every' ? gd.key : p.parameters.mode === 'fences' ? gd.fence : null;
// What a claim on this garden would be told: null when it is right.
function answerFor(p, b) {
  const q = p.parameters, gd = gardenOf(p, b);
  if (q.mode === 'fewest' || q.mode === 'longest') return gd.fence === q.best ? null : TOLD_FOR[q.mode];
  if (q.mode === 'most') return gd.n === q.best ? null : 'more';
  return q.answers.every(x => b.found.includes(x)) ? null : 'another';
}
// Whether a claim can be made at all on this board.
function canClaim(p, b) {
  const q = p.parameters;
  if (!CLAIMS[q.mode] || b.told || b.claimed) return false;
  if (q.mode === 'every' || q.mode === 'fences') return b.found.length > 0;
  return meets(p, gardenOf(p, b));
}

/* ------------------------------------------------------------------ *
 * Boards and moves
 * ------------------------------------------------------------------ */
// target: {tiles}; fewest, longest, most: {tiles, told, claimed};
// every, fences: {tiles, found, told, claimed}; playground: {size, tiles}.
const sorted = list => [...list].sort((a, b) => a - b);
function fresh(p) {
  const q = p.parameters, tiles = sorted(startCells(p));
  if (q.mode === 'playground') return {size: q.size || 6, tiles: []};
  if (q.mode === 'target') return {tiles};
  if (q.mode === 'every' || q.mode === 'fences') return {tiles, found: [], told: null, claimed: false};
  return {tiles, told: null, claimed: false};
}
const startCells = p => { const g = play(p) ? null : gridOf({cols: p.parameters.cols, rows: p.parameters.rows}); return g ? (p.parameters.start || []).map(c => g.index.get(cellKey(c))) : []; };

function validTiles(p, b) {
  if (!Array.isArray(b.tiles)) return false;
  const g = gridFor(p, b);
  if (!b.tiles.every((i, k) => plantable(p, g, i) && (k === 0 || b.tiles[k - 1] < i))) return false;
  return (fixedCount(p) === null || b.tiles.length <= fixedCount(p)) && withinMoves(p, b);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') return PLAY_SIZES.includes(b.size) && validTiles(p, b);
  if (!validTiles(p, b)) return false;
  if (q.mode === 'target') return Object.keys(b).length === 1;
  if (typeof b.claimed !== 'boolean' || !(b.told === null || Object.hasOwn(TOLD, b.told))) return false;
  if (q.mode === 'every' || q.mode === 'fences') {
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(x => q.answers.includes(x))) return false;
    // A garden that counts is always in the list.
    const gd = gardenOf(p, b);
    if (meets(p, gd) && !b.found.includes(foundKey(p, gd))) return false;
  }
  if (b.claimed) return b.told === null && answerFor(p, b) === null && (q.mode === 'every' || q.mode === 'fences' || meets(p, gardenOf(p, b)));
  if (b.told === null) return true;
  return b.told === TOLD_FOR[q.mode] && answerFor(p, b) === b.told && ((q.mode === 'every' || q.mode === 'fences') ? b.found.length > 0 : meets(p, gardenOf(p, b)));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'target') return meets(p, gardenOf(p, b));
  return b.claimed;
}

// The board after a change of tiles: a told answer waits for a change, and
// a garden that counts joins the found list.
function withTiles(p, b, tiles) {
  if (play(p)) return {...b, tiles};
  if (p.parameters.mode === 'target') return {tiles};
  const next = {...b, tiles, told: null};
  if (Array.isArray(b.found)) {
    const gd = gardenOf(p, next);
    if (meets(p, gd) && !b.found.includes(foundKey(p, gd))) next.found = [...b.found, foundKey(p, gd)];
  }
  return next;
}
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = p.parameters, g = gridFor(p, b), has = new Set(b.tiles);
  const change = tiles => withinMoves(p, {tiles}) ? withTiles(p, b, tiles) : null;
  switch (action.type) {
    case 'plant': {
      const cells = action.cells;
      if (!Array.isArray(cells) || !cells.length || new Set(cells).size !== cells.length) return null;
      if (!cells.every(i => plantable(p, g, i) && !has.has(i)) || cells.length > room(p, b)) return null;
      return change(sorted([...b.tiles, ...cells]));
    }
    case 'lift': return has.has(action.cell) ? change(b.tiles.filter(i => i !== action.cell)) : null;
    case 'carry': {
      if (!has.has(action.from) || !plantable(p, g, action.to) || has.has(action.to)) return null;
      return change(sorted([...b.tiles.filter(i => i !== action.from), action.to]));
    }
    case 'clear': return (q.mode === 'every' || q.mode === 'fences' || play(p)) && b.tiles.length ? withTiles(p, b, []) : null;
    case 'size': return play(p) && PLAY_SIZES.includes(action.size) && (action.size !== b.size || b.tiles.length) ? {size: action.size, tiles: []} : null;
    case 'claim': {
      if (!canClaim(p, b)) return null;
      const told = answerFor(p, b);
      return told ? {...b, told} : {...b, claimed: true};
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Hints: they walk the child's own garden towards the nearest garden that
 * does what the puzzle asks, one tile at a time.
 * ------------------------------------------------------------------ */
// Every place the shapes in `keys` (free keys) fit the plot as gardens that
// count, as sorted square numbers.
const places = new Map();
export function placementsOf(p, b, keys) {
  const g = gridFor(p, b), cacheKey = `${p.id}|${keys.join('|')}`;
  if (places.has(cacheKey)) return places.get(cacheKey);
  const out = [], seen = new Set();
  for (const key of keys) for (const form of symmetries(cellsOfKey(key))) {
    const w = Math.max(...form.map(c => c[0])) + 1, h = Math.max(...form.map(c => c[1])) + 1;
    for (let y = 0; y + h <= g.rows; y++) for (let x = 0; x + w <= g.cols; x++) {
      const tiles = form.map(([a, c]) => g.index.get(cellKey([a + x, c + y])));
      if (tiles.some(i => !plantable(p, g, i))) continue;
      const list = sorted(tiles), k = list.join(',');
      if (seen.has(k)) continue;
      seen.add(k);
      if (meets(p, gardenOf(p, {...b, tiles: list}))) out.push(list);
    }
  }
  places.set(cacheKey, out);
  return out;
}
// The shapes a hint aims for: the authored best gardens, or the answers not
// yet found (for fence lengths, a garden with each).
function targetsOf(p, b) {
  const q = p.parameters;
  if (limited(p)) { const g = gridFor(p, b); return q.goals.map(list => sorted(list.map(c => g.index.get(cellKey(c))))); }
  if (q.mode === 'every') return placementsOf(p, b, q.answers.filter(k => !b.found.includes(k)));
  if (q.mode === 'fences') return placementsOf(p, b, q.answers.filter(n => !b.found.includes(n)).map(n => q.witnesses[q.answers.indexOf(n)]));
  return placementsOf(p, b, q.witnesses);
}
function hint(p, b) {
  const q = p.parameters;
  if (play(p) || solved(p, b)) return {type: 'done'};
  const claim = CLAIMS[q.mode] ? {type: 'move', action: {type: 'claim'}, text: `Press ${CLAIMS[q.mode]}.`} : {type: 'note'};
  if (CLAIMS[q.mode] && answerFor(p, b) === null && canClaim(p, b)) return claim;
  const targets = targetsOf(p, b);
  if (!targets.length) return claim;
  const have = new Set(b.tiles), overlap = t => t.filter(i => have.has(i)).length;
  const target = targets.reduce((best, t) => overlap(t) > overlap(best) ? t : best, targets[0]), want = new Set(target);
  const stray = b.tiles.filter(i => !want.has(i)), missing = target.filter(i => !have.has(i));
  // With a limit on moves, tiles already moved go first and squares where a
  // tile started fill first, so no step uses a move the goal doesn't.
  const homes = homesOf(p), from = (limited(p) ? stray.find(i => !homes.has(i)) : undefined) ?? stray.at(-1), to = missing.find(i => homes.has(i)) ?? missing[0];
  if (missing.length && room(p, b) > 0) return {type: 'move', action: {type: 'plant', cells: [to]}, text: 'Plant a tile on the glowing square.'};
  if (stray.length && missing.length) return {type: 'move', action: {type: 'carry', from, to}, text: 'Move the glowing tile to the glowing square.'};
  if (stray.length) return {type: 'move', action: {type: 'lift', cell: stray.at(-1)}, text: 'Lift the glowing tile.'};
  return claim;
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const cellName = (g, i) => `Row ${g.cells[i][1] + 1}, column ${g.cells[i][0] + 1}`;
const tileIcon = '<svg class="gf-icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="2.5" class="gf-icon-tile"/></svg>';
const fenceIcon = '<svg class="gf-icon" viewBox="0 0 24 20" aria-hidden="true"><path class="gf-icon-rail" d="M2 7.5H22M2 13.5H22"/><path class="gf-icon-post" d="M5 3.5V17.5M12 3.5V17.5M19 3.5V17.5"/></svg>';

// A small picture of a shape (the row of gardens found).
export function mini(cells, label, cls = '') {
  const shape = normalize(cells), cols = Math.max(...shape.map(c => c[0])) + 1, rows = Math.max(...shape.map(c => c[1])) + 1;
  const g = gridOf({cols, rows, cells: shape}), fence = new Set(boundaryOf(g, g.cells.map((_, i) => i)));
  return squareBoard(g, {cls: `gf-mini ${cls}`, label, picture: true, pad: .25, cell: () => ({cls: 'tile'}), edge: k => fence.has(k) ? {cls: 'fence'} : null});
}

function board(p, b, opts) {
  const g = gridFor(p, b), gd = gardenOf(p, b), has = new Set(b.tiles), ponds = new Set(pondsOf(p, g)), homes = homesOf(p), live = !opts.solved;
  const hintAction = opts.hint?.action, hinted = new Set(hintAction?.type === 'plant' ? hintAction.cells : hintAction?.type === 'carry' ? [hintAction.from, hintAction.to] : hintAction?.type === 'lift' ? [hintAction.cell] : []);
  const fence = new Set(boundaryOf(g, b.tiles)), posts = new Set([...fence].flatMap(k => edgeEnds(g.edges[k]).map(pt => g.pointIndex.get(cellKey(pt)))));
  // Every square but a pond is a control, so a tile can be carried to any
  // empty square even when none are left to plant.
  const cell = i => {
    if (ponds.has(i)) return {cls: 'pond'};
    const tile = has.has(i), home = !tile && homes.has(i);
    return {cls: `${tile ? 'tile' : home ? 'home' : ''}${hinted.has(i) ? ' hinted' : ''}`, act: live, label: `${cellName(g, i)}${tile ? ', tile. Lift it' : `${home ? ', where a tile started' : ''}${room(p, b) > 0 ? '. Plant a tile' : ', empty'}`}`};
  };
  const broken = gd.pieces > 1 ? ' broken' : '';
  return squareBoard(g, {
    cls: `gf-board${opts.solved ? ' solved' : ''}${broken}`, label: opts.label, cell, stroke: live,
    edge: k => fence.has(k) ? {cls: 'fence'} : null,
    point: k => posts.has(k) ? {cls: 'post'} : null
  });
}
const claimButton = (p, b, hinted) => `<button type="button" class="secondary gf-button gf-claim${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'claim'}))}" data-focus="gf-claim" ${canClaim(p, b) ? '' : 'disabled'}>${CLAIMS[p.parameters.mode]}</button>`;
const clearButton = b => `<button type="button" class="secondary gf-button" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'clear'}))}" data-focus="gf-clear" ${b.tiles.length ? '' : 'disabled'}>Clear</button>`;
// The tiles still to plant, as a tray; Most and the playground count up.
function tray(p, b) {
  const count = fixedCount(p);
  if (limited(p) && !room(p, b)) return '';
  if (count === null) return `<span class="gf-count" role="img" aria-label="${plural(b.tiles.length, 'tile')}">${tileIcon}<b>${b.tiles.length}</b></span>`;
  const left = count - b.tiles.length;
  return `<span class="gf-tray${left ? '' : ' empty'}" role="img" aria-label="${plural(left, 'tile')} left">${Array.from({length: count}, (_, k) => `<i class="${k < left ? 'on' : ''}"></i>`).join('')}</span>`;
}
// Moves left in a puzzle that starts planted.
function movesLeft(p, b) {
  if (!limited(p)) return '';
  const k = p.parameters.moves, left = k - movedOf(p, b);
  return `<span class="gf-moves" role="img" aria-label="${plural(left, 'move')} left">${Array.from({length: k}, (_, j) => `<i class="${j < left ? 'on' : ''}"></i>`).join('')}</span>`;
}
function fenceCount(p, b, gd) {
  const q = p.parameters, budget = q.mode === 'most' ? q.fence : null, over = budget !== null && gd.fence > budget;
  const label = `Fence ${gd.fence}${budget === null ? '' : ` of ${budget}`}`;
  return `<span class="gf-count gf-fence${over ? ' over' : ''}" role="img" aria-label="${label}">${fenceIcon}<b>${gd.fence}</b>${budget === null ? '' : `<small>/ ${budget}</small>`}</span>`;
}
// Why a claim or a goal can't count yet, once every tile is down.
function ruleNote(p, b, gd) {
  if (!b.tiles.length || (fixedCount(p) !== null && !gd.full)) return '';
  if (gd.pieces > 1) return 'Join the tiles side to side.';
  if (gd.open) return 'Close the fence round the pond.';
  if (!gd.reach) return 'Reach every row and every column.';
  return '';
}
function render(p, a) {
  const q = p.parameters, b = a.board;
  if (q.mode === 'playground') return renderPlay(p, a);
  const done = solved(p, b), gd = gardenOf(p, b), h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const buttons = [CLAIMS[q.mode] && !done ? claimButton(p, b, h?.action?.type === 'claim') : '', (q.mode === 'every' || q.mode === 'fences') && !done ? clearButton(b) : ''].join('');
  const bar = `<div class="gf-bar">${tray(p, b)}${movesLeft(p, b)}${fenceCount(p, b, gd)}${buttons ? `<span class="gf-buttons">${buttons}</span>` : ''}</div>`;
  const plot = `<div class="gf-stage" style="--gf-cols:${q.cols}">${board(p, b, {solved: done, hint: h, label: `Plot of ${q.rows} by ${q.cols} squares${q.ponds?.length ? ' with a pond' : ''}`})}</div>`;
  let below = '';
  if (q.mode === 'fences') {
    const here = meets(p, gd) ? gd.fence : null;
    below = `<ol class="gf-chips" aria-label="Fence lengths">${q.chips.map(n => `<li class="${b.found.includes(n) ? 'found' : ''}${n === here ? ' here' : ''}" aria-label="${n}${b.found.includes(n) ? ', made' : ''}">${n}</li>`).join('')}</ol>`;
  } else if (q.mode === 'every' && b.found.length) {
    const here = meets(p, gd) ? gd.key : null;
    below = `<ol class="gf-shelf" aria-label="Gardens found: ${b.found.length}">${b.found.map((k, i) => `<li class="${k === here ? 'here' : ''}">${mini(cellsOfKey(k), `Garden ${i + 1}${k === here ? ', on the plot' : ''}`)}</li>`).join('')}</ol>`;
  }
  const note = b.told ? TOLD[b.told] : done ? '' : ruleNote(p, b, gd);
  const status = `${plural(gd.n, 'tile')}, fence ${gd.fence}.${limited(p) ? ` ${plural(q.moves - movedOf(p, b), 'move')} left.` : ''}${gd.pieces > 1 ? ` ${plural(gd.pieces, 'piece')}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="gf-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="fences">${bar}${plot}${note ? `<p class="gf-note">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const sizeIcon = n => `<svg class="gf-size-icon" viewBox="0 0 24 24" aria-hidden="true">${Array.from({length: n * n}, (_, i) => `<rect x="${f2(2 + (i % n) * 20 / n)}" y="${f2(2 + Math.floor(i / n) * 20 / n)}" width="${f2(20 / n - 1)}" height="${f2(20 / n - 1)}" rx=".5"/>`).join('')}</svg>`;
const f2 = n => Number(n.toFixed(2));
function renderPlay(p, a) {
  const b = a.board, gd = gardenOf(p, b);
  const sizes = `<div class="gf-sizes" role="group" aria-label="Plot">${PLAY_SIZES.map(n => `<button type="button" class="secondary gf-size" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', size: n}))}" data-focus="gf-size-${n}" aria-pressed="${b.size === n}" aria-label="${n} by ${n}">${sizeIcon(n)}</button>`).join('')}</div>`;
  const bar = `<div class="gf-bar">${tray(p, b)}${fenceCount(p, b, gd)}<span class="gf-buttons">${clearButton(b)}</span></div>`;
  const plot = `<div class="gf-stage" style="--gf-cols:${b.size}">${board(p, b, {label: `Plot of ${b.size} by ${b.size} squares`})}</div>`;
  const status = `${plural(gd.n, 'tile')}, fence ${gd.fence}.${gd.pieces > 1 ? ` ${plural(gd.pieces, 'piece')}.` : ''}`;
  return `<div class="gf-puzzle mode-playground" data-mechanic-wire="fences">${sizes}${bar}${plot}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Taps plant and lift. A finger that starts on an empty square plants a tile
// on each empty square it crosses; one that starts on a tile carries it to
// the square where it lifts off.
function wire(root, p, api) {
  const b = () => api.attempt().board, g = gridFor(p, b());
  const empty = i => plantable(p, g, i) && !b().tiles.includes(i);
  const planting = cells => cells.filter(empty);
  // A tap on an empty square with no tiles left shakes the tray.
  const nudge = (cls = '.gf-tray') => { const t = root.querySelector(cls); if (!t) return; t.classList.remove('nudge'); void t.getBoundingClientRect(); t.classList.add('nudge'); };
  // With a limit on moves, a lift or carry that would use a move not left shakes the moves instead.
  const allowed = tiles => withinMoves(p, {tiles}) || (nudge('.gf-moves'), false);
  wireSquare(root, g, {
    cell: i => {
      if (b().tiles.includes(i)) return allowed(b().tiles.filter(j => j !== i)) ? {type: 'lift', cell: i} : null;
      if (empty(i) && room(p, b()) > 0) return {type: 'plant', cells: [i]};
      nudge();
      return null;
    },
    preview: cells => {
      if (b().tiles.includes(cells[0])) { const to = cells.at(-1); return {show: [to], blocked: !empty(to) || !withinMoves(p, {tiles: [...b().tiles.filter(j => j !== cells[0]), to]})}; }
      const list = planting(cells);
      return {show: list, blocked: list.length > room(p, b())};
    },
    stroke: cells => {
      if (b().tiles.includes(cells[0])) return empty(cells.at(-1)) && allowed([...b().tiles.filter(j => j !== cells[0]), cells.at(-1)]) ? {type: 'carry', from: cells[0], to: cells.at(-1)} : null;
      const list = planting(cells);
      return list.length && list.length <= room(p, b()) ? {type: 'plant', cells: list} : null;
    }
  }, api.apply);
}

export const fenceMechanics = {
  fences: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo takes back a move but keeps the gardens and lengths already found.
    carry: (p, from, to) => !Array.isArray(from?.found) || !object(to) ? to : {...to, found: [...to.found, ...from.found.filter(k => !to.found.includes(k))], told: null},
    noHint: p => play(p)
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'fences',
  family: {id: 'fences', symbol: '▦'},
  mechanics: fenceMechanics,
  pack: new URL('./fences.json', import.meta.url).href,
  css: new URL('./fences.css', import.meta.url).href,
  focus: '.sg-hit,.gf-button:not([disabled]),.gf-size'
};
