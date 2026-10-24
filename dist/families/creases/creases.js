// Flat folds (worksheet Week 28, single-vertex flat folding). A paper disk is
// creased along rays from its centre. The child labels each ray a mountain
// (M) or a valley (V), seen from the yellow front, and presses Fold; the app
// searches the layer orders (fold.js) and folds the rim of the disk up like
// a strip of paper, flat or jammed. Four modes on one mechanic:
// - fold: one disk, some labels printed. Fold it, or press Can't and colour
//   the wedges by the side each would show: an odd number of rays leaves two
//   neighbours facing the same way, and with an even number the yellow
//   wedges and the green ones are the two fans that must each make a
//   half-turn.
// - tabs: three or four right-angle disks share a stock of M and V tabs.
//   Every folding right-angle disk has one or three M's, so the stock can
//   fail by parity; the child's certificate marks each disk with the tabs it
//   can take: one M and one V, or two the same.
// - ray: drag in the one ray that lets a disk close, then fold it.
// - playground: add, label and remove rays on a disk and fold it.
import {esc} from '../../expansion-controls.js';
import {image, alternating, sectorsOf, rayAngles, foldResult, completions, needs, blanks, shares, oddDisks, sum} from './fold.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keysAre = (o, keys) => object(o) && Object.keys(o).sort().join() === [...keys].sort().join();
const int = v => Number.isInteger(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const memo = (cache, key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
export const MODES = ['fold', 'tabs', 'ray', 'playground'];
export const STEP = 15, MAX_RAYS = 8;
const LETTERS = 'ABCD';
const LETTER = {M: 'mountain', V: 'valley'};
const wordOf = labels => labels.map(l => l || '.').join('');
const full = labels => labels.every(l => l === 'M' || l === 'V');
export const nextLabel = l => (l === 'M' ? 'V' : 'M');

// --- Colouring: the certificate for an impossible disk -----------------------
// paint[k] is F (yellow, front up) or B (green, back up) for sector k, '.'
// before it is coloured. Ray k joins sectors k-1 and k; it clashes when both
// show the same colour.
export const clashes = paint => [...paint].map((c, k) => (c !== '.' && paint[(k + paint.length - 1) % paint.length] === c ? k : -1)).filter(k => k >= 0);
// An odd disk: exactly one clash. An even disk: none, and only when the
// alternate wedges don't make half-turns (so the fans drawn after it show
// the reason; a disk whose letters alone fail has no colouring certificate).
export const certificate = (angles, paint) => !paint.includes('.') && (angles.length % 2 ? clashes(paint).length === 1 : clashes(paint).length === 0 && alternating(angles)[0] !== 180);
// The colouring the hints aim at: front up, back up, round the disk.
const alternate = n => Array.from({length: n}, (_, k) => (k % 2 ? 'B' : 'F')).join('');

// --- One disk with printed labels --------------------------------------------------
// Board: {labels, tried, paint, told, done}. tried: the last labelling that
// was folded and failed (its jam is shown while the labels are the same).
// paint: the colouring while Can't is on. told: 'way' after a refused Can't
// (kept, through Undo, until a label changes) or 'match' after a colouring
// that is not a certificate. done: 'fold' or 'cant'.
const possibleCache = new Map();
const foldPossible = q => memo(possibleCache, JSON.stringify([q.angles, q.fixed]), () => completions(q.angles, q.fixed).length > 0);
const foldFresh = q => ({labels: q.fixed.map(f => f || null), tried: null, paint: null, told: null, done: null});
const fitsFixed = (fixed, w) => fixed.every((f, k) => !f || w[k] === f);
function validFold(q, b) {
  const n = q.angles.length;
  if (!keysAre(b, ['done', 'labels', 'paint', 'told', 'tried'])) return false;
  if (!Array.isArray(b.labels) || b.labels.length !== n || !b.labels.every((l, k) => (q.fixed[k] ? l === q.fixed[k] : [null, 'M', 'V'].includes(l)))) return false;
  if (b.tried !== null && !(typeof b.tried === 'string' && new RegExp(`^[MV]{${n}}$`).test(b.tried) && fitsFixed(q.fixed, b.tried) && foldResult(q.angles, b.tried).kind !== 'flat')) return false;
  if (b.paint !== null && !(typeof b.paint === 'string' && new RegExp(`^[.FB]{${n}}$`).test(b.paint) && b.tried !== null)) return false;
  const possible = foldPossible(q);
  if (b.told !== null && !(b.told === 'way' ? possible && b.done === null : b.told === 'match' && !possible && b.paint === '.'.repeat(n))) return false;
  if (b.done === null) return true;
  if (b.done === 'fold') return b.paint === null && b.told === null && full(b.labels) && foldResult(q.angles, wordOf(b.labels)).kind === 'flat';
  if (b.done === 'cant') return !possible && b.paint !== null && b.told === null && certificate(q.angles, b.paint);
  return false;
}
function moveFold(q, b, a) {
  const n = q.angles.length;
  if (a.type === 'label') {
    if (!keysAre(a, ['ray', 'to', 'type']) || !int(a.ray) || a.ray < 0 || a.ray >= n || q.fixed[a.ray] || !['M', 'V'].includes(a.to) || b.paint !== null || b.labels[a.ray] === a.to) return null;
    return {...b, labels: b.labels.map((l, k) => (k === a.ray ? a.to : l)), told: null};
  }
  if (a.type === 'fold') {
    if (!keysAre(a, ['type']) || b.paint !== null || !full(b.labels) || wordOf(b.labels) === b.tried) return null;
    const w = wordOf(b.labels);
    return foldResult(q.angles, w).kind === 'flat' ? {...b, done: 'fold', told: null} : {...b, tried: w};
  }
  if (a.type === 'cant') {
    // Can't comes after a fold that failed; pressing it again puts the
    // colours away. A refused Can't stays refused until a label changes.
    if (!keysAre(a, ['type'])) return null;
    if (b.paint === null) return b.tried === null || b.told === 'way' ? null : {...b, paint: '.'.repeat(n), told: null};
    return {...b, paint: null, told: b.told === 'way' ? 'way' : null};
  }
  if (a.type === 'paint') {
    if (!keysAre(a, ['sector', 'to', 'type']) || b.paint === null || b.told === 'way' || !int(a.sector) || a.sector < 0 || a.sector >= n || !['F', 'B'].includes(a.to) || b.paint[a.sector] === a.to) return null;
    return {...b, paint: b.paint.slice(0, a.sector) + a.to + b.paint.slice(a.sector + 1), told: null};
  }
  if (a.type === 'check') {
    if (!keysAre(a, ['type']) || b.paint === null || b.told === 'way' || b.paint.includes('.')) return null;
    if (foldPossible(q)) return {...b, paint: null, told: 'way'};
    if (certificate(q.angles, b.paint)) return {...b, done: 'cant', told: null};
    return {...b, paint: '.'.repeat(n), told: 'match'};
  }
  return null;
}

// --- Disks sharing a stock of tabs ----------------------------------------------------
// q.disks: [{angles, fixed}], q.stock: {M, V}, with as many tabs as blank
// rays. Board: {at, tried, pick, told, done}: at holds each disk's labels;
// pick, while Can't is on, marks each disk with the M tabs it can take:
// 'odd' (one M tab, with two open rays) or 'even' (none or two), null before
// a tap; told is 'way' (a refused Can't, kept until a tab moves) or 'pick'
// (marks that are not the certificate).
const tabsPossible = q => memo(possibleCache, JSON.stringify([q.disks, q.stock]), () => shares(q.disks, q.stock).length > 0);
const tabsFresh = q => ({at: q.disks.map(d => d.fixed.map(f => f || null)), tried: null, pick: null, told: null, done: null});
export const usedTabs = (q, at, letter) => sum(at.map((labels, i) => labels.filter((l, k) => !q.disks[i].fixed[k] && l === letter).length));
const tabsKey = at => at.map(wordOf).join('/');
const allPlaced = (q, at) => usedTabs(q, at, 'M') === q.stock.M && usedTabs(q, at, 'V') === q.stock.V;
const diskFolds = (q, at, i) => full(at[i]) && foldResult(q.disks[i].angles, wordOf(at[i])).kind === 'flat';
const allFold = (q, at) => q.disks.every((_, i) => diskFolds(q, at, i));
const MARKS = ['odd', 'even'];
const pickOk = (q, pick) => Array.isArray(pick) && pick.length === q.disks.length && pick.every(m => m === null || MARKS.includes(m));
const unmarked = q => q.disks.map(() => null);
// The certificate: each disk marked by the parity of the M tabs it takes.
export const tabsTruth = q => { const odd = oddDisks(q.disks, q.stock); return odd && q.disks.map((_, i) => (odd.includes(i) ? 'odd' : 'even')); };
function validTabs(q, b) {
  if (!keysAre(b, ['at', 'done', 'pick', 'told', 'tried']) || !Array.isArray(b.at) || b.at.length !== q.disks.length) return false;
  if (!b.at.every((labels, i) => Array.isArray(labels) && labels.length === q.disks[i].angles.length && labels.every((l, k) => (q.disks[i].fixed[k] ? l === q.disks[i].fixed[k] : [null, 'M', 'V'].includes(l))))) return false;
  if (usedTabs(q, b.at, 'M') > q.stock.M || usedTabs(q, b.at, 'V') > q.stock.V) return false;
  if (b.tried !== null) {
    if (typeof b.tried !== 'string') return false;
    const words = b.tried.split('/');
    const at = words.map(w => [...w]);
    if (words.length !== q.disks.length || !at.every((w, i) => w.length === q.disks[i].angles.length && w.every((c, k) => /[MV]/.test(c) && (!q.disks[i].fixed[k] || c === q.disks[i].fixed[k])))) return false;
    if (!allPlaced(q, at) || allFold(q, at)) return false;
  }
  if (b.pick !== null && !(pickOk(q, b.pick) && b.tried !== null)) return false;
  const possible = tabsPossible(q);
  if (b.told !== null && !(b.told === 'way' ? possible && b.done === null : b.told === 'pick' && !possible && same(b.pick, unmarked(q)))) return false;
  if (b.done === null) return true;
  if (b.done === 'fold') return b.pick === null && b.told === null && allPlaced(q, b.at) && allFold(q, b.at);
  if (b.done === 'cant') return !possible && b.told === null && same(b.pick, tabsTruth(q));
  return false;
}
function moveTabs(q, b, a) {
  if (a.type === 'tab') {
    if (!keysAre(a, ['disk', 'ray', 'to', 'type']) || b.pick !== null || !int(a.disk) || a.disk < 0 || a.disk >= q.disks.length) return null;
    const d = q.disks[a.disk];
    if (!int(a.ray) || a.ray < 0 || a.ray >= d.angles.length || d.fixed[a.ray] || ![null, 'M', 'V'].includes(a.to) || b.at[a.disk][a.ray] === a.to) return null;
    const at = b.at.map((labels, i) => (i === a.disk ? labels.map((l, k) => (k === a.ray ? a.to : l)) : labels));
    if (a.to && usedTabs(q, at, a.to) > q.stock[a.to]) return null;
    return {...b, at, told: null};
  }
  if (a.type === 'fold') {
    if (!keysAre(a, ['type']) || b.pick !== null || !allPlaced(q, b.at) || tabsKey(b.at) === b.tried) return null;
    return allFold(q, b.at) ? {...b, done: 'fold', told: null} : {...b, tried: tabsKey(b.at)};
  }
  if (a.type === 'cant') {
    if (!keysAre(a, ['type'])) return null;
    if (b.pick === null) return b.tried === null || b.told === 'way' ? null : {...b, pick: unmarked(q), told: null};
    return {...b, pick: null, told: b.told === 'way' ? 'way' : null};
  }
  if (a.type === 'pick') {
    // A tap shows one M tab and one V tab, then two the same, then one of
    // each again.
    if (!keysAre(a, ['disk', 'type']) || b.pick === null || b.told === 'way' || !int(a.disk) || a.disk < 0 || a.disk >= q.disks.length) return null;
    return {...b, pick: b.pick.map((m, i) => (i === a.disk ? (m === 'odd' ? 'even' : 'odd') : m)), told: null};
  }
  if (a.type === 'check') {
    if (!keysAre(a, ['type']) || b.pick === null || b.told === 'way' || b.pick.includes(null)) return null;
    if (tabsPossible(q)) return {...b, pick: null, told: 'way'};
    if (same(b.pick, tabsTruth(q))) return {...b, done: 'cant', told: null};
    return {...b, pick: unmarked(q), told: 'pick'};
  }
  return null;
}
// What a tap on a blank ray puts there: M, V, then nothing, skipping a letter
// whose tabs are all used.
export function nextTab(q, at, disk, ray) {
  const now = at[disk][ray], left = l => usedTabs(q, at, l) - (now === l ? 1 : 0) < q.stock[l];
  if (now === null) return left('M') ? 'M' : left('V') ? 'V' : null;
  if (now === 'M') return left('V') ? 'V' : null;
  return null;
}

// --- Drag in the ray ----------------------------------------------------------------------
// q.rays: the given rays (degrees clockwise from the top; the first is 0),
// q.fixed: their printed labels. The new ray goes on a tick (every 15
// degrees). Board: {at, labels, tried, done}; labels has the new ray's label
// last.
const rayFresh = q => ({at: null, labels: [...q.fixed.map(f => f || null), null], tried: null, done: false});
const freeTick = (q, at) => int(at) && at > 0 && at < 360 && at % STEP === 0 && !q.rays.includes(at);
// The rays clockwise from the top, as indices into labels (the new ray is
// q.rays.length).
export const rayOrder = (q, at) => [...q.rays.map((r, k) => [r, k]), [at, q.rays.length]].sort((x, y) => x[0] - y[0]).map(([, k]) => k);
export const rayAngles2 = (q, at) => sectorsOf([...q.rays, at]);
const rayWord = (q, b) => rayOrder(q, b.at).map(k => b.labels[k] || '.').join('');
const rayKey = (q, b) => `${b.at}:${rayWord(q, b)}`;
const rayFolds = (q, b) => b.at !== null && full(b.labels) && foldResult(rayAngles2(q, b.at), rayWord(q, b)).kind === 'flat';
// Ticks where the new ray lets the disk fold with some labels.
const placesCache = new Map();
export const goodPlaces = q => memo(placesCache, JSON.stringify([q.rays, q.fixed]), () => Array.from({length: 360 / STEP}, (_, k) => k * STEP).filter(at => freeTick(q, at) && completions(rayAngles2(q, at), rayOrder(q, at).map(k => (k < q.rays.length ? q.fixed[k] : null))).length > 0));
function validRay(q, b) {
  const g = q.rays.length;
  if (!keysAre(b, ['at', 'done', 'labels', 'tried']) || typeof b.done !== 'boolean') return false;
  if (b.at !== null && !freeTick(q, b.at)) return false;
  if (!Array.isArray(b.labels) || b.labels.length !== g + 1 || !b.labels.every((l, k) => (k < g && q.fixed[k] ? l === q.fixed[k] : [null, 'M', 'V'].includes(l)))) return false;
  if (b.tried !== null) {
    const m = typeof b.tried === 'string' && /^(\d+):([MV]+)$/.exec(b.tried);
    if (!m || !freeTick(q, Number(m[1])) || m[2].length !== g + 1) return false;
    const at = Number(m[1]), labels = Array(g + 1);
    rayOrder(q, at).forEach((k, pos) => { labels[k] = m[2][pos]; });
    if (!labels.every((l, k) => !(k < g && q.fixed[k]) || l === q.fixed[k]) || foldResult(rayAngles2(q, at), m[2]).kind === 'flat') return false;
  }
  return !b.done || rayFolds(q, b);
}
function moveRay(q, b, a) {
  const g = q.rays.length;
  if (a.type === 'place') {
    if (!keysAre(a, ['at', 'type']) || !freeTick(q, a.at) || a.at === b.at) return null;
    return {...b, at: a.at};
  }
  if (a.type === 'label') {
    if (!keysAre(a, ['ray', 'to', 'type']) || !int(a.ray) || a.ray < 0 || a.ray > g || (a.ray < g && q.fixed[a.ray]) || !['M', 'V'].includes(a.to) || b.labels[a.ray] === a.to) return null;
    return {...b, labels: b.labels.map((l, k) => (k === a.ray ? a.to : l))};
  }
  if (a.type === 'fold') {
    if (!keysAre(a, ['type']) || b.at === null || !full(b.labels) || rayKey(q, b) === b.tried) return null;
    return rayFolds(q, b) ? {...b, done: true} : {...b, tried: rayKey(q, b)};
  }
  return null;
}

// --- Playground -------------------------------------------------------------------------------
// Board: {rays (sorted ticks), labels, folded}: folded is the last disk
// folded, shown while the board is the same.
const playFresh = () => ({rays: [0, 90, 180, 270], labels: [null, null, null, null], folded: null});
const tick = at => int(at) && at >= 0 && at < 360 && at % STEP === 0;
const playKey = b => `${b.rays.join(',')}:${wordOf(b.labels)}`;
function validPlay(b) {
  if (!keysAre(b, ['folded', 'labels', 'rays']) || !Array.isArray(b.rays) || b.rays.length > MAX_RAYS || !b.rays.every((r, k) => tick(r) && (k === 0 || b.rays[k - 1] < r))) return false;
  if (!Array.isArray(b.labels) || b.labels.length !== b.rays.length || !b.labels.every(l => [null, 'M', 'V'].includes(l))) return false;
  if (b.folded === null) return true;
  const m = typeof b.folded === 'string' && /^([\d,]+):([MV]+)$/.exec(b.folded);
  if (!m) return false;
  const rays = m[1].split(',').map(Number);
  return rays.every((r, k) => tick(r) && (k === 0 || rays[k - 1] < r)) && rays.length === m[2].length && rays.length <= MAX_RAYS;
}
function movePlay(b, a) {
  const i = b.rays.indexOf(a.at);
  if (a.type === 'add') {
    if (!keysAre(a, ['at', 'type']) || !tick(a.at) || i >= 0 || b.rays.length >= MAX_RAYS) return null;
    const rays = [...b.rays, a.at].sort((x, y) => x - y), k = rays.indexOf(a.at);
    return {...b, rays, labels: [...b.labels.slice(0, k), null, ...b.labels.slice(k)]};
  }
  if (a.type === 'remove') {
    if (!keysAre(a, ['at', 'type']) || i < 0) return null;
    return {...b, rays: b.rays.filter((_, k) => k !== i), labels: b.labels.filter((_, k) => k !== i)};
  }
  if (a.type === 'label') {
    if (!keysAre(a, ['at', 'to', 'type']) || i < 0 || !['M', 'V'].includes(a.to) || b.labels[i] === a.to) return null;
    return {...b, labels: b.labels.map((l, k) => (k === i ? a.to : l))};
  }
  if (a.type === 'fold') {
    if (!keysAre(a, ['type']) || !b.rays.length || !full(b.labels) || playKey(b) === b.folded) return null;
    return {...b, folded: playKey(b)};
  }
  if (a.type === 'clear') {
    if (!keysAre(a, ['type']) || !b.rays.length) return null;
    return {rays: [], labels: [], folded: null};
  }
  return null;
}
const playAngles = b => (b.rays.length ? sectorsOf(b.rays) : []);

// --- The hooks' dispatch --------------------------------------------------------------------------
const modeOf = p => p.parameters.mode;
function fresh(p) {
  const q = p.parameters;
  return {fold: foldFresh, tabs: tabsFresh, ray: rayFresh, playground: playFresh}[q.mode](q);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  return {fold: validFold, tabs: validTabs, ray: validRay, playground: (_, x) => validPlay(x)}[q.mode](q, b);
}
function solved(p, b) {
  if (modeOf(p) === 'playground' || !valid(p, b)) return false;
  return modeOf(p) === 'ray' ? b.done : b.done !== null;
}
function move(p, b, a) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(a) || typeof a.type !== 'string') return null;
  const next = {fold: moveFold, tabs: moveTabs, ray: moveRay, playground: (_, x, y) => movePlay(x, y)}[q.mode](q, b, a);
  if (next) knobDrag = null;
  return next;
}

