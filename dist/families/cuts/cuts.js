// Polygon cuts (worksheet Week 14, triangulations and flips). A convex
// polygon with labelled corners is cut into triangles by straight lines from
// corner to corner that do not cross. Tap two corners to draw a line; a
// flip swaps a line for the other diagonal of the four-sided piece round
// it. Four kinds of puzzle: find every filling (some with a line kept),
// flip to match a card within a number of flips, come back home after an
// odd number of flips, and visit every filling once and come home. The
// mathematics is in polygon.js; see docs/cuts/README.md.
import {esc} from '../../expansion-controls.js';
import {wireTri} from '../../tri-grid.js';
import {LETTERS, MIN_N, MAX_N, polygonOf, diagonalOf, crosses, legalSet, isFull, add, remove, pieces, flipOf, flip, keyOf, fromKey, completions, apexOf, flipMap, distancesTo} from './polygon.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const MODES = ['every', 'tour', 'reach', 'home'];
const FLIPS = ['tour', 'reach', 'home'];
// A walk home is never longer than this, so saves stay small.
export const HOME_LIMIT = 40;
export const PLAY_SIZES = [4, 5, 6, 7, 8];
const SHAPES = {4: 'Square', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon'};

const polygonFor = (p, b) => polygonOf(p.parameters.mode === 'playground' ? b?.n ?? 6 : p.parameters.n);
const keptOf = p => fromKey(polygonFor(p), p.parameters.kept || '') || [];
// The fillings an "every" puzzle asks for: those that keep its kept lines.
const wanted = p => completions(polygonFor(p), keptOf(p)).map(ds => keyOf(polygonFor(p), ds));
const here = (p, b) => fromKey(polygonFor(p, b), FLIPS.includes(p.parameters.mode) ? b.path.at(-1) : null);
const lineName = (P, d) => `${LETTERS[P.diagonals[d][0]]}${LETTERS[P.diagonals[d][1]]}`;

/* ------------------------------------------------------------------ *
 * Boards and moves
 * ------------------------------------------------------------------ */
function freshPuzzle(p) {
  const q = p.parameters;
  if (FLIPS.includes(q.mode)) return {path: [q.start]};
  return {diags: keptOf(p), found: [], claimed: false, missed: false};
}
const linked = (P, a, b) => flipMap(P).get(a)?.includes(b);

function validPuzzle(p, b) {
  const q = p.parameters, P = polygonFor(p);
  if (!object(b) || !MODES.includes(q.mode)) return false;
  if (q.mode === 'every') {
    const want = wanted(p), kept = keptOf(p);
    if (!legalSet(P, b.diags) || !kept.every(d => b.diags.includes(d))) return false;
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(k => want.includes(k))) return false;
    if (isFull(P, b.diags) && !b.found.includes(keyOf(P, b.diags))) return false;
    if (typeof b.claimed !== 'boolean' || typeof b.missed !== 'boolean' || (b.claimed && b.missed)) return false;
    return !b.claimed || b.found.length === want.length;
  }
  const path = b.path, map = flipMap(P);
  if (!Array.isArray(path) || !path.length || path[0] !== q.start || !path.every(k => map.has(k))) return false;
  for (let i = 1; i < path.length; i++) if (!linked(P, path[i - 1], path[i])) return false;
  if (q.mode === 'reach') return path.length - 1 <= q.budget;
  if (q.mode === 'home') return path.length - 1 <= HOME_LIMIT;
  // A tour never repeats a filling, except to come home after every one.
  const body = path.length === map.size + 1 && path.at(-1) === q.start ? path.slice(0, -1) : path;
  return new Set(body).size === body.length;
}
function solvedPuzzle(p, b) {
  if (!validPuzzle(p, b)) return false;
  const q = p.parameters, flips = FLIPS.includes(q.mode) ? b.path.length - 1 : 0;
  if (q.mode === 'every') return b.claimed;
  if (q.mode === 'reach') return b.path.at(-1) === q.target;
  if (q.mode === 'home') return b.path.at(-1) === q.start && flips % 2 === 1;
  return b.path.length === flipMap(polygonFor(p)).size + 1 && b.path.at(-1) === q.start;
}

