// Gentle hills (worksheet Week 47 and its bonus). A landscape is a row, or a
// ring, of towers, each a whole number of blocks high (0 allowed), and
// neighbouring towers differ by at most one block. Clues are towers whose
// heights are fixed. Clues can be completed exactly when every pair satisfies
// |a_c − a_d| ≤ dist(c, d), the number of steps between them (on a ring, the
// shorter way round). Then the lowest and highest completions are
// L(i) = max(0, max_c a_c − dist(i, c)) and U(i) = min_c a_c + dist(i, c),
// both legal, every completion lies between them, and every height from L(i)
// to U(i) occurs at tower i (the constant t clamped between L and U). A tower
// is fixed by the clues exactly when L(i) = U(i), which needs two clues with
// a straight ramp through it. So the fewest clues that fix a landscape are its
// turning towers, those not strictly between their two neighbours, plus the
// two ends of a row; every set of clues that fixes it contains them.
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['fill', 'every', 'pin'];

export const distance = (q, i, j) => { const d = Math.abs(i - j); return q.ring ? Math.min(d, q.sites - d) : d; };
export const neighbourPairs = q => [...Array.from({length: q.sites - 1}, (_, i) => [i, i + 1]), ...(q.ring && q.sites > 2 ? [[q.sites - 1, 0]] : [])];
export const clueAt = (q, i, clues = q.clues) => { const c = clues.find(([s]) => s === i); return c ? c[1] : null; };
// Pairs of clues too far apart in height for the steps between them.
export const conflicts = (q, clues = q.clues) => clues.flatMap(([c, a], k) => clues.slice(k + 1).filter(([d, b]) => Math.abs(a - b) > distance(q, c, d)).map(([d]) => [Math.min(c, d), Math.max(c, d)]));
export const lowest = (q, clues = q.clues) => Array.from({length: q.sites}, (_, i) => Math.max(0, ...clues.map(([c, a]) => a - distance(q, i, c))));
export const highest = (q, clues = q.clues) => Array.from({length: q.sites}, (_, i) => Math.min(q.top, ...clues.map(([c, a]) => a + distance(q, i, c))));
export const steep = (q, h) => neighbourPairs(q).filter(([i, j]) => h[i] !== null && h[j] !== null && Math.abs(h[i] - h[j]) > 1);
const heightOk = (q, v) => Number.isInteger(v) && v >= 0 && v <= q.top;
export const legal = (q, h, clues = q.clues) => h.length === q.sites && h.every(v => heightOk(q, v)) && !steep(q, h).length && clues.every(([c, a]) => h[c] === a);
// Every landscape that fits the clues, column by column.
export function completions(q, clues = q.clues) {
  if (conflicts(q, clues).length) return [];
  const lo = lowest(q, clues), hi = highest(q, clues), out = [], h = [];
  const go = i => {
    if (i === q.sites) { if (!q.ring || q.sites < 3 || Math.abs(h[i - 1] - h[0]) <= 1) out.push([...h]); return; }
    for (let v = lo[i]; v <= hi[i]; v++) if (i === 0 || Math.abs(v - h[i - 1]) <= 1) { h.push(v); go(i + 1); h.pop(); }
  };
  go(0);
  return out;
}
const key = h => h.join(',');
// The landscape nearest height t everywhere: t clamped between the envelopes.
export const level = (q, t, clues = q.clues) => { const lo = lowest(q, clues), hi = highest(q, clues); return lo.map((v, i) => Math.max(v, Math.min(hi[i], t))); };