// --- Hints ------------------------------------------------------------------------------------------
// Toward the nearest folding labelling (fewest rays to change), then Fold.
// For an impossible disk or stock: an attempt first, then a fold, then the
// reason with Can't, then the certificate one tap at a time, then Check.
const hintCache = new Map();
const nearest = (labels, targets) => targets.reduce((best, t) => {
  const d = w => labels.reduce((s, l, k) => s + (l === w[k] ? 0 : 1), 0);
  return d(t) < d(best) ? t : best;
});
const rayName = k => `ray ${k + 1}`;
const labelHint = (k, to, action) => ({type: 'move', action, text: `Make ${rayName(k)} a ${LETTER[to]}.`});
const wedgeName = (k, n) => `the wedge from ray ${k + 1} to ray ${(k + 1) % n + 1}`;
const colourHint = (k, to, n) => ({type: 'move', action: {type: 'paint', sector: k, to}, text: `Colour ${wedgeName(k, n)} ${to === 'F' ? 'yellow' : 'green'}.`});
const offHint = {type: 'move', action: {type: 'cant'}, text: 'There is a way to fold it. Turn off Can’t.'};
export function reasonText(angles) {
  const n = angles.length;
  if (n % 2) return `Every crease turns the paper over, so the wedges take turns facing up and down. Going round ${n} creases, two wedges side by side end up facing the same way.`;
  const [o, e] = alternating(angles);
  return `Every crease turns the paper over, so every other wedge faces up. The wedges facing up make ${o}° and the others ${e}°, but folded flat each set must make a half-turn, 180°.`;
}
function foldHint(q, b) {
  const n = q.angles.length;
  if (b.paint !== null) {
    if (foldPossible(q) || b.told === 'way') return offHint;
    const goal = alternate(n), k = [...goal].findIndex((c, i) => b.paint[i] !== c);
    if (k >= 0) return colourHint(k, goal[k], n);
    return {type: 'move', action: {type: 'check'}, text: n % 2 ? 'The wedges on both sides of ray 1 face the same way. Press Check.' : 'Press Check.'};
  }
  if (foldPossible(q)) {
    const goal = nearest(b.labels, completions(q.angles, q.fixed)), k = b.labels.findIndex((l, i) => l !== goal[i]);
    if (k >= 0) return labelHint(k, goal[k], {type: 'label', ray: k, to: goal[k]});
    return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.'};
  }
  const k = b.labels.findIndex(l => l === null);
  if (k >= 0) return labelHint(k, 'M', {type: 'label', ray: k, to: 'M'});
  if (b.tried === null) return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.'};
  return {type: 'move', action: {type: 'cant'}, text: reasonText(q.angles)};
}
const diskName = i => `disk ${LETTERS[i]}`;
// The M tabs a mark stands for on a disk: every count of that parity up to
// the disk's open rays (one, or none and two, on two open rays).
const markCounts = (d, mark) => Array.from({length: blanks(d).length + 1}, (_, m) => m).filter(m => m % 2 === (mark === 'odd' ? 1 : 0));
const tabWord = (m, open) => (m === 0 ? `${open === 1 ? 'a V tab' : `${open} V tabs`}` : m === open ? `${open === 1 ? 'an M tab' : `${open} M tabs`}` : `${m === 1 ? 'one M tab' : `${m} M tabs`} and ${open - m === 1 ? 'one V tab' : `${open - m} V tabs`}`);
const markWords = (d, mark) => { const open = blanks(d).length, counts = markCounts(d, mark); return open === 2 && mark === 'even' ? 'two tabs the same' : counts.map(m => tabWord(m, open)).join(' or '); };
const tabPicture = (open, counts) => counts.map(m => `<span>${'<i class="m">M</i>'.repeat(m)}${'<i class="v">V</i>'.repeat(open - m)}</span>`).join('<em>or</em>');
// Rays of a right-angle disk are named by where they point.
const SIDES = {0: 'top', 90: 'right', 180: 'bottom', 270: 'left'};
const sideName = (d, k) => { const at = rayAngles(d.angles)[k]; return SIDES[at] ? `the ${SIDES[at]} ray` : rayName(k); };
function tabsHint(q, b) {
  if (b.pick !== null) {
    if (tabsPossible(q) || b.told === 'way') return {...offHint, text: 'There is a way to share the tabs. Turn off Can’t.'};
    const goal = tabsTruth(q), d = goal.findIndex((m, i) => b.pick[i] !== m);
    if (d >= 0) return {type: 'move', action: {type: 'pick', disk: d}, text: `Tap ${diskName(d)} until it shows ${markWords(q.disks[d], goal[d])}.`};
    return {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
  }
  const tabText = (i, k, to) => (to ? `Put ${to === 'M' ? 'an M' : 'a V'} tab on ${sideName(q.disks[i], k)} of ${diskName(i)}.` : `Take the tab off ${sideName(q.disks[i], k)} of ${diskName(i)}.`);
  if (tabsPossible(q)) {
    const all = shares(q.disks, q.stock), flat = b.at.flat();
    const goal = nearest(flat, all.map(ws => ws.join('').split(''))), place = [];
    q.disks.forEach((d, i) => d.angles.forEach((_, k) => place.push([i, k])));
    // Take off a wrong tab first, so the stock has the right letters left.
    const wrong = place.findIndex(([i, k], m) => b.at[i][k] !== null && b.at[i][k] !== goal[m]);
    if (wrong >= 0) { const [i, k] = place[wrong]; return {type: 'move', action: {type: 'tab', disk: i, ray: k, to: null}, text: tabText(i, k, null)}; }
    const missing = place.findIndex(([i, k], m) => b.at[i][k] === null);
    if (missing >= 0) { const [i, k] = place[missing], to = goal[missing]; return {type: 'move', action: {type: 'tab', disk: i, ray: k, to}, text: tabText(i, k, to)}; }
    return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.'};
  }
  for (let i = 0; i < q.disks.length; i++) for (const k of blanks(q.disks[i])) {
    if (b.at[i][k] !== null) continue;
    const to = usedTabs(q, b.at, 'M') < q.stock.M ? 'M' : 'V';
    return {type: 'move', action: {type: 'tab', disk: i, ray: k, to}, text: tabText(i, k, to)};
  }
  if (b.tried === null) return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.'};
  return {type: 'move', action: {type: 'cant'}, text: tabsReason(q)};
}
export function tabsReason(q) {
  const odd = oddDisks(q.disks, q.stock), even = q.disks.map((_, i) => i).filter(i => !odd.includes(i));
  const totals = [...new Set(even.reduce((acc, i) => acc.flatMap(t => needs(q.disks[i]).map(m => t + m)), [odd.length]))].sort((x, y) => x - y);
  const names = list => listWords(list.map(i => LETTERS[i]));
  return `A right-angle disk folds with one or three M’s. ${odd.length === 1 ? `Disk ${names(odd)} needs` : `Disks ${names(odd)} need`} one M tab and one V tab${odd.length === 1 ? '' : ' each'}${even.length ? `; ${even.length === 1 ? `disk ${names(even)} takes` : `disks ${names(even)} take`} two of the same` : ''}. So ${tabsTotal(q, totals).replace(/^The/, 'the')}`;
}
// The M tabs the disks can use between them, against the stock.
function tabsTotal(q, totals) {
  if (!totals) {
    const odd = oddDisks(q.disks, q.stock), even = q.disks.map((_, i) => i).filter(i => !odd.includes(i));
    totals = [...new Set(even.reduce((acc, i) => acc.flatMap(t => needs(q.disks[i]).map(m => t + m)), [odd.length]))].sort((x, y) => x - y);
  }
  return `The M tabs used are ${listWords(totals.map(String)).replace(/ and (\d+)$/, ' or $1')}, never ${q.stock.M}.`;
}
const tickWords = t => `${t} ${t === 1 ? 'tick' : 'ticks'}`;
function rayHint(q, b) {
  const places = goodPlaces(q), g = q.rays.length;
  if (b.at === null || !places.includes(b.at)) {
    const to = b.at === null ? places[0] : places.reduce((best, x) => (Math.abs(x - b.at) < Math.abs(best - b.at) ? x : best));
    const before = q.rays.filter(r => r < to).length - 1, after = (before + 1) % g;
    return {type: 'move', action: {type: 'place', at: to}, text: `${b.at === null ? 'Put' : 'Move'} the new ray between ${rayName(before)} and ${rayName(after)}, ${tickWords((to - q.rays[before]) / STEP)} after ${rayName(before)}.`};
  }
  const order = rayOrder(q, b.at), labels = order.map(k => b.labels[k]);
  const fixed = order.map(k => (k < g ? q.fixed[k] : null));
  const goal = nearest(labels, completions(rayAngles2(q, b.at), fixed)), pos = labels.findIndex((l, i) => l !== goal[i]);
  if (pos >= 0) {
    const k = order[pos], name = k === g ? 'the new ray' : rayName(k);
    return {type: 'move', action: {type: 'label', ray: k, to: goal[pos]}, text: `Make ${name} a ${LETTER[goal[pos]]}.`};
  }
  return {type: 'move', action: {type: 'fold'}, text: 'Press Fold.'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') return {type: 'note'};
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return memo(hintCache, JSON.stringify([p.id, b]), () => ({fold: foldHint, tabs: tabsHint, ray: rayHint}[q.mode](q, b)));
}

// --- Drawing ----------------------------------------------------------------------------------------------
// A disk is drawn in a 300 x 300 box round its centre: rim radius 100, the
// letters on chips just outside the rim, ticks every 15 degrees, wedges in
// the yellow of the front. Taps inside the disk go to the nearest ray (wire
// below); the chips are buttons for keys and screen readers.
// The knob rides just inside the rim, clear of the letter chips outside it.
// A small disk's chips sit a little further in, so their larger letters fit.
export const R = 100, CHIP = 122, CHIP_SMALL = 117, KNOB_R = 89, RIM_BAND_R = R - 14;
const f1 = x => Math.round(x * 10) / 10;
const pt = (deg, r) => [f1(r * Math.sin(deg * Math.PI / 180)), f1(-r * Math.cos(deg * Math.PI / 180))];
function wedge(a, b, r = R) {
  if (b - a >= 360) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
  const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r);
  return `M0 0L${x1} ${y1}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
}
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${esc(focus)}"`;
const buttonAttrs = (action, focus, label, pressed) => `role="button" tabindex="0" ${moveAttrs(action, focus)} aria-label="${esc(label)}"${pressed === undefined ? '' : ` aria-pressed="${pressed}"`}`;
const colourName = c => (c === 'F' ? 'yellow' : c === 'B' ? 'green' : 'not coloured');
// What a tap on the disk near a ray does (tapAction), as bands [inner
// radius, outer radius, most degrees either side of the ray], for each kind
// of disk; each chip reaches over its ray's bands and on out past itself to
// the edge of the picture, cut halfway to the neighbouring rays. (In the
// playground press-and-hold is watched on the whole disk, chips too.)
const REACH = {fold: [[R * 0.18, 142, 20]], tabs: [[R * 0.18, 142, 45]], ray: [[R * 0.18, RIM_BAND_R, 20], [RIM_BAND_R, R + 10, 7.5], [R + 10, 142, 20]], play: [[R * 0.18, R + 10, 7.5], [R + 10, 142, 20]]};
function reachPath(dirs, k, bands, [cx, cy]) {
  const d = dirs[k], gap = sign => Math.min(360, ...dirs.filter((_, j) => j !== k).map(e => (((e - d) * sign) % 360 + 360) % 360));
  const wide = (w, half) => Math.min(w, half), right = gap(1) / 2, left = gap(-1) / 2;
  const at = (deg, r) => { const [x, y] = pt(deg, r); return `${f1(x - cx)} ${f1(y - cy)}`; };
  const arc = (r, a0, a1) => { const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 4)); return Array.from({length: n}, (_, j) => at(a0 + (a1 - a0) * (j + 1) / n, r)); };
  const out = [at(d - wide(bands[0][2], left), bands[0][0]), ...arc(bands[0][0], d - wide(bands[0][2], left), d + wide(bands[0][2], right))];
  bands.forEach(([, r1, w], i) => { out.push(at(d + wide(w, right), r1)); if (bands[i + 1]) out.push(...arc(r1, d + wide(w, right), d + wide(bands[i + 1][2], right))); });
  const last = bands.at(-1);
  out.push(...arc(last[1], d + wide(last[2], right), d - wide(last[2], left)));
  for (let i = bands.length - 1; i >= 0; i--) { out.push(at(d - wide(bands[i][2], left), bands[i][0])); if (i > 0) out.push(...arc(bands[i][0], d - wide(bands[i][2], left), d - wide(bands[i - 1][2], left))); }
  return `M${out.join('L')}Z`;
}
// o: {dirs, labels, fixed, chip(k) -> action or null, paint, sector(k) ->
// action or null, marks: {jam, clash, hinted, hintedSector, ghost}, knob,
// hit, label, focus, small}
function diskSvg(o) {
  const n = o.dirs.length, dirs = o.dirs, ends = dirs.map((d, k) => (k + 1 < n ? dirs[k + 1] : dirs[0] + 360));
  const parts = [];
  // Wedges: yellow front, or the colouring while Can't is on.
  dirs.forEach((d, k) => {
    const c = o.paint ? o.paint[k] : 'F', act = o.sector?.(k);
    const cls = `cr-wedge ${c === 'F' ? 'front' : c === 'B' ? 'back' : 'blank'}${o.marks?.hintedSector === k ? ' hinted' : ''}`;
    const label = `Wedge from ray ${k + 1} to ray ${(k + 1) % n + 1}, ${ends[k] - d}°, ${colourName(c)}`;
    parts.push(act ? `<path class="${cls} cr-sector" d="${wedge(d, ends[k])}" ${buttonAttrs(act, `${o.focus}-w${k}`, label)}/>` : `<path class="${cls}" d="${wedge(d, ends[k])}"/>`);
  });
  if (!n) parts.push(`<circle class="cr-wedge front" r="${R}"/>`);
  if (o.hit) parts.push(`<circle class="cr-hit" r="${R + 10}" data-cr-hit="${o.hit}"/>`);
  parts.push(`<circle class="cr-rim" r="${R}"/>`);
  for (let t = 0; t < 360; t += STEP) { const [x1, y1] = pt(t, R), [x2, y2] = pt(t, R - 5); parts.push(`<line class="cr-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`); }
  if (o.marks?.ghost !== undefined) { const [x, y] = pt(o.marks.ghost, R); parts.push(`<circle class="cr-ghost hinted" cx="${x}" cy="${y}" r="9"/>`); }
  dirs.forEach((d, k) => {
    const l = o.labels[k], [x, y] = pt(d, R);
    parts.push(`<line class="cr-ray ${l ? l.toLowerCase() : 'open'}${o.isNew?.(k) ? ' new' : ''}${o.marks?.jam?.has(k) ? ' jam' : ''}" x1="0" y1="0" x2="${x}" y2="${y}"/>`);
  });
  if (o.marks?.clash !== undefined) { const [x, y] = pt(dirs[o.marks.clash], R * 0.48); parts.push(`<circle class="cr-clash" cx="${x}" cy="${y}" r="13"/>`); }
  // Chips: printed letters dark, the child's letters on paper, open rays empty.
  dirs.forEach((d, k) => {
    const l = o.labels[k], [x, y] = pt(d, o.small ? CHIP_SMALL : CHIP), act = o.chip?.(k), fixed = o.fixed[k];
    const cls = `cr-chip${fixed ? ' fixed' : ''}${l ? '' : ' open'}${o.isNew?.(k) ? ' new' : ''}${o.marks?.jam?.has(k) ? ' jam' : ''}${o.marks?.hinted === k ? ' hinted' : ''}`;
    const name = `${o.isNew?.(k) ? 'New ray' : o.rayName ? o.rayName(k) : `Ray ${o.number ? o.number(k) : k + 1}`}, ${l ? LETTER[l] : 'no letter'}${fixed ? ', printed' : ''}`;
    const body = o.small ? `<circle r="24"/><text y="10">${l || ''}</text>` : `<circle r="15"/><text y="5.5">${l || ''}</text>`;
    const bands = REACH[(o.hit || '').split(':')[0]], reach = act && bands ? `<path class="cr-reach" d="${reachPath(dirs, k, bands, [x, y])}"/>` : '';
    parts.push(act ? `<g class="${cls}" transform="translate(${x} ${y})" ${buttonAttrs(act.action, `${o.focus}-c${k}`, `${name}. ${act.say}`)}>${reach}${body}</g>` : `<g class="${cls}" transform="translate(${x} ${y})" role="img" aria-label="${esc(name)}">${body}</g>`);
  });
  // Each wedge's angle, in degrees.
  if (o.degrees && n > 1) dirs.forEach((d, k) => { const a = ends[k] - d, [x, y] = pt(d + a / 2, a < 45 ? 74 : 64); parts.push(`<text class="cr-deg" x="${x}" y="${f1(y + 4.5)}" aria-hidden="true">${a}°</text>`); });
  // Small ray numbers inside the rim, beside each ray.
  if (!o.small) dirs.forEach((d, k) => { if (o.isNew?.(k)) return; const [x, y] = pt(d + 7, R - 14); parts.push(`<text class="cr-num" x="${x}" y="${f1(y + 4)}" aria-hidden="true">${o.number ? o.number(k) : k + 1}</text>`); });
  if (o.knob) parts.push(o.knob);
  parts.push('<circle class="cr-centre" r="3"/>');
  if (o.letter) parts.push(`<text class="cr-disk-letter" x="-136" y="-108" aria-hidden="true">${o.letter}</text>`);
  return `<svg class="cr-disk${o.small ? ' cr-small' : ''}${o.ok ? ' ok' : ''}" viewBox="-142 -142 284 284" ${o.hidden ? 'aria-hidden="true"' : `role="group" aria-label="${esc(o.label)}"`}>${parts.join('')}</svg>`;
}