// Drawing a line between two corners: a diagonal not yet drawn that
// crosses none of the others.
function drawn(P, ds, action) {
  const {a, b} = action;
  if (![a, b].every(k => integer(k) && k >= 0 && k < P.n)) return null;
  const d = diagonalOf(P, a, b);
  if (d < 0 || ds.includes(d) || ds.some(e => crosses(P, d, e))) return null;
  return add(ds, d);
}
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, P = polygonFor(p);
  if (q.mode === 'every') {
    const kept = keptOf(p);
    let diags;
    if (action.type === 'draw') diags = drawn(P, b.diags, action);
    else if (action.type === 'erase') diags = integer(action.d) && b.diags.includes(action.d) && !kept.includes(action.d) ? remove(b.diags, action.d) : null;
    else if (action.type === 'clear') diags = b.diags.length > kept.length ? kept : null;
    else if (action.type === 'claim') {
      if (b.missed) return null;
      return b.found.length === wanted(p).length ? {...b, claimed: true} : {...b, missed: true};
    }
    if (!diags) return null;
    // A finished filling joins the collection by itself.
    const key = isFull(P, diags) ? keyOf(P, diags) : null;
    return {...b, diags, found: key && !b.found.includes(key) ? [...b.found, key] : b.found, missed: false};
  }
  if (action.type !== 'flip' || !integer(action.d)) return null;
  const ds = here(p, b), next = ds && flip(P, ds, action.d);
  if (!next) return null;
  const nb = {path: [...b.path, keyOf(P, next)]};
  return validPuzzle(p, nb) ? nb : null;
}

/* ------------------------------------------------------------------ *
 * Hints
 * ------------------------------------------------------------------ */
// Searches the flip map for a way to finish a tour from the path so far.
function finishTour(P, path, start) {
  const map = flipMap(P), seen = new Set(path), route = [...path];
  const go = () => {
    const at = route.at(-1);
    if (route.length === map.size) return map.get(at).includes(start);
    for (const next of map.get(at)) {
      if (seen.has(next)) continue;
      seen.add(next); route.push(next);
      if (go()) return true;
      seen.delete(next); route.pop();
    }
    return false;
  };
  if (route.length === map.size + 1) return route;
  return go() ? [...route, start] : null;
}
// Flips from each (filling, odd or even so far) to home after an odd number.
const homeCache = new Map();
function homeDistances(P, start) {
  const id = `${P.n}|${start}`;
  if (homeCache.has(id)) return homeCache.get(id);
  const map = flipMap(P), goal = `${start}|1`, dist = new Map([[goal, 0]]), queue = [[start, 1]];
  for (let i = 0; i < queue.length; i++) {
    const [k, par] = queue[i];
    for (const next of map.get(k)) { const id2 = `${next}|${1 - par}`; if (!dist.has(id2)) { dist.set(id2, dist.get(`${k}|${par}`) + 1); queue.push([next, 1 - par]); } }
  }
  homeCache.set(id, dist);
  return dist;
}
// The line whose flip turns filling `from` into the neighbouring `to`.
const flipTo = (P, from, to) => { const a = fromKey(P, from), b = fromKey(P, to); return a.find(d => !b.includes(d)); };
const flipHint = (P, from, to) => ({type: 'move', action: {type: 'flip', d: flipTo(P, from, to)}, text: 'Flip the glowing line.'});