// Pinning: the shown landscape's heights at the pinned towers act as clues.
export const pinClues = (q, pins) => pins.map(s => [s, q.land[s]]);
export const fixed = (q, pins) => { const c = pinClues(q, pins), lo = lowest(q, c), hi = highest(q, c); return lo.every((v, i) => v === hi[i]); };
// The towers every pinning must include: the ends of a row, and every tower
// not strictly between its two neighbours (a peak, a valley or a flat).
export function needed(q) {
  const h = q.land, n = q.sites, out = [];
  for (let i = 0; i < n; i++) {
    if (!q.ring && (i === 0 || i === n - 1)) { out.push(i); continue; }
    const a = h[(i + n - 1) % n], b = h[(i + 1) % n];
    if (!((a < h[i] && h[i] < b) || (a > h[i] && h[i] > b))) out.push(i);
  }
  return out;
}
export const budgetOf = q => needed(q).length;

// The saves. Fill: the heights (null where no tower is built yet) and a Can't
// claim. Every: the heights, the landscapes found so far and That's all.
// Pin: the pinned towers.
const blank = q => Array.from({length: q.sites}, (_, i) => clueAt(q, i));
const cellOk = (q, v) => v === null || heightOk(q, v);
const isClue = (q, s) => Number.isInteger(s) && clueAt(q, s) !== null;
const pairOk = (q, pair) => Array.isArray(pair) && pair.length === 2 && pair.every(s => isClue(q, s)) && pair[0] < pair[1];
const isConflict = (q, pair) => conflicts(q).some(([c, d]) => c === pair[0] && d === pair[1]);
const answers = new Map();
export const allLandscapes = q => { const k = JSON.stringify([q.sites, q.ring, q.top, q.clues]); if (!answers.has(k)) answers.set(k, completions(q).map(key)); return answers.get(k); };
const heightsOk = (q, h) => Array.isArray(h) && h.length === q.sites && h.every(v => cellOk(q, v)) && q.clues.every(([c, a]) => h[c] === a);
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const keys = Object.keys(b).sort().join();
  if (q.mode === 'pin') {
    return keys === 'pins' && Array.isArray(b.pins) && b.pins.length <= budgetOf(q) && b.pins.every((s, k) => Number.isInteger(s) && s >= 0 && s < q.sites && (k === 0 || b.pins[k - 1] < s));
  }
  if (q.mode === 'every') {
    if (keys !== 'found,h,said' || !heightsOk(q, b.h) || !Array.isArray(b.found)) return false;
    const all = allLandscapes(q);
    if (!b.found.every((f, k) => all.includes(f) && (k === 0 || b.found[k - 1] < f))) return false;
    return [null, 'done', 'wrong'].includes(b.said) && (b.said !== 'done' || b.found.length === all.length);
  }
  if (keys !== 'claimed,h,refused' || !heightsOk(q, b.h)) return false;
  if (b.claimed !== null && !(q.cant && pairOk(q, b.claimed) && isConflict(q, b.claimed))) return false;
  if (b.refused !== null && !(q.cant && pairOk(q, b.refused) && !isConflict(q, b.refused))) return false;
  return b.claimed === null || b.refused === null;
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'pin') return fixed(q, b.pins);
  if (q.mode === 'every') return b.said === 'done';
  return b.claimed !== null || legal(q, b.h);
}
const freshPuzzle = p => {
  const q = p.parameters;
  if (q.mode === 'pin') return {pins: []};
  if (q.mode === 'every') return {h: blank(q), found: [], said: null};
  return {h: blank(q), claimed: null, refused: null};
};
// A finished landscape is recorded as found.
const record = (q, b) => legal(q, b.h) && !b.found.includes(key(b.h)) ? {...b, found: [...b.found, key(b.h)].sort()} : b;
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  if (q.mode === 'pin') {
    const s = action.site;
    if (action.type !== 'pin' || !Number.isInteger(s) || s < 0 || s >= q.sites) return null;
    if (b.pins.includes(s)) return {pins: b.pins.filter(x => x !== s)};
    return b.pins.length < budgetOf(q) ? {pins: [...b.pins, s].sort((x, y) => x - y)} : null;
  }
  if (action.type === 'set') {
    const s = action.site;
    if (!Number.isInteger(s) || s < 0 || s >= q.sites || isClue(q, s) || !cellOk(q, action.h) || action.h === undefined || b.h[s] === action.h) return null;
    const h = b.h.map((v, i) => i === s ? action.h : v);
    return q.mode === 'every' ? record(q, {...b, h, said: null}) : {...b, h, refused: null};
  }
  if (action.type === 'done' && q.mode === 'every') return {...b, said: b.found.length === allLandscapes(q).length ? 'done' : 'wrong'};
  if (action.type === 'cant' && q.mode === 'fill' && q.cant) {
    const pair = Array.isArray(action.pair) && action.pair.length === 2 ? [...action.pair].sort((x, y) => x - y) : null;
    if (!pair || !pairOk(q, pair)) return null;
    return isConflict(q, pair) ? {...b, claimed: pair, refused: null} : {...b, claimed: null, refused: pair};
  }
  return null;
}