// The side view: the rim of the disk as a strip, folded. Each wedge is a
// layer, yellow or green by the side facing up; each crease is a bend
// joining two layers. frame(t) draws the strip part way: at t = 0 flat in a
// row (the seam, ray 1, joins its two ends underneath), at t = 1 folded.
const VIEW_W = 300, GAP = 14;
export function stackFrame(angles, h, t, opts = {}) {
  const img = image(angles), n = img.n, W = opts.width || VIEW_W, H = opts.height || stackHeight(n);
  const theta = [...rayAngles(angles), 360];
  const xs = theta.map((th, k) => (1 - t) * th + t * img.phi[k]);
  const lo = Math.min(...xs), hi = Math.max(...xs), pad = 22, sx = (W - 2 * pad) / Math.max(hi - lo, 1);
  const X = x => f1(pad + (x - lo) * sx), gap = GAP, base = H - 14, Y = k => f1(base - t * h[k] * gap);
  const out = [];
  // Bends at one place on one side nest: the widest bulges furthest.
  const bulge = new Map();
  if (t > 0) {
    const groups = new Map();
    for (let k = img.closes ? 0 : 1; k < n; k++) {
      const i = (k + n - 1) % n, key = `${img.phi[k]}:${img.s[k]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([k, Math.abs(h[i] - h[k])]);
    }
    for (const list of groups.values()) list.sort((x, y) => x[1] - y[1]).forEach(([k], r) => bulge.set(k, 5 + 4 * r));
  }
  for (let k = 0; k < n; k++) {
    const x1 = X(xs[k]), x2 = X(xs[k + 1]), y = Y(k), face = img.s[k] === 1 || t < 0.5 ? 'front' : 'back';
    out.push(`<rect class="cr-layer ${face}" x="${f1(Math.min(x1, x2) - 0.5)}" y="${f1(y - 3.5)}" width="${f1(Math.abs(x2 - x1) + 1)}" height="7" rx="3"/>`);
  }
  const bad = opts.bad || new Set();
  for (let k = 1; k < n; k++) {
    const x = X(xs[k]), y1 = Y(k - 1), y2 = Y(k), d = -img.s[k] * (bulge.get(k) || 5) * t;
    out.push(`<path class="cr-bend${bad.has(k) ? ' bad' : ''}" d="M${x} ${y1}C${f1(x + d)} ${y1} ${f1(x + d)} ${y2} ${x} ${y2}"/>`);
  }
  // The seam: ray 1, joining the last layer's end to the first layer's start.
  const xr = X(xs[n]), yr = Y(n - 1), xl = X(xs[0]), yl = Y(0), w = (bulge.get(0) || 5) * t, drop = (1 - t) * 26;
  if (t < 1 || img.closes) {
    const c1 = [f1(xr + (1 - t) * 16 - w), f1(yr + drop)], c2 = [f1(xl - (1 - t) * 16 - w), f1(yl + drop)];
    out.push(`<path class="cr-bend seam${t < 1 ? ' moving' : ''}${bad.has(0) ? ' bad' : ''}" d="M${xr} ${yr}C${c1.join(' ')} ${c2.join(' ')} ${xl} ${yl}"/>`);
  } else {
    // It doesn't close: the two edges of ray 1 that should meet.
    out.push(`<path class="cr-seam-miss" d="M${xr} ${yr}L${xl} ${yl}"/><circle class="cr-end" cx="${xr}" cy="${yr}" r="3.5"/><circle class="cr-end" cx="${xl}" cy="${yl}" r="3.5"/>`);
  }
  if (t === 1 && opts.marks) for (const m of opts.marks) out.push(`<g class="cr-x" transform="translate(${X(m.x)} ${f1(base - m.y * gap)})"><path d="M-5 -5L5 5M5 -5L-5 5"/></g>`);
  return out.join('');
}
export const stackHeight = n => 30 + GAP * Math.max(n - 1, 1);
// Where each problem of an attempt is drawn, and which rays it involves.
export function problemMarks(angles, result) {
  const img = image(angles), n = img.n, rays = new Set(), marks = [], bad = new Set();
  const h = result.h, span = k => { const i = (k + n - 1) % n; return [Math.min(h[i], h[k]), Math.max(h[i], h[k])]; };
  for (const pr of result.problems) {
    if (pr.kind === 'turn') { bad.add(pr.k); rays.add(pr.k); }
    if (pr.kind === 'through') { marks.push({x: img.phi[pr.k], y: h[pr.m]}); rays.add(pr.k); }
    if (pr.kind === 'cross') {
      const [a1, a2] = span(pr.k), [b1, b2] = span(pr.l), lo = Math.max(a1, b1), hi = Math.min(a2, b2);
      marks.push({x: img.phi[pr.k], y: (lo + hi) / 2}); rays.add(pr.k); rays.add(pr.l);
    }
  }
  if (result.kind === 'gap' || result.kind === 'clash') bad.add(0);
  return {rays, marks, bad};
}
function stackSvg(angles, result, opts = {}) {
  const n = angles.length, H = stackHeight(n), W = opts.width || VIEW_W, {marks, bad} = problemMarks(angles, result);
  const final = stackFrame(angles, result.h, 1, {marks, bad, width: W, height: H});
  const said = {flat: 'Folded flat.', jam: 'It jams: a crease would pass through the paper.', gap: 'The edges of ray 1 don’t meet.', clash: 'The two wedges at ray 1 face the same way.'}[result.kind];
  return `<svg class="cr-stack ${result.kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(said)}"${opts.anim ? ` data-cr-anim="${esc(opts.anim)}" data-cr-angles="${angles.join(',')}" data-cr-h="${result.h.join(',')}" data-cr-w="${W}"` : ''}><g class="cr-final">${final}</g><g class="cr-anim"></g></svg>`;
}
// The certificate for an even disk: its yellow wedges and its green wedges,
// each laid edge to edge from a straight edge, against the half-turn they
// would have to fill.
function fansSvg(angles) {
  const fan = (list, cx, cls) => {
    const cy = 82, r = 62, out = [`<path class="cr-half" d="M${cx - r - 6} ${cy}H${cx + r + 6}"/><path class="cr-half arc" d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`];
    let at = 0;
    const p = (deg, rr) => [f1(cx + rr * Math.sin((deg + 270) * Math.PI / 180)), f1(cy - rr * Math.cos((deg + 270) * Math.PI / 180))];
    for (const a of list) {
      const [x1, y1] = p(at, r), [x2, y2] = p(at + a, r);
      out.push(`<path class="cr-fan ${cls}" d="M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${x2} ${y2}Z"/>`);
      at += a;
    }
    if (at < 180) { const [x1, y1] = p(at, r), [x2, y2] = p(180, r); out.push(`<path class="cr-short" d="M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}Z"/>`); }
    if (at > 180) { const [x1, y1] = p(180, r), [x2, y2] = p(at, r); out.push(`<path class="cr-over" d="M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${at - 180 > 180 ? 1 : 0} 1 ${x2} ${y2}Z"/>`); }
    return out.join('');
  };
  const [o, e] = alternating(angles);
  const sumText = (x, v) => `<text class="cr-fan-sum" x="${x - 34}" y="106">${v}°</text>`;
  return `<svg class="cr-fans" viewBox="0 0 300 150" role="img" aria-label="${esc(`The yellow wedges make ${o}° and the green wedges ${e}°; each would have to make a half-turn, 180°.`)}">${fan(angles.filter((_, k) => k % 2 === 0), 76, 'front')}${fan(angles.filter((_, k) => k % 2 === 1), 224, 'back')}${sumText(76, o)}${sumText(224, e)}</svg>`;
}

// View state: the knob while it is dragged, and the playground knob's tick
// while it is moved by keys.
let knobDrag = null, playCursor = null, held = false;
const freeFor = (p, b) => (modeOf(p) === 'ray' ? at => freeTick(p.parameters, at) : at => tick(at) && !b.rays.includes(at) && b.rays.length < MAX_RAYS);
function moveKnob(knob, at, text) {
  const [x, y] = pt(at, KNOB_R);
  knob.setAttribute('transform', `translate(${x} ${y})`);
  knob.classList.remove('parked');
  knob.querySelector('path')?.remove();
  knob.setAttribute('aria-valuenow', String(at));
  knob.setAttribute('aria-valuetext', text);
}
const animated = new Set();
const hinted = (shown, action) => Boolean(shown && same(shown, action));
// focus: where focus goes after the press. Can't and Check send it to the
// board (the first wedge or disk), so it never rests on Can't; a key with no
// element falls back to the family's focus selector (a chip or the knob).
const toolButton = (label, action, enabled, shownAction, cls, pressed, focus = cls) => `<button type="button" class="${cls === 'cr-fold' ? 'primary' : 'secondary'} cr-tool ${cls}${hinted(shownAction, action) ? ' hinted' : ''}" ${moveAttrs(action, focus)}${cls === 'cr-cant' ? ' data-toggle="cr-cant"' : ''}${pressed === undefined ? '' : ` aria-pressed="${pressed}"`} ${enabled ? '' : 'disabled'}>${label}</button>`;
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const note = text => (text ? `<p class="cr-told">${esc(text)}</p>` : '');
const labelsWords = labels => labels.map((l, k) => `ray ${k + 1} ${l ? LETTER[l] : 'open'}`).join(', ');
const clashWords = paint => `The wedges on both sides of ray ${clashes(paint)[0] + 1} face the same way.`;
const resultWords = r => ({flat: 'It folds flat.', jam: 'It jams.', gap: 'The edges of ray 1 don’t meet.', clash: 'Two wedges side by side face the same way.'}[r.kind]);

function renderFold(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), n = q.angles.length, dirs = rayAngles(q.angles);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const painting = b.paint !== null && !done;
  const w = wordOf(b.labels), result = b.done === 'fold' ? foldResult(q.angles, w) : b.tried && b.tried === w && !painting && b.done === null ? foldResult(q.angles, b.tried) : null;
  const jam = result && result.kind !== 'flat' ? problemMarks(q.angles, result).rays : new Set();
  const disk = diskSvg({
    dirs, labels: b.labels, fixed: q.fixed.map(Boolean), focus: 'cr', label: 'Disk', degrees: true,
    paint: b.paint && (painting || b.done === 'cant') ? b.paint : null,
    chip: k => (done || painting || q.fixed[k] ? null : {action: {type: 'label', ray: k, to: nextLabel(b.labels[k])}, say: `Make it a ${LETTER[nextLabel(b.labels[k])]}`}),
    sector: k => (painting && b.told !== 'way' ? {type: 'paint', sector: k, to: b.paint[k] === 'F' ? 'B' : 'F'} : null),
    marks: {jam, hinted: shown?.type === 'label' ? shown.ray : undefined, hintedSector: shown?.type === 'paint' ? shown.sector : undefined, clash: b.done === 'cant' && n % 2 ? clashes(b.paint)[0] : undefined},
    hit: done || painting ? '' : 'fold'
  });
  let panel = '';
  if (b.done === 'cant' && n % 2 === 0) panel = fansSvg(q.angles);
  else if (result) panel = stackSvg(q.angles, result, {anim: `${p.id}:${a.moves}:${result.kind === 'flat' ? w : b.tried}`});
  const tools = done ? '' : `<div class="cr-tools">${painting ? '' : toolButton('Fold', {type: 'fold'}, full(b.labels) && w !== b.tried, shown, 'cr-fold')}${toolButton('Can’t', {type: 'cant'}, painting || (b.tried !== null && b.told !== 'way'), shown, 'cr-cant', painting, painting ? 'cr-fold' : 'cr-w0')}${painting ? toolButton('Check', {type: 'check'}, !b.paint.includes('.') && b.told !== 'way', shown, 'cr-check', undefined, 'cr-w0') : ''}</div>`;
  const told = b.told === 'way' ? 'There is a way.' : b.told === 'match' ? 'Not that colouring.' : '';
  const say = done ? (b.done === 'fold' ? 'It folds flat.' : n % 2 ? clashWords(b.paint) : fansSvg(q.angles).match(/aria-label="([^"]*)"/)[1]) : `${labelsWords(b.labels)}.${result ? ` ${resultWords(result)}` : ''}${painting ? ` Colouring: ${[...b.paint].map((c, k) => `wedge ${k + 1} ${colourName(c)}`).join(', ')}.` : ''}`;
  return `<div class="cr-puzzle cr-fold-mode${done ? ' solved' : ''}${painting ? ' painting' : ''}" data-mechanic-wire="creases"><div class="cr-stage"><div class="cr-disk-wrap">${disk}</div>${panel ? `<div class="cr-panel">${panel}</div>` : ''}</div>${tools}${note(told)}${status(say)}</div>`;
}

function renderTabs(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), picking = b.pick !== null && !done;
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const key = tabsKey(b.at), failed = b.tried && b.tried === key && !picking && b.done === null;
  const proof = b.done === 'cant';
  const disks = q.disks.map((d, i) => {
    const result = b.done === 'fold' || failed ? foldResult(d.angles, wordOf(b.at[i])) : null;
    const jam = result && result.kind !== 'flat' ? problemMarks(d.angles, result).rays : new Set();
    const mark = picking ? b.pick[i] : null;
    const svg = diskSvg({
      dirs: rayAngles(d.angles), labels: b.at[i], fixed: d.fixed.map(Boolean), focus: `cr-d${i}`, label: `Disk ${LETTERS[i]}${result ? `, ${result.kind === 'flat' ? 'folds' : 'jams'}` : ''}`, small: true, letter: LETTERS[i], hidden: picking, ok: result?.kind === 'flat',
      rayName: k => { const n = sideName(d, k); return n[4].toUpperCase() + n.slice(5); },
      chip: k => {
        if (done || picking || d.fixed[k]) return null;
        const to = nextTab(q, b.at, i, k);
        if (to === b.at[i][k]) return null;
        return {action: {type: 'tab', disk: i, ray: k, to}, say: to ? `Put ${to === 'M' ? 'an M' : 'a V'} tab here` : 'Take the tab off'};
      },
      marks: {jam, hinted: shown?.type === 'tab' && shown.disk === i ? shown.ray : undefined},
      hit: done || picking ? '' : `tabs:${i}`
    });
    const takes = proof ? `<span class="cr-takes" role="img" aria-label="${esc(`Disk ${LETTERS[i]} takes ${markWords(d, b.pick[i])}`)}">${tabPicture(blanks(d).length, needs(d))}</span>` : '';
    const stack = result ? stackSvg(d.angles, result, {anim: `${p.id}:${a.moves}:${i}:${wordOf(b.at[i])}`, width: 200}) : '';
    // While Can't is on, a tap on a disk marks the tabs it can take.
    if (picking) return `<button type="button" class="cr-tab-disk cr-disk-pick${mark ? ' marked' : ''}${shown?.type === 'pick' && shown.disk === i ? ' hinted' : ''}" ${moveAttrs({type: 'pick', disk: i}, `cr-pick-${i}`)} aria-label="${esc(`Disk ${LETTERS[i]}, ${mark ? `takes ${markWords(d, mark)}` : 'not marked'}`)}">${svg}<span class="cr-takes${mark ? '' : ' empty'}" aria-hidden="true">${mark ? tabPicture(blanks(d).length, markCounts(d, mark)) : '<span><i></i><i></i></span>'}</span></button>`;
    return `<figure class="cr-tab-disk">${svg}${takes}${stack}</figure>`;
  }).join('');
  const tabs = ['M', 'V'].flatMap(l => Array.from({length: q.stock[l]}, (_, k) => `<i class="cr-tab ${l.toLowerCase()}${k < usedTabs(q, b.at, l) ? ' used' : ''}">${l}</i>`)).join('');
  const stock = `<div class="cr-stock" role="img" aria-label="${esc(`Tabs left: ${q.stock.M - usedTabs(q, b.at, 'M')} M, ${q.stock.V - usedTabs(q, b.at, 'V')} V`)}">${tabs}</div>`;
  const total = proof ? `<p class="cr-sum">${esc(tabsTotal(q))}</p>` : '';
  const tools = done ? '' : `<div class="cr-tools">${picking ? '' : toolButton('Fold', {type: 'fold'}, allPlaced(q, b.at) && key !== b.tried, shown, 'cr-fold')}${toolButton('Can’t', {type: 'cant'}, picking || (b.tried !== null && b.told !== 'way'), shown, 'cr-cant', picking, picking ? 'cr-fold' : 'cr-pick-0')}${picking ? toolButton('Check', {type: 'check'}, b.told !== 'way' && !b.pick.includes(null), shown, 'cr-check', undefined, 'cr-pick-0') : ''}</div>`;
  const told = b.told === 'way' ? 'There is a way.' : b.told === 'pick' ? 'Not those tabs.' : '';
  const say = done ? (b.done === 'fold' ? 'Every disk folds flat.' : tabsReason(q)) : `${q.disks.map((_, i) => `Disk ${LETTERS[i]}: ${labelsWords(b.at[i])}`).join('. ')}.${failed ? ` ${q.disks.map((d, i) => `Disk ${LETTERS[i]} ${foldResult(d.angles, wordOf(b.at[i])).kind === 'flat' ? 'folds' : 'jams'}`).join(', ')}.` : ''}${picking ? ` ${q.disks.map((d, i) => `Disk ${LETTERS[i]} ${b.pick[i] ? `takes ${markWords(d, b.pick[i])}` : 'not marked'}`).join(', ')}.` : ''}`;
  return `<div class="cr-puzzle cr-tabs-mode cr-n${q.disks.length}${done ? ' solved' : ''}${picking ? ' picking' : ''}" data-mechanic-wire="creases">${stock}<div class="cr-disks">${disks}</div>${total}${tools}${note(told)}${status(say)}</div>`;
}

function knobSvg(at, hintedKnob, label, name = 'New ray') {
  const parked = at === null, [x, y] = parked ? [118, 118] : pt(at, KNOB_R);
  return `<g class="cr-knob${parked ? ' parked' : ''}${hintedKnob ? ' hinted' : ''}" transform="translate(${x} ${y})" role="slider" tabindex="0" data-focus="cr-knob" aria-label="${esc(name)}" aria-valuetext="${esc(label)}" aria-valuemin="0" aria-valuemax="345" aria-valuenow="${parked ? 0 : at}"><circle class="cr-knob-hit" r="21"/><circle r="11"/>${parked ? '<path d="M-5 0H5M0 -5V5"/>' : ''}</g>`;
}
function renderRay(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), g = q.rays.length;
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const order = b.at === null ? q.rays.map((_, k) => k) : rayOrder(q, b.at);
  const dirs = order.map(k => (k < g ? q.rays[k] : b.at)), labels = order.map(k => b.labels[k]);
  const key = b.at === null ? null : rayKey(q, b), angles = b.at === null ? null : rayAngles2(q, b.at);
  const result = done ? foldResult(angles, rayWord(q, b)) : b.tried && b.tried === key ? foldResult(angles, rayWord(q, b)) : null;
  const jam = result && result.kind !== 'flat' ? new Set([...problemMarks(angles, result).rays]) : new Set();
  const where = at => { if (at === null) return 'Not placed'; const before = q.rays.filter(r => r < at).length - 1; return `Between ray ${before + 1} and ray ${(before + 1) % g + 1}, ${tickWords((at - q.rays[before]) / STEP)} after ray ${before + 1}`; };
  const disk = diskSvg({
    dirs, labels, fixed: order.map(k => k < g && Boolean(q.fixed[k])), focus: 'cr', label: 'Disk', degrees: true,
    isNew: pos => order[pos] === g, number: pos => order[pos] + 1,
    chip: pos => { const k = order[pos]; return done || (k < g && q.fixed[k]) ? null : {action: {type: 'label', ray: k, to: nextLabel(b.labels[k])}, say: `Make it a ${LETTER[nextLabel(b.labels[k])]}`}; },
    marks: {jam, hinted: shown?.type === 'label' ? order.indexOf(shown.ray) : undefined, ghost: shown?.type === 'place' ? shown.at : undefined},
    knob: done ? '' : knobSvg(knobDrag?.id === p.id ? knobDrag.at : b.at, shown?.type === 'place', where(b.at)),
    hit: done ? '' : 'ray'
  });
  const panel = result ? `<div class="cr-panel">${stackSvg(angles, result, {anim: `${p.id}:${a.moves}:${key}`})}</div>` : '';
  const tools = done ? '' : `<div class="cr-tools">${toolButton('Fold', {type: 'fold'}, b.at !== null && full(b.labels) && key !== b.tried, shown, 'cr-fold')}</div>`;
  const say = `${done ? 'It folds flat. ' : ''}New ray: ${where(b.at).toLowerCase()}. ${labels.map((l, pos) => `${order[pos] === g ? 'new ray' : `ray ${order[pos] + 1}`} ${l ? LETTER[l] : 'open'}`).join(', ')}.${result && !done ? ` ${resultWords(result)}` : ''}`;
  return `<div class="cr-puzzle cr-ray-mode${done ? ' solved' : ''}" data-mechanic-wire="creases"><div class="cr-stage"><div class="cr-disk-wrap">${disk}</div>${panel}</div>${tools}${status(say)}</div>`;
}

function renderPlay(p, a) {
  const b = a.board, angles = playAngles(b), key = playKey(b);
  const result = b.folded && b.folded === key ? foldResult(angles, wordOf(b.labels)) : null;
  const jam = result && result.kind !== 'flat' ? problemMarks(angles, result).rays : new Set();
  const disk = diskSvg({
    dirs: b.rays, labels: b.labels, fixed: b.rays.map(() => false), focus: 'cr', label: 'Disk', degrees: true,
    chip: k => ({action: {type: 'label', at: b.rays[k], to: nextLabel(b.labels[k])}, say: `Make it a ${LETTER[nextLabel(b.labels[k])]}. Delete removes the ray`}),
    marks: {jam}, hit: 'play',
    // A knob for adding a ray from the keyboard (or by dragging it in).
    knob: b.rays.length < MAX_RAYS ? knobSvg(null, false, 'Not placed', 'Add a ray') : ''
  });
  const panel = result ? `<div class="cr-panel">${stackSvg(angles, result, {anim: `${p.id}:${a.moves}:${key}`})}</div>` : '';
  const tools = `<div class="cr-tools">${toolButton('Fold', {type: 'fold'}, b.rays.length > 0 && full(b.labels) && key !== b.folded, null, 'cr-fold')}${toolButton('Clear', {type: 'clear'}, b.rays.length > 0, null, 'cr-clear')}</div>`;
  const say = `${b.rays.length} ${b.rays.length === 1 ? 'ray' : 'rays'}. ${labelsWords(b.labels)}.${result ? ` ${resultWords(result)}` : ''}`;
  return `<div class="cr-puzzle cr-play-mode" data-mechanic-wire="creases"><div class="cr-stage"><div class="cr-disk-wrap">${disk}</div>${panel}</div>${tools}${status(say)}</div>`;
}
const render = (p, a) => ({fold: renderFold, tabs: renderTabs, ray: renderRay, playground: renderPlay}[modeOf(p)](p, a));

// --- Taps, drags, keys and the fold animation -------------------------------------------------------
const angDist = (x, y) => { const d = Math.abs(((x - y) % 360 + 360) % 360); return Math.min(d, 360 - d); };
// What a tap at radius r and direction deg (degrees clockwise from the top)
// on a disk does: the nearest ray when the tap is close to one, otherwise,
// where a ray can be added or moved, the nearest free tick. The new ray of a
// ray puzzle moves only from the rim band (and the knob and keys): once it
// is placed, a tap inside the disk letters the nearest ray, as in a fold.
export const RIM_BAND = RIM_BAND_R;
export function tapAction(p, b, hit, r, deg) {
  const q = p.parameters, near = (dirs, limit) => {
    let best = -1, bd = limit;
    dirs.forEach((d, k) => { const x = angDist(d, deg); if (x <= bd) { best = k; bd = x; } });
    return best;
  };
  if (r < R * 0.18 || r > R + 12) return null;
  if (hit === 'fold') {
    const k = near(rayAngles(q.angles), 20);
    return k >= 0 && !q.fixed[k] ? {type: 'label', ray: k, to: nextLabel(b.labels[k])} : null;
  }
  if (hit.startsWith('tabs:')) {
    const i = Number(hit.slice(5)), d = q.disks[i], k = near(rayAngles(d.angles), 45);
    if (k < 0 || d.fixed[k]) return null;
    const to = nextTab(q, b.at, i, k);
    return to === b.at[i][k] ? null : {type: 'tab', disk: i, ray: k, to};
  }
  const snap = ((Math.round(deg / STEP) * STEP) % 360 + 360) % 360;
  if (hit === 'ray') {
    const g = q.rays.length, order = b.at === null ? q.rays.map((_, k) => k) : rayOrder(q, b.at), rim = r > RIM_BAND;
    const pos = near(order.map(k => (k < g ? q.rays[k] : b.at)), rim ? 7.5 : 20);
    if (pos >= 0) { const k = order[pos]; return k < g && q.fixed[k] ? null : {type: 'label', ray: k, to: nextLabel(b.labels[k])}; }
    return (rim || b.at === null) && freeTick(q, snap) && snap !== b.at ? {type: 'place', at: snap} : null;
  }
  if (hit === 'play') {
    const k = near(b.rays, 7.5);
    if (k >= 0) return {type: 'label', at: b.rays[k], to: nextLabel(b.labels[k])};
    return b.rays.length < MAX_RAYS && !b.rays.includes(snap) ? {type: 'add', at: snap} : null;
  }
  return null;
}
// Pressing and holding a ray in the playground takes it away.
export function holdAction(p, b, r, deg) {
  if (modeOf(p) !== 'playground' || r < R * 0.18 || r > R + 12) return null;
  const k = b.rays.findIndex(d => angDist(d, deg) <= 7.5 && b.rays.every(e => angDist(e, deg) >= angDist(d, deg)));
  return k >= 0 ? {type: 'remove', at: b.rays[k]} : null;
}
export const HOLD_MS = 550;
// The next free tick clockwise (or anticlockwise) from a tick, or from the
// top when there is none.
function stepTick(free, from, dir) {
  let at = from === null ? (dir > 0 ? 345 : 15) : from;
  for (let i = 0; i < 360 / STEP; i++) { at = (at + dir * STEP + 360) % 360; if (free(at)) return at === from ? null : at; }
  return null;
}
export const knobTap = (p, b) => { if (modeOf(p) !== 'ray') return null; const at = stepTick(freeFor(p, b), b.at, 1); return at === null ? null : {type: 'place', at}; };
const local = (svg, e) => {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const pnt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return {r: Math.hypot(pnt.x, pnt.y), deg: ((Math.atan2(pnt.x, -pnt.y) * 180 / Math.PI) + 360) % 360};
};
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Fold the strip in a panel once, the first time it is drawn.
function animate(svg) {
  const key = svg.dataset.crAnim;
  if (!key || animated.has(key)) return;
  animated.add(key);
  if (reduced()) return;
  const angles = svg.dataset.crAngles.split(',').map(Number), h = svg.dataset.crH.split(',').map(Number), W = Number(svg.dataset.crW);
  const final = svg.querySelector('.cr-final'), layer = svg.querySelector('.cr-anim'), H = stackHeight(angles.length), start = performance.now(), dur = 1100;
  final.style.display = 'none';
  const frame = now => {
    if (!svg.isConnected) return;
    const u = Math.min(1, (now - start) / dur), t = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    if (u < 1) { layer.innerHTML = stackFrame(angles, h, t, {width: W, height: H}); requestAnimationFrame(frame); }
    else { layer.innerHTML = ''; final.style.display = ''; }
  };
  requestAnimationFrame(frame);
}
function wire(root, p, api) {
  root.querySelectorAll('svg.cr-stack[data-cr-anim]').forEach(animate);
  root.querySelectorAll('[data-cr-hit]').forEach(hitArea => {
    const svg = hitArea.ownerSVGElement;
    hitArea.addEventListener('click', e => {
      if (held) { held = false; return; }
      const at = local(svg, e);
      if (!at) return;
      const action = tapAction(p, api.attempt().board, hitArea.dataset.crHit, at.r, at.deg);
      if (action) api.apply(action);
    });
    if (hitArea.dataset.crHit !== 'play') return;
    // Press and hold a ray to take it away; moving or lifting first cancels.
    // The whole disk listens, since a ray's chip reaches over the ray; the
    // tap that ends a hold does nothing more.
    let timer = null, start = null;
    const cancel = () => { clearTimeout(timer); timer = null; };
    svg.addEventListener('click', e => { if (held && e.target.closest?.('.cr-chip')) { held = false; e.stopPropagation(); e.preventDefault(); } }, true);
    svg.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      held = false;
      const at = local(svg, e), action = at && holdAction(p, api.attempt().board, at.r, at.deg);
      if (!action) return;
      start = [e.clientX, e.clientY];
      timer = setTimeout(() => { timer = null; held = true; api.apply(action); }, HOLD_MS);
    });
    svg.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) cancel(); });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) svg.addEventListener(type, cancel);
    svg.addEventListener('contextmenu', e => e.preventDefault());
  });
  // SVG buttons answer Enter and Space as buttons do; Delete removes a ray in
  // the playground.
  root.addEventListener('keydown', e => {
    const el = e.target.closest?.('[role="button"][data-move]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.dispatchEvent(new MouseEvent('click', {bubbles: true})); return; }
    if (el && (e.key === 'Delete' || e.key === 'Backspace') && modeOf(p) === 'playground') {
      const at = JSON.parse(el.dataset.move).at;
      if (int(at)) { e.preventDefault(); api.apply({type: 'remove', at}); }
      return;
    }
    const knobEl = e.target.closest?.('.cr-knob');
    if (knobEl && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const b = api.attempt().board, dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const from = modeOf(p) === 'ray' ? b.at : playCursor?.id === p.id ? playCursor.at : null, at = stepTick(freeFor(p, b), from, dir);
      if (at === null) return;
      if (modeOf(p) === 'ray') api.apply({type: 'place', at});
      else { playCursor = {id: p.id, at}; moveKnob(knobEl, at, `At ${at}°. Enter adds a ray here`); }
      return;
    }
    if (knobEl && (e.key === 'Enter' || e.key === ' ') && modeOf(p) === 'playground' && playCursor?.id === p.id) {
      e.preventDefault();
      const at = playCursor.at;
      playCursor = null;
      if (freeFor(p, api.attempt().board)(at)) api.apply({type: 'add', at});
    }
  });
  // The knob slides round the rim, stopping at free ticks: the new ray in
  // the ray puzzles, a ray to add in the playground.
  const knob = root.querySelector('.cr-knob');
  if (!knob) return;
  const svg = knob.ownerSVGElement;
  if (modeOf(p) === 'playground' && playCursor?.id === p.id && freeFor(p, api.attempt().board)(playCursor.at)) moveKnob(knob, playCursor.at, `At ${playCursor.at}°. Enter adds a ray here`);
  // A touch that starts on the knob drags it rather than scrolling the page.
  knob.addEventListener('touchstart', e => e.preventDefault(), {passive: false});
  knob.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    knob.setPointerCapture?.(e.pointerId);
    knobDrag = {id: p.id, at: modeOf(p) === 'ray' ? api.attempt().board.at : null, moved: false};
    knob.classList.add('dragging');
  });
  knob.addEventListener('pointermove', e => {
    if (!knobDrag) return;
    const at = local(svg, e);
    if (!at) return;
    const snap = ((Math.round(at.deg / STEP) * STEP) % 360 + 360) % 360;
    if (!freeFor(p, api.attempt().board)(snap) || snap === knobDrag.at) return;
    knobDrag.at = snap; knobDrag.moved = true;
    moveKnob(knob, snap, `At ${snap}°`);
  });
  const end = () => {
    if (!knobDrag) return;
    const {at, moved} = knobDrag;
    knobDrag = null;
    knob.classList.remove('dragging');
    if (!moved) {
      // A tap on the knob steps the new ray to the next free tick.
      const action = knobTap(p, api.attempt().board);
      if (action) api.apply(action);
      return;
    }
    if (modeOf(p) === 'ray' && at !== api.attempt().board.at) api.apply({type: 'place', at});
    if (modeOf(p) === 'playground') { playCursor = null; api.apply({type: 'add', at}); }
  };
  knob.addEventListener('pointerup', end);
  knob.addEventListener('pointercancel', end);
}

// Undo takes back moves, never a refusal: a refused Can't stays while the
// labels (or the tabs) are the same.
function carry(p, from, to) {
  const q = p.parameters;
  if (!object(from) || !object(to) || from.told !== 'way' || to.told === 'way') return to;
  if (q.mode === 'fold' && same(from.labels, to.labels)) return {...to, told: 'way'};
  if (q.mode === 'tabs' && same(from.at, to.at)) return {...to, told: 'way'};
  return to;
}

export const creaseMechanics = {
  creases: {
    fresh, valid, solved, move, hint, render, wire, carry,
    reset: p => { if (knobDrag?.id === p.id) knobDrag = null; if (playCursor?.id === p.id) playCursor = null; },
    noHint: p => modeOf(p) === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'creases',
  family: {id: 'creases', symbol: '⊛'},
  mechanics: creaseMechanics,
  pack: new URL('./creases.json', import.meta.url).href,
  css: new URL('./creases.css', import.meta.url).href,
  focus: '[data-mechanic-wire="creases"] [role="button"][tabindex="0"],[data-mechanic-wire="creases"] .cr-knob,[data-mechanic-wire="creases"] button.cr-disk-pick'
};