function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart this puzzle.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, P = polygonFor(p), map = flipMap(P);
  if (q.mode === 'every') {
    const want = wanted(p), missing = want.filter(k => !b.found.includes(k));
    if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'That is every way.'};
    // The missing filling closest to the board: erase what it lacks, then draw what it has.
    const target = missing.map(k => fromKey(P, k)).sort((x, y) => y.filter(d => b.diags.includes(d)).length - x.filter(d => b.diags.includes(d)).length)[0];
    const extra = b.diags.find(d => !target.includes(d));
    if (extra !== undefined) return {type: 'move', action: {type: 'erase', d: extra}, text: 'Erase the glowing line.'};
    const [a, c] = P.diagonals[target.find(d => !b.diags.includes(d))];
    return {type: 'move', action: {type: 'draw', a, b: c}, text: 'Draw a line between the glowing corners.'};
  }
  const now = b.path.at(-1), flips = b.path.length - 1;
  if (q.mode === 'reach') {
    const dist = distancesTo(P, q.target);
    if (dist.get(now) > q.budget - flips) return {type: 'deadend', text: 'The card is too many flips away now. Undo.'};
    return flipHint(P, now, map.get(now).find(k => dist.get(k) === dist.get(now) - 1));
  }
  if (q.mode === 'home') {
    const dist = homeDistances(P, q.start), par = flips % 2, left = dist.get(`${now}|${par}`);
    if (flips + left > HOME_LIMIT) return {type: 'deadend', text: 'That is a long way round. Undo.'};
    return flipHint(P, now, map.get(now).find(k => dist.get(`${k}|${1 - par}`) === left - 1));
  }
  const route = finishTour(P, b.path, q.start);
  if (!route) return {type: 'deadend', text: 'From here you can’t visit every way. Undo.'};
  return flipHint(P, now, route[b.path.length]);
}

/* ------------------------------------------------------------------ *
 * The playground: polygons of 4 to 8 corners; draw lines, then flip or
 * erase them.
 * ------------------------------------------------------------------ */
const freshPlay = (n = 6) => ({n, diags: []});
const validPlay = b => object(b) && PLAY_SIZES.includes(b.n) && legalSet(polygonOf(b.n), b.diags);
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  const P = polygonOf(b.n);
  if (action.type === 'size') return PLAY_SIZES.includes(action.n) && (action.n !== b.n || b.diags.length) ? freshPlay(action.n) : null;
  if (action.type === 'clear') return b.diags.length ? {...b, diags: []} : null;
  if (action.type === 'draw') { const diags = drawn(P, b.diags, action); return diags ? {...b, diags} : null; }
  if (action.type === 'erase') return integer(action.d) && b.diags.includes(action.d) ? {...b, diags: remove(b.diags, action.d)} : null;
  if (action.type === 'flip') { const diags = integer(action.d) ? flip(P, b.diags, action.d) : null; return diags ? {...b, diags} : null; }
  return null;
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {sel: null, refused: null, note: null, tool: 'flip'}); return uiState.get(p.id); };
// Why a tap did nothing, said once until the next move.
const NOTES = {cross: 'Lines can’t cross.', visited: 'You’ve been there.', budget: 'No flips left.'};
const noteOf = state => state.note ? `<p class="ct-note" role="status">${NOTES[state.note]}</p>` : '';
const R = 100, f = v => v.toFixed(1);
const at = (P, k, r = R) => P.xy[k].map(v => v * r);
const shapePoints = P => P.xy.map((_, k) => at(P, k).map(f).join(',')).join(' ');
const linePath = (P, d, cls, extra = '') => { const [a, b] = P.diagonals[d], [x1, y1] = at(P, a), [x2, y2] = at(P, b); return `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${extra}/>`; };

// A small picture of a filling, for shelves and cards.
export function mini(P, ds, cls = '', label = 'Filling') {
  const tris = pieces(P, ds).filter(t => t.length === 3).map(t => `<polygon class="ct-tri" points="${t.map(k => at(P, k).map(f).join(',')).join(' ')}"/>`).join('');
  return `<svg class="ct-mini ${cls}" viewBox="-112 -112 224 224" role="img" aria-label="${esc(label)}">${tris}<polygon class="ct-shape" points="${shapePoints(P)}"/>${ds.map(d => linePath(P, d, 'ct-line')).join('')}</svg>`;
}
const describe = (P, ds) => ds.length ? `Lines ${ds.map(d => lineName(P, d)).join(', ')}` : 'No lines';