// Hints. Pin: unpin a tower no pinning needs, else pin a turning tower. Fill:
// Can't and the two clues when they are too far apart, else one tower of the
// legal landscape nearest the board. Every: one tower of the nearest landscape
// not found yet, and That's all once every one is found.
const column = i => `column ${i + 1}`;
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
const off = (h, goal) => h.reduce((n, v, i) => n + (v === null ? 1 + goal[i] : Math.abs(v - goal[i])), 0);
const nearest = (h, goals) => goals.reduce((best, g) => off(h, g) < off(h, best) ? g : best);
function towardHint(q, h, goal) {
  const wrong = h.map((v, i) => v !== goal[i] ? i : -1).filter(i => i >= 0), steepSites = new Set(steep(q, h).flat());
  const i = wrong.find(k => h[k] === null) ?? wrong.find(k => steepSites.has(k)) ?? wrong.reduce((x, y) => Math.abs(h[y] - goal[y]) > Math.abs(h[x] - goal[x]) ? y : x);
  return {type: 'move', action: {type: 'set', site: i, h: goal[i]}, text: `Make ${column(i)} ${goal[i]} high.`};
}
function plan(p, b) {
  const q = p.parameters;
  if (q.mode === 'pin') {
    const need = needed(q), extra = b.pins.find(s => !need.includes(s));
    if (extra !== undefined) return {type: 'move', action: {type: 'pin', site: extra}, text: `Unpin ${column(extra)}. The towers beside it fix it.`};
    const s = need.find(x => !b.pins.includes(x));
    return {type: 'move', action: {type: 'pin', site: s}, text: `Pin ${column(s)}.`};
  }
  if (q.mode === 'every') {
    const left = allLandscapes(q).filter(f => !b.found.includes(f)).map(f => f.split(',').map(Number));
    if (!left.length) return {type: 'move', action: {type: 'done'}, text: 'You have every landscape. Press That’s all.'};
    return towardHint(q, b.h, nearest(b.h, left));
  }
  if (q.cant && conflicts(q).length) {
    const [c, d] = conflicts(q)[0];
    return {type: 'move', action: {type: 'cant', pair: [c, d]}, text: `${capital(column(c))} and ${column(d)} are ${Math.abs(clueAt(q, c) - clueAt(q, d))} blocks apart in height, with only ${distance(q, c, d)} ${distance(q, c, d) === 1 ? 'step' : 'steps'} between them. Press Can’t and tap both.`};
  }
  const goals = [lowest(q), highest(q), ...Array.from({length: q.top + 1}, (_, t) => level(q, t))];
  return towardHint(q, b.h, nearest(b.h, goals));
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  return plan(p, b);
}

// The playground: 5, 7 or 9 towers in a row or a ring, any heights, and pins:
// tap a tower's top block to pin it, and the empty towers show the heights
// the pins allow.
const PLAY_SIZES = [5, 7, 9], PLAY_TOP = 6;
const freshPlay = () => ({sites: 7, ring: false, h: Array(7).fill(null), pins: []});
function validPlay(b) {
  if (!object(b) || Object.keys(b).sort().join() !== 'h,pins,ring,sites' || !PLAY_SIZES.includes(b.sites) || typeof b.ring !== 'boolean') return false;
  if (!Array.isArray(b.h) || b.h.length !== b.sites || !b.h.every(v => v === null || (Number.isInteger(v) && v >= 0 && v <= PLAY_TOP))) return false;
  return Array.isArray(b.pins) && b.pins.every((s, k) => Number.isInteger(s) && s >= 0 && s < b.sites && b.h[s] !== null && (k === 0 || b.pins[k - 1] < s));
}
const playQ = b => ({sites: b.sites, ring: b.ring, top: PLAY_TOP, clues: b.pins.map(s => [s, b.h[s]]), mode: 'playground'});
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  const site = action.site, inside = Number.isInteger(site) && site >= 0 && site < b.sites;
  if (action.type === 'set') {
    if (!inside || b.pins.includes(site) || !Number.isInteger(action.h) || action.h < 0 || action.h > PLAY_TOP || b.h[site] === action.h) return null;
    return {...b, h: b.h.map((v, i) => i === site ? action.h : v)};
  }
  if (action.type === 'pin') {
    if (!inside || b.h[site] === null) return null;
    return {...b, pins: b.pins.includes(site) ? b.pins.filter(s => s !== site) : [...b.pins, site].sort((x, y) => x - y)};
  }
  if (action.type === 'size') return PLAY_SIZES.includes(action.sites) && action.sites !== b.sites ? {...b, sites: action.sites, h: Array(action.sites).fill(null), pins: []} : null;
  if (action.type === 'shape') return typeof action.ring === 'boolean' && action.ring !== b.ring ? {...b, ring: action.ring} : null;
  if (action.type === 'clear') return b.h.some((v, i) => v !== null && !b.pins.includes(i)) ? {...b, h: b.h.map((v, i) => b.pins.includes(i) ? v : null)} : null;
  return null;
}