// The working board. `opts.draw` makes corners controls; `opts.lineAct(d)`
// says what tapping drawn line d does ('erase' or 'flip'), or nothing.
function drawBoard(P, ds, opts) {
  const kept = new Set(opts.kept || []), hint = opts.hint?.action, sel = opts.sel;
  const hintCorners = hint?.type === 'draw' ? [hint.a, hint.b] : [];
  const tris = pieces(P, ds).filter(t => t.length === 3).map(t => `<polygon class="ct-tri" points="${t.map(k => at(P, k).map(f).join(',')).join(' ')}"/>`).join('');
  const lines = ds.map(d => linePath(P, d, `ct-line${kept.has(d) ? ' kept' : ''}${(hint?.type === 'erase' || hint?.type === 'flip') && hint.d === d ? ' hinted' : ''}`)).join('');
  const refused = opts.refused !== null && opts.refused !== undefined ? linePath(P, opts.refused, 'ct-refused') : '';
  const hits = opts.solved ? '' : ds.map(d => {
    const act = opts.lineAct?.(d);
    return act ? linePath(P, d, `tm-edge-hit ct-hit${(hint?.type === act) && hint.d === d ? ' hinted' : ''}`, ` role="button" tabindex="0" aria-label="${esc(`Line ${lineName(P, d)}. ${act === 'flip' ? 'Flip' : 'Erase'}`)}" data-tg-edge="${d}" data-focus="tg-edge-${d}"`) : '';
  }).join('');
  const corners = P.xy.map((_, k) => {
    const [x, y] = at(P, k), [lx, ly] = at(P, k, R * 1.2), live = opts.draw && !opts.solved;
    const cls = `tg-point ct-corner${sel === k ? ' selected' : ''}${hintCorners.includes(k) ? ' hinted' : ''}`;
    const control = live ? ` role="button" tabindex="0" aria-label="${esc(`Corner ${LETTERS[k]}${sel === k ? ', chosen' : ''}`)}" data-tg-point="${k}" data-focus="tg-point-${k}"` : '';
    return `<g class="${cls}" transform="translate(${f(x)},${f(y)})"${control}>${live ? '<circle class="tg-reach" r="17"/>' : ''}<circle class="tg-pip" r="${live ? 6.5 : 4}"/></g><text class="ct-label" x="${f(lx)}" y="${f(ly + 5)}" aria-hidden="true">${LETTERS[k]}</text>`;
  }).join('');
  return `<svg class="tg-board ct-board${opts.solved ? ' solved' : ''}" viewBox="-128 -128 256 256" role="group" aria-label="${esc(`${SHAPES[P.n]}. ${describe(P, ds)}`)}" data-tg-board>${tris}<polygon class="ct-shape" points="${shapePoints(P)}"/>${lines}${refused}${hits}${corners}</svg>`;
}

const moveButton = (label, action, cls = '', extra = '') => `<button type="button" class="secondary ct-action ${cls}" data-ct-move="${esc(JSON.stringify(action))}" data-focus="ct-${action.type}" ${extra}>${label}</button>`;
const counter = (label, n, of, over) => `<p class="ct-counter" aria-label="${label}: ${n}${of === undefined ? '' : ` of ${of}`}">${label} <strong class="${over ? 'over' : ''}">${n}</strong>${of === undefined ? '' : ` / ${of}`}</p>`;
const card = (P, key, label, cls) => `<figure class="ct-card ${cls}">${mini(P, fromKey(P, key), '', label)}</figure>`;