// Drawing. A tower is a column of level cells, 0 at the bottom: blocks fill
// the column up to its top block. A clue or pinned tower is dark. Ghost cells
// (dashed) mark the other heights a tower's top may take; once every pin is
// used and the landscape is not yet fixed, dotted rings mark a second
// landscape that fits the pins. A red bar between two towers marks a jump of
// more than one block. On a ring, a faint copy of the first tower closes the
// row so the last jump can be seen.
const hinted = (shown, action) => shown && JSON.stringify(shown) === JSON.stringify(action) ? ' hinted' : '';
const swap = (html, cls) => html.replace('class="secondary expansion-action"', `class="${cls}"`);
const heightWords = v => v === null ? 'empty' : `${v} high`;
// One cell: what it shows, and what tapping it does.
function cellHtml(look, action, label, focus = true) {
  const inner = look.includes(' top') ? '<i class="hills-marker"></i>' : look.includes(' peek') ? '<i class="hills-peek-marker"></i>' : '';
  if (!action) return `<span class="${look}" aria-hidden="true">${inner}</span>`;
  if (action.ui) return `<button type="button" class="${look}" data-action="mechanic-ui" data-ui='${esc(JSON.stringify(action.ui))}' ${label ? `aria-label="${esc(label)}"` : 'tabindex="-1" aria-hidden="true"'}>${inner}</button>`;
  return swap(actionButton(inner, action, label && focus ? `aria-label="${esc(label)}"` : 'tabindex="-1" aria-hidden="true"'), look);
}
// The look and action of every cell of tower i, top level first.
function towerCells(q, i, s) {
  const v = s.h[i], clue = s.clues.has(i), cells = [];
  for (let t = q.top; t >= 0; t--) {
    let look = 'hills-cell', action = null, label = '';
    if (v !== null && t < v) look += ' block';
    if (v === t) look += ' top';
    if (s.ghost?.[i]?.includes(t) && v !== t) look += ' ghost';
    if (s.peek && s.peek[i] === t && v !== t) look += ' peek';
    if (s.apart?.includes(i) && t === v) look += ' apart';
    if (s.mode === 'pin') {
      action = {type: 'pin', site: i};
      label = t === v ? `${clue ? 'Unpin' : 'Pin'} ${column(i)}` : '';
    } else if (s.mode === 'claim') {
      if (clue && t === v) {
        const picked = s.picks.includes(i), mark = s.shown?.type === 'cant' && s.shown.pair.includes(i) ? ' hinted' : '';
        look += ` hills-pickable${picked ? ' picked' : ''}${mark}`;
        action = s.picks.length === 1 && !picked ? {type: 'cant', pair: [s.picks[0], i]} : {ui: {pick: i}};
        label = `Clue in ${column(i)}`;
      }
    } else if (s.mode === 'play') {
      if (v === t) { action = {type: 'pin', site: i}; label = `${clue ? 'Unpin' : 'Pin'} ${column(i)}`; }
      else if (!clue) { action = {type: 'set', site: i, h: t}; label = `${capital(column(i))}, ${t} high`; }
    } else if (s.mode === 'set' && !clue && t !== v) {
      action = {type: 'set', site: i, h: t};
      label = `${capital(column(i))}, ${t} high`;
    } else if (s.mode === 'set' && !clue && t === v) {
      action = {type: 'set', site: i, h: null};
      label = `Clear ${column(i)}`;
    }
    if (action && !action.ui && (s.mode !== 'pin' || t === v)) look += hinted(s.shown, action);
    cells.push(cellHtml(look, action, label));
  }
  return cells.join('');
}
// s: {mode: 'set' | 'claim' | 'pin' | 'play' | 'still', h, clues: Set, ghost,
// peek, picks, apart, shown, solved}
function landHtml(q, s) {
  const steepPairs = steep(q, s.h);
  const col = (i, copy = false) => {
    const clue = s.clues.has(i), label = `${capital(column(i))}${clue ? (s.mode === 'pin' || s.mode === 'play' ? ', pinned' : ', clue') : ''}: ${heightWords(s.h[i])}`;
    const cells = copy ? towerCells(q, i, {...s, mode: 'still', ghost: null, peek: null}) : towerCells(q, i, s);
    return `<div class="hills-col${clue ? ' clue' : ''}${copy ? ' copy' : ''}" ${copy ? 'aria-hidden="true"' : `role="group" aria-label="${esc(label)}"`}>${cells}</div>`;
  };
  const gap = (i, j) => {
    const bad = steepPairs.some(([x, y]) => x === i && y === j);
    return `<span class="hills-gap${bad ? ' steep' : ''}"${bad ? ` style="--lo:${Math.min(s.h[i], s.h[j])};--hi:${Math.max(s.h[i], s.h[j])}"` : ''} aria-hidden="true">${bad ? '<i></i>' : ''}</span>`;
  };
  const axis = `<div class="hills-axis" aria-hidden="true">${Array.from({length: q.top + 1}, (_, k) => `<span>${q.top - k}</span>`).join('')}</div>`;
  const parts = [axis];
  for (let i = 0; i < q.sites; i++) { parts.push(col(i)); if (i < q.sites - 1) parts.push(gap(i, i + 1)); }
  if (q.ring) parts.push(gap(q.sites - 1, 0), col(0, true));
  return `<div class="hills-land${q.ring ? ' ring' : ''}${s.solved ? ' solved' : ''}${q.sites > 7 ? ' hills-wide' : ''}" style="--levels:${q.top + 1}">${parts.join('')}</div>`;
}
// A found landscape, drawn small.
function thumbHtml(q, f) {
  const h = f.split(',').map(Number), w = 7, u = 5;
  return `<li><svg viewBox="0 0 ${h.length * w} ${(q.top + 1) * u}" width="${h.length * w}" height="${(q.top + 1) * u}" role="img" aria-label="${esc(h.join(', '))}">${h.map((v, i) => `<rect x="${i * w + 0.5}" y="${(q.top - v) * u}" width="${w - 1}" height="${(v + 1) * u}" rx="1"/>`).join('')}</svg></li>`;
}

const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, picks: []}); return uiState.get(p.id); };

function renderPuzzle(p, attempt) {
  const q = p.parameters, b = attempt.board, solved = solvedPuzzle(p, b), state = ui(p);
  const shown = attempt.hintLevel >= 2 && !solved ? plan(p, b).action : null;
  if (q.mode === 'pin') {
    const pins = new Set(b.pins), c = pinClues(q, b.pins), lo = lowest(q, c), hi = highest(q, c);
    const ghost = solved ? null : lo.map((v, i) => pins.has(i) ? [] : Array.from({length: hi[i] - v + 1}, (_, k) => v + k));
    // The certificate: with every pin used and a tower still free, a second
    // landscape that fits the pins (the first free tower at another height).
    const free = solved || b.pins.length < budgetOf(q) ? -1 : ghost.findIndex(g => g.length > 1);
    const peek = free < 0 ? null : level(q, lo[free] !== q.land[free] ? lo[free] : hi[free], c);
    const land = landHtml(q, {mode: solved ? 'still' : 'pin', h: q.land, clues: pins, ghost, peek, shown, solved});
    const budget = budgetOf(q), left = budget - b.pins.length;
    const slots = `<ol class="hills-pins" aria-label="${left} ${left === 1 ? 'pin' : 'pins'} left">${Array.from({length: budget}, (_, k) => `<li class="${k < b.pins.length ? 'used' : ''}"></li>`).join('')}</ol>`;
    const status = peek ? `Another landscape fits: ${peek.join(', ')}.` : solved ? 'Only this landscape fits.' : `${ghost.filter(g => g.length > 1).length} towers can still change.`;
    return `<div class="hills-board mode-pin">${land}${slots}<p class="sr-only" role="status">${esc(status)}</p></div>`;
  }
  if (q.mode === 'every') {
    const land = landHtml(q, {mode: solved ? 'still' : 'set', h: b.h, clues: new Set(q.clues.map(([c]) => c)), shown, solved});
    const found = b.found.length ? `<ol class="hills-found" aria-label="Landscapes found">${b.found.map(f => thumbHtml(q, f)).join('')}</ol>` : '';
    const done = solved ? '' : `<div class="hills-tools">${swap(actionButton('That’s all', {type: 'done'}), `primary expansion-action hills-done${hinted(shown, {type: 'done'})}`)}</div>`;
    const note = b.said === 'wrong' ? '<p class="hills-note" role="status">There is another landscape.</p>' : `<p class="sr-only" role="status">${esc(b.h.map((v, i) => `${capital(column(i))} ${heightWords(v)}`).join(', '))}</p>`;
    return `<div class="hills-board mode-every" data-mechanic-wire="hills">${land}${found}${done}${note}</div>`;
  }
  const claiming = q.cant && !solved && (state.claiming || shown?.type === 'cant');
  const clues = new Set(q.clues.map(([c]) => c)), picks = b.claimed || (claiming ? state.picks : []);
  const land = landHtml(q, {mode: claiming ? 'claim' : solved ? 'still' : 'set', h: b.h, clues, picks, apart: b.claimed, shown, solved});
  const cant = q.cant && !solved ? `<div class="hills-tools"><button type="button" class="secondary hills-cant${shown?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' aria-pressed="${claiming}">Can’t</button></div>` : '';
  const claimed = b.claimed ? `<p class="sr-only">${esc(`The clues in ${column(b.claimed[0])} and ${column(b.claimed[1])} are too far apart.`)}</p>` : '';
  const note = b.refused ? '<p class="hills-note" role="status">Those two clues fit.</p>' : `<p class="sr-only" role="status">${esc(`${b.h.map((v, i) => `${capital(column(i))} ${heightWords(v)}`).join(', ')}.${steep(q, b.h).length ? ' A jump is too big.' : ''}`)}</p>`;
  return `<div class="hills-board mode-fill${b.claimed ? ' claimed' : ''}" data-mechanic-wire="hills" ${b.claimed ? `data-claimed="${b.claimed.join(',')}"` : ''}>${land}${cant}${claimed}${note}</div>`;
}
function renderPlay(p, attempt) {
  const b = attempt.board, q = playQ(b), pins = new Set(b.pins);
  const lo = lowest(q), hi = highest(q), clash = conflicts(q).length > 0;
  const ghost = !b.pins.length || clash ? null : lo.map((v, i) => b.h[i] === null ? Array.from({length: hi[i] - v + 1}, (_, k) => v + k) : []);
  const choose = (label, action, on) => swap(actionButton(label, action, `aria-pressed="${on}"`), 'secondary expansion-action hills-choice');
  const settings = `<div class="hills-settings"><div class="hills-options" role="group" aria-label="Towers">${PLAY_SIZES.map(k => choose(String(k), {type: 'size', sites: k}, k === b.sites)).join('')}</div><div class="hills-options" role="group" aria-label="Shape">${choose('Row', {type: 'shape', ring: false}, !b.ring)}${choose('Ring', {type: 'shape', ring: true}, b.ring)}</div></div>`;
  const tools = `<div class="hills-tools">${actionButton('Clear', {type: 'clear'}, b.h.some((v, i) => v !== null && !pins.has(i)) ? '' : 'disabled')}</div>`;
  const status = clash ? 'Two pins are too far apart.' : steep(q, b.h).length ? 'A jump is too big.' : 'Every jump is gentle.';
  return `<div class="hills-board hills-play" data-mechanic-wire="hills">${settings}${landHtml(q, {mode: 'play', h: b.h, clues: pins, ghost})}${tools}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Dragging up or down a tower sets its height where the finger stops.
function wire(root, p, api) {
  const board = root.classList.contains('hills-board') ? root : root.querySelector('.hills-board');
  if (!board) return;
  let dragging = null;
  board.addEventListener('pointerdown', e => { const cell = e.target.closest('.hills-col:not(.clue):not(.copy) .hills-cell'); dragging = cell ? cell.closest('.hills-col') : null; });
  const stop = () => { dragging = null; };
  board.addEventListener('pointerup', stop);
  board.addEventListener('pointercancel', stop);
  board.addEventListener('pointermove', e => {
    if (!dragging) return;
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.hills-cell');
    if (!under || under.closest('.hills-col') !== dragging || under.classList.contains('top') || !under.dataset.move) return;
    const move = JSON.parse(under.dataset.move);
    if (move?.type === 'set' && move.h !== null) api.apply(move);
  });
}

const playground = p => p.parameters.mode === 'playground';
export const hillMechanics = {
  hills: {
    fresh: p => playground(p) ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => playground(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => playground(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action) => {
      const next = playground(p) ? movePlay(b, action) : movePuzzle(p, b, action);
      if (next) Object.assign(ui(p), {claiming: false, picks: []});
      return next;
    },
    hint: (p, b) => playground(p) ? {type: 'note'} : hintPuzzle(p, b),
    render: (p, a) => playground(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    // Can't: the first clue tapped is kept here, a tap on a second makes the
    // claim.
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: []});
      if (Number.isInteger(payload.pick)) state.picks = state.picks.includes(payload.pick) ? [] : [payload.pick];
    },
    reset: p => { uiState.delete(p.id); },
    noHint: playground
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'hills',
  family: {id: 'hills', symbol: '∿'},
  mechanics: hillMechanics,
  pack: new URL('./hills.json', import.meta.url).href,
  css: new URL('./hills.css', import.meta.url).href,
  focus: '.hills-cell:is(button):not([tabindex="-1"]),.hills-choice,.hills-done,.hills-cant'
};