function renderPuzzle(p, a) {
  const q = p.parameters, b = a.board, P = polygonFor(p), solved = solvedPuzzle(p, b), state = ui(p);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action?.type;
  let body, top = '', bottom = '', status;
  if (q.mode === 'every') {
    const kept = keptOf(p), now = isFull(P, b.diags) ? keyOf(P, b.diags) : null;
    body = drawBoard(P, b.diags, {draw: true, kept, sel: state.sel, refused: state.refused, hint, solved, lineAct: d => (kept.includes(d) ? null : 'erase')});
    // Finds sorted by the triangle on the side from A to the last corner.
    const found = [...b.found].map(k => fromKey(P, k)).sort((x, y) => apexOf(P, x) - apexOf(P, y) || keyOf(P, x).localeCompare(keyOf(P, y)));
    const groups = [...new Set(found.map(ds => apexOf(P, ds)))].map(g => `<li class="ct-group">${found.filter(ds => apexOf(P, ds) === g).map(ds => mini(P, ds, keyOf(P, ds) === now ? 'here' : '', describe(P, ds))).join('')}</li>`).join('');
    const actions = solved ? '' : `<div class="ct-actions">${moveButton('Clear', {type: 'clear'}, '', b.diags.length > kept.length ? '' : 'disabled')}${moveButton('That’s all', {type: 'claim'}, h === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '')}</div>`;
    bottom = `<ul class="ct-shelf" aria-label="Ways found">${groups}</ul>${actions}${b.missed ? '<p class="ct-note" role="status">There’s another.</p>' : ''}`;
    top = noteOf(state);
    status = `${describe(P, b.diags)}. ${plural(b.found.length, 'way', 'ways')} found.`;
  } else {
    const ds = here(p, b), flips = b.path.length - 1;
    body = drawBoard(P, ds, {hint, solved, lineAct: () => 'flip'});
    if (q.mode === 'reach') {
      top = `<div class="ct-bar">${card(P, q.target, 'Goal card', 'goal')}${counter('Flips', flips, q.budget, flips >= q.budget && !solved)}</div>${noteOf(state)}`;
      status = `${plural(flips, 'flip', 'flips')} of ${q.budget}. ${describe(P, ds)}.`;
    } else if (q.mode === 'home') {
      top = `<div class="ct-bar">${card(P, q.start, 'Home', 'home')}${counter('Flips', flips)}</div>`;
      status = `${plural(flips, 'flip', 'flips')}. ${describe(P, ds)}.`;
    } else {
      // The tour so far, home first.
      top = noteOf(state);
      bottom = `<ol class="ct-shelf ct-trail" aria-label="Ways visited">${b.path.map((k, i) => `<li>${mini(P, fromKey(P, k), `${i === 0 ? 'home' : ''}${i === b.path.length - 1 ? ' here' : ''}`, describe(P, fromKey(P, k)))}</li>`).join('')}</ol>`;
      status = `${plural(flips, 'flip', 'flips')}. ${describe(P, ds)}.`;
    }
  }
  return `<div class="ct-puzzle mode-${q.mode}${solved ? ' solved' : ''}" data-mechanic-wire="cuts">${top}<div class="ct-stage">${body}</div>${bottom}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const sizeIcon = n => mini(polygonOf(n), [], 'ct-size-icon', SHAPES[n]);
function renderPlay(p, a) {
  const b = a.board, P = polygonOf(b.n), state = ui(p);
  const sizes = `<div class="ct-tools" role="group" aria-label="Shape">${PLAY_SIZES.map(n => `<button type="button" class="secondary ct-tool ct-size" data-ct-move="${esc(JSON.stringify({type: 'size', n}))}" data-focus="ct-size-${n}" aria-pressed="${b.n === n}" aria-label="${SHAPES[n]}">${sizeIcon(n)}</button>`).join('')}</div>`;
  const tools = `<div class="ct-tools" role="group" aria-label="Tapping a line">${['flip', 'erase'].map(t => `<button type="button" class="secondary ct-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({tool: t}))}" data-focus="ct-tool-${t}" aria-pressed="${state.tool === t}">${t === 'flip' ? 'Flip' : 'Erase'}</button>`).join('')}${moveButton('Clear', {type: 'clear'}, '', b.diags.length ? '' : 'disabled')}</div>`;
  const body = drawBoard(P, b.diags, {draw: true, sel: state.sel, refused: state.refused, lineAct: d => (state.tool === 'erase' ? 'erase' : flipOf(P, b.diags, d) >= 0 ? 'flip' : null)});
  const note = noteOf(state);
  return `<div class="ct-puzzle mode-playground" data-mechanic-wire="cuts">${sizes}${note}<div class="ct-stage">${body}</div>${tools}<p class="sr-only" role="status">${esc(`${describe(P, b.diags)}.`)}</p></div>`;
}

const settle = p => Object.assign(ui(p), {sel: null, refused: null, note: null});
function wire(root, p, api) {
  const board = () => api.attempt().board;
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-ct-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    settle(p);
    try { api.apply(JSON.parse(control.dataset.ctMove)); } catch { /* malformed control data is ignored */ }
  });
  wireTri(root, null, {
    // The first corner tapped is chosen; the second draws the line, unless
    // it crosses another. Tapping the chosen corner again lets it go.
    point: k => {
      const b = board(), P = polygonFor(p, b), sel = ui(p).sel;
      if (sel === null || sel === k) { api.ui({sel: sel === k ? null : k, refused: null, note: null}); return null; }
      const d = diagonalOf(P, sel, k);
      if (d < 0 || b.diags.includes(d)) { api.ui({sel: d < 0 ? k : null, refused: null, note: null}); return null; }
      const action = {type: 'draw', a: sel, b: k};
      if (!hooks.move(p, b, action)) { api.ui({sel: null, refused: d, note: 'cross'}); return null; }
      settle(p);
      return action;
    },
    edge: d => {
      const mode = p.parameters.mode, b = board();
      const action = mode === 'every' ? {type: 'erase', d} : mode === 'playground' && ui(p).tool === 'erase' ? {type: 'erase', d} : {type: 'flip', d};
      // A flip back to a way already visited, or past the flips allowed, says why it did nothing.
      if (!hooks.move(p, b, action) && (mode === 'tour' || mode === 'reach')) { api.ui({sel: null, refused: null, note: mode === 'tour' ? 'visited' : 'budget'}); return null; }
      settle(p);
      return action;
    }
  }, api.apply);
}

const hooks = {
  fresh: p => p.parameters.mode === 'playground' ? freshPlay() : freshPuzzle(p),
  valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : validPuzzle(p, b),
  solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
  move: (p, b, action) => p.parameters.mode === 'playground' ? movePlay(b, action) : movePuzzle(p, b, action),
  hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
  render: (p, a) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a),
  wire,
  ui(p, payload) {
    if (!object(payload)) return;
    const state = ui(p), n = p.parameters.n ?? MAX_N;
    if ('sel' in payload) state.sel = integer(payload.sel) && payload.sel >= 0 && payload.sel < MAX_N ? payload.sel : null;
    if ('refused' in payload) state.refused = integer(payload.refused) && payload.refused >= 0 && payload.refused < n * n ? payload.refused : null;
    if ('note' in payload) state.note = Object.hasOwn(NOTES, payload.note) ? payload.note : null;
    if (payload.tool === 'flip' || payload.tool === 'erase') state.tool = payload.tool;
  },
  reset: p => { uiState.delete(p.id); },
  // Undo takes back a move but keeps the ways already found.
  carry: (p, from, to) => p.parameters.mode !== 'every' || !object(to) || !object(from) ? to : {...to, found: [...to.found, ...from.found.filter(k => !to.found.includes(k))], missed: false},
  noHint: p => p.parameters.mode === 'playground'
};
export const cutsMechanics = {cuts: hooks};
export {MIN_N, MAX_N};

// The family seam entry (dist/families.js).
export default {
  id: 'cuts',
  family: {id: 'cuts', symbol: '⬠'},
  mechanics: cutsMechanics,
  pack: new URL('./cuts.json', import.meta.url).href,
  css: new URL('./cuts.css', import.meta.url).href,
  focus: '.tg-point[role=button],.tm-edge-hit,.ct-action:not([disabled])'
};
