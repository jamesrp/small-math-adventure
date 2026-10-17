// Bounce words (worksheet Week 71, "Can you hear the room?"): the Aims group
// of Mirror Couriers. A shot starts inside a room with lettered walls and
// bounces like light in a mirror; its word is the walls it hits, in order.
// The child aims through mirror copies of the room, where the shot runs
// straight on, and presses Launch (as in Mirror Couriers: aim, then Launch).
// Only a launch folds the shot into bounces and spells its word; corner hits
// are not allowed, and fold.js decides them exactly. Each launch is a move.
//
// Three kinds of puzzle: make a given word (target), make in one rectangle the
// word a shot in the other rectangle makes (remake), and make a word no
// rectangle can make (design). Some target words have Can't: in a rectangle a
// word with A, then B, then A again can't happen, because in the copies both
// A walls lie on one line, which a straight shot crosses once. After a launch
// that gets as far as A, B, the child taps those two walls; the 60° rhombus
// can make ABA at its sharp corner. In design puzzles a refused Check shows a
// square shot with the word, and a right one asks for the two letters that
// show why (or, for A C D B and the like, draws why).
import {esc} from '../../expansion-controls.js';
import {ROOMS, fold, isAim, inRoom, roomAims, apply, compose, ID, rectangleWord, wallOf} from './fold.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPoint = value => Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
const sameEnd = (a, b) => (a === null && b === null) || same(a, b);
const byPlace = (a, b) => a[0] - b[0] || a[1] - b[1];
const R3 = Math.sqrt(3);
const SIDE = {A: 'AC', C: 'AC', B: 'BD', D: 'BD'};
export const MODES = ['target', 'remake', 'design'];
const ROOM_WORD = {square: 'square', wide: 'wide room', rhombus: 'rhombus'};

const memo = new Map();
const remember = (key, make) => {
  if (!memo.has(key)) { if (memo.size > 6000) memo.clear(); memo.set(key, make()); }
  return memo.get(key);
};

// --- Frames ----------------------------------------------------------------
// A rectangle's frame is copies [a, b] across and [c, d] up, the room being
// copy (0, 0). The rhombus's frame is 2s + t in (a, b) and t in (c, d): the
// Euclidean box from a/2 to b/2 across and c·√3/2 to d·√3/2 up.
export const euclid = (room, [x, y]) => (room === 'rhombus' ? [x + y / 2, (y * R3) / 2] : [x, y]);
export function box(room, f) {
  if (room === 'rhombus') return [f[0] / 2, f[1] / 2, (f[2] * R3) / 2, (f[3] * R3) / 2];
  const {W, H} = ROOMS[room];
  return [f[0] * W, (f[1] + 1) * W, f[2] * H, (f[3] + 1) * H];
}
export function inFrame(room, f, [x, y]) {
  if (room === 'rhombus') { const u = 2 * x + y; return u > f[0] && u < f[1] && y > f[2] && y < f[3]; }
  const {W, H} = ROOMS[room];
  return x > f[0] * W && x < (f[1] + 1) * W && y > f[2] * H && y < (f[3] + 1) * H;
}
// Every aim point in a frame, bottom row first.
export const frameAims = (room, f) => remember(`fa|${room}|${f}`, () => {
  const out = [];
  if (room === 'rhombus') {
    for (let t = f[2] + 1; t < f[3]; t++) for (let s = Math.floor((f[0] - t) / 2); s <= Math.ceil((f[1] - t) / 2); s++) if (isAim(room, [s, t]) && inFrame(room, f, [s, t])) out.push([s, t]);
    return out;
  }
  const {W, H} = ROOMS[room];
  for (let y = f[2] * H + 1; y < (f[3] + 1) * H; y++) for (let x = f[0] * W + 1; x < (f[1] + 1) * W; x++) if (isAim(room, [x, y])) out.push([x, y]);
  return out;
});

// --- Shots -----------------------------------------------------------------
export const shot = (room, start, end) => (end === null ? null : remember(`s|${room}|${start}|${end}`, () => fold(room, start, end)));
export const shotOf = (q, b) => shot(q.room, b.start, b.end);
export const legal = r => Boolean(r) && !r.corner && r.inside;
const tried = r => Boolean(r) && r.word.length > 0;
const fourWalls = word => word.length === 4 && new Set(word).size === 4;
// The word of a launched shot that counts (no corner, at least one wall).
const wordOf = r => (legal(r) && tried(r) ? r.word : null);

// Does a word meet the puzzle's goal? Design puzzles want a word no
// rectangle can make (and, with four, each wall once).
export function meets(q, word) {
  if (q.mode === 'design') return word.length > 0 && !rectangleWord(word) && (!q.four || fourWalls(word));
  return word === q.word;
}
const designWhy = (q, word) => (q.four && !fourWalls(word) ? 'four' : 'rect');

// Every solving shot on the puzzle's aim points (for hints and checks).
export const starts = q => (q.movable ? roomAims(q.room) : [q.start]);
export function answers(q) {
  return remember(`a|${JSON.stringify(q)}`, () => {
    const out = [];
    for (const s of starts(q)) for (const e of frameAims(q.room, q.frame)) {
      const r = fold(q.room, s, e);
      if (legal(r) && meets(q, r.word)) out.push({start: s, end: e});
    }
    return out;
  });
}
export const possible = q => answers(q).length > 0;

// --- Walls in the copies ----------------------------------------------------
// A wall of a copy is a segment of the plane with its letter; its id is its
// two ends, in order.
const seamOf = (a, b, letter) => {
  const [p, r] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  return {id: `${p[0]},${p[1]},${r[0]},${r[1]}`, a: p, b: r, letter};
};
const wallSeam = (room, map, letter) => {
  const w = wallOf(room, letter), c = ROOMS[room].corners;
  return seamOf(apply(map, c[w.from]), apply(map, c[w.to]), letter);
};
export const gridSeams = (room, f) => remember(`g|${room}|${f}`, () => {
  const {W, H} = ROOMS[room], out = [];
  for (let k = f[0]; k <= f[1] + 1; k++) for (let j = f[2]; j <= f[3]; j++) out.push(seamOf([k * W, j * H], [k * W, (j + 1) * H], k % 2 === 0 ? 'B' : 'D'));
  for (let j = f[2]; j <= f[3] + 1; j++) for (let k = f[0]; k <= f[1]; k++) out.push(seamOf([k * W, j * H], [(k + 1) * W, j * H], j % 2 === 0 ? 'A' : 'C'));
  return out;
});
export function chainSeams(room, maps) {
  const seen = new Map();
  maps.forEach((m, i) => { for (const w of ROOMS[room].walls) { const s = wallSeam(room, m, w.letter); if (!seen.has(s.id)) seen.set(s.id, {...s, copy: i}); } });
  return [...seen.values()];
}
// The walls a claim can tap: every wall in a rectangle's window, or the walls
// of the copies the launched rhombus shot passes through.
export function seams(q, b) {
  if (q.room !== 'rhombus') return gridSeams(q.room, q.frame);
  const r = shotOf(q, b);
  return chainSeams(q.room, r ? r.copies : [ID]);
}

// The copies a word's route passes through: maps[k] after k letters.
export function routeMaps(room, word) {
  const maps = [ID];
  for (const c of word) maps.push(compose(maps.at(-1), wallOf(room, c).mirror));
  return maps;
}
// A returning pair: letter j repeats letter i with only walls of the other
// direction between (ABA: 0 and 2). In a rectangle its two walls lie on one line.
export function returning(word, i, j) {
  if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j) || i < 0 || j >= word.length || j < i + 2 || word[i] !== word[j]) return false;
  return [...word.slice(i + 1, j)].every(c => SIDE[c] !== SIDE[word[i]]);
}
export function obstruction(word) {
  for (let j = 2; j < word.length; j++) for (let i = j - 2; i >= 0; i--) {
    if (SIDE[word[i]] === SIDE[word[j]]) { if (returning(word, i, j)) return [i, j]; break; }
  }
  return null;
}
// The start of a Can't word up to its returning letter (AB for ABA, CAB for CABA).
export const prefixOf = q => { const ij = obstruction(q.word ?? ''); return ij ? q.word.slice(0, ij[1]) : null; };
// The two walls a Can't claim taps: the X wall the shot crosses and the X
// wall it would need next, on the word's route. In a rectangle they lie on
// one line; in the rhombus they don't.
export function certificate(q) {
  const ij = obstruction(q.word ?? '');
  if (!ij) return null;
  const maps = routeMaps(q.room, q.word), letter = q.word[ij[0]];
  return ij.map(i => wallSeam(q.room, maps[i], letter));
}
const parseSeam = id => { const n = id.split(',').map(Number); return {a: [n[0], n[1]], b: [n[2], n[3]]}; };
export function collinear(s, t) {
  const d = [s.b[0] - s.a[0], s.b[1] - s.a[1]], c = p => d[0] * (p[1] - s.a[1]) - d[1] * (p[0] - s.a[0]);
  return c(t.a) === 0 && c(t.b) === 0;
}
// 'right' for the certificate on one line, 'line' for two walls not on one
// line, 'walls' for two on one line that the word doesn't need.
export function judge(q, pair) {
  const [s, t] = pair.map(parseSeam);
  if (!collinear(s, t)) return 'line';
  const c = certificate(q);
  return c && c.every(w => pair.includes(w.id)) && collinear(c[0], c[1]) ? 'right' : 'walls';
}

// A square shot with a given word: its end lies in the copy the word leads
// to, so search that copy's 25 aim points from the 25 starts, both nearest
// their centres first (a shot clear of the corners). Every rectangle word has
// one (stretching a rectangle into the square keeps its words); the validator
// checks every word a refused Check can show.
export const squareShot = word => remember(`sq|${word}`, () => {
  const h = [...word].filter(c => SIDE[c] === 'BD'), v = [...word].filter(c => SIDE[c] === 'AC');
  const i = h.length ? (h[0] === 'D' ? h.length : -h.length) : 0, j = v.length ? (v[0] === 'C' ? v.length : -v.length) : 0;
  const centred = (list, [cx, cy]) => [...list].sort((a, b) => (a[0] - cx) ** 2 + (a[1] - cy) ** 2 - (b[0] - cx) ** 2 - (b[1] - cy) ** 2 || byPlace(a, b));
  const from = centred(roomAims('square'), [5, 5]), ends = centred(roomAims('square').map(([x, y]) => [x + 10 * i, y + 10 * j]), [10 * i + 5, 10 * j + 5]);
  for (const s of from) for (const e of ends) {
    const r = fold('square', s, e);
    if (legal(r) && r.word === word) return {start: s, end: e};
  }
  return null;
});

// --- Boards ----------------------------------------------------------------
// Every board holds the last launched shot: start and end (end null before
// the first launch). Aiming is not saved; Launch is the move.
// target:        {start, end}
// target, Can't: {start, end, claimed, refused}  claimed: the two wall ids;
//                refused: {walls, why, shown}
// remake:        {start, end}
// design:        {start, end, checked, done, pair, refused}  checked: a right
//                Check; pair: the two letters tapped after it; refused:
//                {word, why, shown} (why rect or four) or {word, why: 'pair',
//                tiles, shown}. A refusal stays while the word is the same;
//                Undo keeps it but hides its words.
const KEYS = q => (q.mode === 'design' ? 'checked,done,end,pair,refused,start' : q.cant ? 'claimed,end,refused,start' : 'end,start');
function fresh(p) {
  const q = p.parameters, b = {start: [...q.start], end: null};
  if (q.mode === 'design') return {...b, checked: false, done: false, pair: null, refused: null};
  if (q.cant) return {...b, claimed: null, refused: null};
  return b;
}
const validFrame = (room, f) => Array.isArray(f) && f.length === 4 && f.every(Number.isSafeInteger) && (room === 'rhombus' ? f[0] < f[1] && f[2] < f[3] : f[0] <= f[1] && f[2] <= f[3]);
const validParams = q => remember(`vp|${JSON.stringify(q)}`, () => {
  if (!object(q) || !MODES.includes(q.mode) || !Object.hasOwn(ROOMS, q.room) || !validFrame(q.room, q.frame)) return false;
  if (!isPoint(q.start) || !isAim(q.room, q.start) || !inRoom(q.room, q.start) || !inFrame(q.room, q.frame, q.start)) return false;
  if (q.mode !== 'design' && !(typeof q.word === 'string' && /^[ABCD]{1,8}$/.test(q.word))) return false;
  if (q.cant && (q.mode !== 'target' || !obstruction(q.word))) return false;
  if (q.mode === 'remake') {
    const g = q.given;
    if (!object(g) || q.room === 'rhombus' || g.room === q.room || !['square', 'wide'].includes(g.room) || !validFrame(g.room, g.frame)) return false;
    if (!isPoint(g.start) || !isPoint(g.end) || !inRoom(g.room, g.start) || !inFrame(g.room, g.frame, g.end)) return false;
    const r = fold(g.room, g.start, g.end);
    if (!legal(r) || r.word !== q.word) return false;
  }
  return true;
});
const startOK = (q, s) => isPoint(s) && isAim(q.room, s) && inRoom(q.room, s) && (q.movable || same(s, q.start));
const endOK = (q, s, e) => e === null || (isPoint(e) && isAim(q.room, e) && inFrame(q.room, q.frame, e) && !same(e, s));
const validPair = (q, b, pair) => Array.isArray(pair) && pair.length === 2 && pair.every(id => typeof id === 'string') && pair[0] < pair[1] && pair.every(id => seams(q, b).some(s => s.id === id));
const validTiles = t => Array.isArray(t) && t.length === 2 && t.every(Number.isSafeInteger) && t[0] >= 0 && t[0] < t[1];
// A launch that gets as far as the Can't word's returning letter (AB for ABA).
const attempted = (q, r) => legal(r) && r.word.startsWith(prefixOf(q));
function valid(p, b) {
  const q = p.parameters;
  if (!validParams(q) || !object(b) || Object.keys(b).sort().join() !== KEYS(q)) return false;
  if (!startOK(q, b.start) || !endOK(q, b.start, b.end)) return false;
  const r = shotOf(q, b), w = wordOf(r);
  if (q.mode === 'design') {
    if (typeof b.checked !== 'boolean' || typeof b.done !== 'boolean') return false;
    if (b.done) return b.checked && b.refused === null && w !== null && meets(q, w) && (q.four ? b.pair === null : validTiles(b.pair) && returning(w, ...b.pair));
    if (b.pair !== null) return false;
    if (b.checked && (q.four || w === null || !meets(q, w))) return false;
    if (b.refused === null) return true;
    const f = b.refused;
    if (!object(f) || typeof f.shown !== 'boolean' || w === null || f.word !== w) return false;
    if (f.why === 'pair') return Object.keys(f).sort().join() === 'shown,tiles,why,word' && b.checked && validTiles(f.tiles) && f.tiles[1] < w.length && !returning(w, ...f.tiles);
    return Object.keys(f).sort().join() === 'shown,why,word' && !b.checked && !meets(q, w) && f.why === designWhy(q, w);
  }
  if (!q.cant) return true;
  if (b.claimed === null && b.refused === null) return true;
  if (b.claimed !== null && b.refused !== null) return false;
  if (!attempted(q, r)) return false;
  if (b.claimed !== null) return validPair(q, b, b.claimed) && judge(q, b.claimed) === 'right';
  const f = b.refused;
  return object(f) && Object.keys(f).sort().join() === 'shown,walls,why' && typeof f.shown === 'boolean' && validPair(q, b, f.walls) && f.why !== 'right' && judge(q, f.walls) === f.why;
}
function solved(p, b) {
  if (!valid(p, b)) return false;
  const q = p.parameters;
  if (q.mode === 'design') return b.done;
  if (q.cant && b.claimed !== null) return true;
  const r = shotOf(q, b);
  return legal(r) && meets(q, r.word);
}
// Claims and checks can be made once per launch (Check: once per word).
const canClaim = (q, b) => Boolean(q.cant) && b.claimed === null && b.refused === null && attempted(q, shotOf(q, b)) && !meets(q, shotOf(q, b).word);
const canCheck = (q, b) => q.mode === 'design' && !b.done && !b.checked && b.refused === null && wordOf(shotOf(q, b)) !== null;
const canPair = (q, b) => q.mode === 'design' && !q.four && b.checked && !b.done && b.refused === null;

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (action.type === 'launch') {
    const s = action.start, e = action.end;
    if (!startOK(q, s) || !isPoint(e) || !endOK(q, s, e) || (same(s, b.start) && same(e, b.end))) return null;
    const next = {...b, start: [...s], end: [...e]};
    if (q.cant) return {...next, refused: null};
    if (q.mode !== 'design') return next;
    // A Check, a refusal or a lock stays while the word is the same.
    const before = wordOf(shotOf(q, b));
    return before !== null && before === wordOf(shotOf(q, next)) ? next : {...next, checked: false, refused: null};
  }
  if (action.type === 'claim') {
    if (!canClaim(q, b)) return null;
    const pair = Array.isArray(action.walls) ? [...action.walls].sort() : null;
    if (!validPair(q, b, pair)) return null;
    const verdict = judge(q, pair);
    return verdict === 'right' ? {...b, claimed: pair} : {...b, refused: {walls: pair, why: verdict, shown: true}};
  }
  if (action.type === 'check') {
    if (!canCheck(q, b)) return null;
    const word = shotOf(q, b).word;
    if (!meets(q, word)) return {...b, refused: {word, why: designWhy(q, word), shown: true}};
    return q.four ? {...b, checked: true, done: true} : {...b, checked: true};
  }
  if (action.type === 'pair') {
    if (!canPair(q, b) || !validTiles(action.tiles)) return null;
    const word = shotOf(q, b).word, tiles = [...action.tiles];
    if (tiles[1] >= word.length) return null;
    return returning(word, ...tiles) ? {...b, done: true, pair: tiles} : {...b, refused: {word, why: 'pair', tiles, shown: true}};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
const spell = word => [...word].join(', then ');
const gap = (room, a, b) => { const [x, y] = euclid(room, a), [u, v] = euclid(room, b); return (x - u) ** 2 + (y - v) ** 2; };
const nearest = (room, list, to) => [...list].sort((a, b) => gap(room, a, to) - gap(room, b, to) || byPlace(a, b))[0];
// A launch toward one of the shots in `list`: from the child's start if it can
// work, else from the nearest start that can.
function toward(q, b, list) {
  let here = list.filter(w => same(w.start, b.start));
  if (!here.length) { const s = nearest(q.room, [...new Map(list.map(w => [String(w.start), w.start])).values()], b.start); here = list.filter(w => same(w.start, s)); }
  const s = here[0].start, e = nearest(q.room, here.map(w => w.end), b.end ?? s);
  return {type: 'launch', start: [...s], end: [...e]};
}
const where = (b, action) => (same(action.start, b.start) ? 'launch at the outlined spot' : 'move the start and launch at the outlined spots');
// Shots whose word starts the way the Can't word starts, up to its returning letter.
function attempts(q) {
  return remember(`at|${JSON.stringify(q)}`, () => {
    const out = [], pre = prefixOf(q);
    for (const s of starts(q)) for (const e of frameAims(q.room, q.frame)) { const r = fold(q.room, s, e); if (attempted(q, r) && !meets(q, r.word)) out.push({start: s, end: e}); }
    return out.filter(w => fold(q.room, w.start, w.end).word === pre).length ? out.filter(w => fold(q.room, w.start, w.end).word === pre) : out;
  });
}
// The given shot, stretched (or squeezed) into the play room.
const mapGiven = (q, [x, y]) => [(x * ROOMS[q.room].W) / ROOMS[q.given.room].W, y];
function computeHint(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart to clear the board.'};
  if (solved(p, b)) return {type: 'done'};
  const r = shotOf(q, b), corner = r?.corner ? 'That shot hits a corner. ' : '';
  if (q.cant) {
    // Both Can't twins first lead to a launch with the word's start.
    const pre = prefixOf(q), [i, j] = obstruction(q.word), letter = q.word[i];
    if (!possible(q) && canClaim(q, b)) {
      return {type: 'move', action: {type: 'claim', walls: certificate(q).map(s => s.id).sort()},
        text: `The ${letter} wall a shot crosses and the ${letter} wall it needs after ${spell(q.word.slice(i + 1, j))} lie on one line, and a straight shot crosses a line only once. So ${q.word} can’t happen: press Can’t and tap those two walls.`};
    }
    if (possible(q) && attempted(q, r)) { const action = toward(q, b, answers(q)); return {type: 'move', action, text: `${corner}Cross ${spell(q.word)}: ${where(b, action)}.`}; }
    const list = attempts(q).filter(w => !(same(w.start, b.start) && same(w.end, b.end)));
    const action = toward(q, b, list);
    return {type: 'move', action, text: `${corner}Try ${spell(pre)}: ${where(b, action)}.`};
  }
  if (q.mode === 'design') {
    const w = wordOf(r);
    if (canCheck(q, b) && meets(q, w)) return {type: 'move', action: {type: 'check'}, text: `No rectangle can make ${w}. Press Check.`};
    if (canPair(q, b)) {
      const [i, j] = obstruction(w);
      return {type: 'move', action: {type: 'pair', tiles: [i, j]}, text: `In a rectangle the two ${w[i]} walls of ${w.slice(i, j + 1)} would lie on one line. Tap those two letters.`};
    }
    const list = answers(q).filter(x => fold(q.room, x.start, x.end).word !== w), action = toward(q, b, list);
    return {type: 'move', action, text: `${corner}Try ${spell(fold(q.room, action.start, action.end).word)}: ${where(b, action)}.`};
  }
  if (q.mode === 'remake') {
    const action = {type: 'launch', start: [...q.start], end: mapGiven(q, q.given.end)};
    return {type: 'move', action, text: `${corner}Launch at the same spot in the same copy as the shot above: the outlined spot.`};
  }
  const action = toward(q, b, answers(q));
  return {type: 'move', action, text: `${corner}Cross ${spell(q.word)}: ${where(b, action)}.`};
}
const hint = (p, b) => remember(`h|${p.id}|${JSON.stringify(p.parameters)}|${JSON.stringify(b)}`, () => computeHint(p, b));

// --- View state ----------------------------------------------------------------
// The aim (start and end not yet launched), Can't's walls, a picked letter
// and Stretch. It follows the save: when the board changes (a launch, a
// claim, Undo, Restart) the aim goes back to the launched shot.
const views = new Map();
function viewOf(p, b) {
  const key = JSON.stringify(b);
  let v = views.get(p.id);
  if (!v || v.seen !== key) {
    v = {seen: key, board: b, start: [...b.start], end: b.end ? [...b.end] : null, claiming: false, pick: null, tile: null, stretched: v?.seen === key ? v.stretched : false};
    views.set(p.id, v);
  }
  return v;
}
const aiming = (v, b) => !same(v.start, b.start) || !sameEnd(v.end, b.end);
function setUi(p, payload) {
  const v = views.get(p.id);
  if (!v || !object(payload)) return;
  const q = p.parameters, b = v.board;
  if (typeof payload.claiming === 'boolean') {
    v.claiming = payload.claiming && canClaim(q, b); v.pick = null;
    if (v.claiming) { v.start = [...b.start]; v.end = b.end && [...b.end]; }
  }
  if ('pick' in payload) v.pick = v.claiming && typeof payload.pick === 'string' ? payload.pick : null;
  if ('tile' in payload) v.tile = canPair(q, b) && Number.isSafeInteger(payload.tile) ? payload.tile : null;
  if (object(payload.aim) && startOK(q, payload.aim.start)) {
    const s = payload.aim.start, e = payload.aim.end;
    if (e === null || endOK(q, s, e) || same(e, s)) { v.start = [...s]; v.end = e && !same(e, s) ? [...e] : null; v.claiming = false; v.pick = null; }
  }
}

// --- Drawing -------------------------------------------------------------------
// A window is drawn in viewBox pixels: k pixels a unit, the frame inside a
// margin. Rhombus points go through √3 here and nowhere else.
const PAD = 10;
const n2 = v => Math.round(v * 100) / 100;
function view(room, f, k, width) {
  const [X0, X1, Y0, Y1] = box(room, f), w = (X1 - X0) * k, h = (Y1 - Y0) * k, left = PAD + (width - w) / 2;
  return {room, f, k, w, h, left, W: width + 2 * PAD, H: h + 2 * PAD, px: pt => { const [x, y] = euclid(room, pt); return [n2(left + (x - X0) * k), n2(PAD + (Y1 - y) * k)]; }};
}
const scaleFor = (frames, width = 360, height = 360) => Math.min(...frames.map(([room, f]) => { const [X0, X1, Y0, Y1] = box(room, f); return Math.min(width / (X1 - X0), height / (Y1 - Y0)); }));
function viewsOf(q) {
  // A remake's two windows have their own scales. The other room's window is
  // short, and wide enough for Stretch (or Squeeze) to fit; the play window
  // gets the room the child taps in.
  if (q.mode === 'remake') {
    const g = q.given, [G0, G1, G2, G3] = box(g.room, g.frame), stretch = Math.max(1, ROOMS[q.room].W / ROOMS[g.room].W);
    const kg = Math.min(360 / ((G1 - G0) * stretch), 130 / (G3 - G2)), [P0, P1] = box(q.room, q.frame), kp = scaleFor([[q.room, q.frame]], 360, 220);
    return {given: view(g.room, g.frame, kg, 360), play: view(q.room, q.frame, kp, (P1 - P0) * kp)};
  }
  const [X0, X1] = box(q.room, q.frame), k = scaleFor([[q.room, q.frame]]);
  return {play: view(q.room, q.frame, k, (X1 - X0) * k)};
}
const pts = (v, list) => list.map(pt => v.px(pt).join(',')).join(' ');
const mid = (v, s) => { const [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b); return [n2((x1 + x2) / 2), n2((y1 + y2) / 2)]; };
const roomPoly = (room, map) => ROOMS[room].corners.map(c => apply(map, c));
const at = (start, end, [n, d]) => [start[0] + ((end[0] - start[0]) * n) / d, start[1] + ((end[1] - start[1]) * n) / d];
const label = (v, s, cls = '') => { const [x, y] = mid(v, s); return `<text class="am-lab${cls}" x="${x}" y="${y}">${s.letter}</text>`; };
const segment = (v, s, cls) => { const [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b); return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };

// The copies: a rectangle's whole window, or the rhombus copies along a
// launched shot (only the room while aiming), cut off at the window's edge.
function copiesLayer(v, room, f, maps, crossedIds, clip = '') {
  let out = '';
  if (room === 'rhombus') {
    const [X0, X1, Y0, Y1] = box(room, f), frame = `x="${n2(v.left)}" y="${PAD}" width="${n2((X1 - X0) * v.k)}" height="${n2((Y1 - Y0) * v.k)}"`;
    out += `<clipPath id="am-clip${clip}"><rect ${frame}/></clipPath><rect class="am-paper" ${frame}/><g clip-path="url(#am-clip${clip})">`;
    out += maps.map((m, i) => `<polygon class="am-copy${i === 0 ? ' room' : ' passed'}" points="${pts(v, roomPoly(room, m))}"/>`).join('');
    const walls = chainSeams(room, maps);
    out += walls.map(s => segment(v, s, `am-wall${crossedIds.has(s.id) ? ' crossed' : ''}`)).join('');
    return {svg: `${out}</g>`, labels: `<g clip-path="url(#am-clip${clip})">${walls.map(s => label(v, s, crossedIds.has(s.id) ? ' crossed' : '')).join('')}</g>`};
  }
  const [x0, y0] = v.px([f[0] * ROOMS[room].W, (f[3] + 1) * ROOMS[room].H]);
  out += `<rect class="am-paper" x="${x0}" y="${y0}" width="${n2(v.w)}" height="${n2(v.h)}"/>`;
  out += maps.slice(1).map(m => `<polygon class="am-copy passed" points="${pts(v, roomPoly(room, m))}"/>`).join('');
  out += `<polygon class="am-copy room" points="${pts(v, roomPoly(room, ID))}"/>`;
  const walls = gridSeams(room, f);
  out += walls.map(s => segment(v, s, `am-wall${crossedIds.has(s.id) ? ' crossed' : ''}`)).join('');
  return {svg: out, labels: walls.map(s => label(v, s, crossedIds.has(s.id) ? ' crossed' : '')).join('')};
}
// The walls a shot crosses, by id.
function crossedWalls(room, r) {
  if (!r) return new Set();
  return new Set(r.crossings.map((c, k) => wallSeam(room, r.copies[k], ROOMS[room].walls[c.wall].letter).id));
}
// The shot itself: straight to its end, or to the corner it hits (then faint).
function shotLayer(v, start, end, r, cls = '') {
  if (!r) return '';
  const S = v.px(start), E = v.px(end), stop = r.corner ? v.px(at(start, end, r.corner.at)) : E;
  let out = `<line class="am-shot${cls}" x1="${S[0]}" y1="${S[1]}" x2="${stop[0]}" y2="${stop[1]}"/>`;
  if (r.corner) out += `<line class="am-shot-after${cls}" x1="${stop[0]}" y1="${stop[1]}" x2="${E[0]}" y2="${E[1]}"/><circle class="am-corner" cx="${stop[0]}" cy="${stop[1]}" r="7"/>`;
  out += r.crossings.map(c => { const [x, y] = v.px(at(start, end, c.at)); return `<circle class="am-hit${cls}" cx="${x}" cy="${y}" r="3"/>`; }).join('');
  return out;
}
const ring = (v, pt, cls) => { const [x, y] = v.px(pt); return `<circle class="${cls}" cx="${x}" cy="${y}" r="12"/>`; };
// A wall's name after Can't: its letter and the copy it belongs to (the one
// nearer the room), or in the rhombus its copy along the shot.
function wallName(q, s) {
  const place = (i, j) => (i === 0 && j === 0 ? 'the room' : `the copy ${[i ? `${Math.abs(i)} ${i > 0 ? 'right' : 'left'}` : '', j ? `${Math.abs(j)} ${j > 0 ? 'up' : 'down'}` : ''].filter(Boolean).join(' and ')}`);
  if (q.room === 'rhombus') return `${s.letter} wall of ${s.copy ? `copy ${s.copy} along the shot` : 'the room'}`;
  const {W, H} = ROOMS[q.room], level = s.a[1] === s.b[1];
  const options = level ? [[s.a[0] / W, s.a[1] / H - 1], [s.a[0] / W, s.a[1] / H]] : [[s.a[0] / W - 1, s.a[1] / H], [s.a[0] / W, s.a[1] / H]];
  const [i, j] = options.sort((x, y) => Math.abs(x[0]) + Math.abs(x[1]) - Math.abs(y[0]) - Math.abs(y[1]))[0];
  return `${s.letter} wall of ${place(i, j)}`;
}

// The play window's inside: the launched shot with its crossings and copies,
// or, while aiming, only the straight aim and its end.
function boardInner(p, b, v, opts = {}) {
  const q = p.parameters, w = viewsOf(q).play, claiming = Boolean(opts.claiming), aim = aiming(v, b) && !claiming;
  const r = aim ? null : shotOf(q, b), crossed = crossedWalls(q.room, r), layer = copiesLayer(w, q.room, q.frame, r ? r.copies : [ID], crossed);
  let out = layer.svg;
  // A right claim draws the line through both walls across the window (in a
  // rectangle, where claims can be right, that line is level or upright).
  if (q.cant && b.claimed) {
    const [s] = b.claimed.map(parseSeam), [X0, X1, Y0, Y1] = box(q.room, q.frame), level = s.a[1] === s.b[1];
    const [A, B] = level ? [w.px([X0, s.a[1]]), w.px([X1, s.a[1]])] : [w.px([s.a[0], Y0]), w.px([s.a[0], Y1])];
    out += `<line class="am-proof" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`;
    out += b.claimed.map(id => segment(w, parseSeam(id), 'am-proved')).join('');
  }
  if (opts.given) out += shotLayer(w, opts.given.start, opts.given.end, opts.given.r, ' ghost');
  if (aim && v.end) { const [x1, y1] = w.px(v.start), [x2, y2] = w.px(v.end); out += `<line class="am-aim" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
  if (!aim) out += shotLayer(w, b.start, b.end, r);
  out += layer.labels;
  const hinted = opts.hinted;
  if (hinted?.type === 'launch') { out += ring(w, hinted.end, 'am-hint'); if (!same(hinted.start, v.start)) out += ring(w, hinted.start, 'am-hint'); }
  if (hinted?.type === 'claim') out += hinted.walls.map(id => segment(w, parseSeam(id), 'am-hint-wall')).join('');
  const start = aim ? v.start : b.start, end = aim ? v.end : b.end, [sx, sy] = w.px(start);
  out += `<circle class="am-start${q.movable ? ' movable' : ''}" cx="${sx}" cy="${sy}" r="${q.movable ? 7 : 5.5}"/>`;
  if (end) { const [ex, ey] = w.px(end); out += `<circle class="am-end${aim ? ' aim' : ''}" cx="${ex}" cy="${ey}" r="8"/>`; }
  // Walls to tap after Can't: each a wide invisible line, the picked one pine.
  if (claiming) {
    const list = seams(q, b);
    out += list.map(s => { const [x1, y1] = w.px(s.a), [x2, y2] = w.px(s.b); return `<line class="am-pick${v.pick === s.id ? ' picked' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" tabindex="0" role="button" data-seam="${s.id}" data-focus="am-seam-${s.id}" aria-pressed="${v.pick === s.id}" aria-label="${esc(wallName(q, s))}"/>`; }).join('');
  }
  return out;
}

// The word: the goal's letters (dashed) over the launched shot's. After a
// right Check the shot's letters are buttons, for the two that show why; they
// stay while the child aims elsewhere.
function wordRows(p, b, v, opts = {}) {
  const q = p.parameters, aim = aiming(v, b) && !opts.claiming && !canPair(q, b), r = aim ? null : shotOf(q, b);
  const tiles = (word, cls) => [...word].map(c => `<span class="am-tile${cls}">${c}</span>`).join('');
  const goal = q.mode === 'design' ? '' : `<div class="am-row goal" aria-label="Goal word ${esc(q.word)}">${tiles(q.word, ' goal')}</div>`;
  let now = '';
  if (r && canPair(q, b)) {
    now = [...r.word].map((c, i) => `<button type="button" class="am-tile pick${v.tile === i ? ' picked' : ''}${opts.hintTiles?.includes(i) ? ' hinted' : ''}" data-am-tile="${i}" data-focus="am-tile-${i}" aria-pressed="${v.tile === i}" aria-label="Letter ${i + 1}, ${c}">${c}</button>`).join('');
  } else if (r) {
    now = [...r.word].map((c, i) => `<span class="am-tile${b.pair?.includes(i) ? ' proved' : ''}">${c}</span>`).join('') + (r.corner ? '<span class="am-tile corner" aria-label="corner">⌟</span>' : '');
  }
  return `${goal}<div class="am-row now" aria-label="${r ? `Shot word ${esc(r.word) || 'empty'}${r.corner ? ', then a corner' : ''}` : 'Not launched'}">${now || '<span class="am-tile empty"></span>'}</div>`;
}
// The same shot folded into the room: its bounces, start and end.
function foldInner(room, start, end, r) {
  const rm = ROOMS[room], corners = rm.corners.map(c => euclid(room, c)), xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
  const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys), k = Math.min(104 / (X1 - X0), 70 / (Y1 - Y0)), m = 14;
  const px = pt => { const [x, y] = euclid(room, pt); return [n2(m + (x - X0) * k), n2(m + (Y1 - y) * k)]; };
  const w = n2((X1 - X0) * k + 2 * m), h = n2((Y1 - Y0) * k + 2 * m);
  let out = `<svg class="am-fold" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polygon class="am-fold-room" points="${rm.corners.map(c => px(c).join(',')).join(' ')}"/>`;
  out += rm.walls.map(wl => {
    const [a, c] = [px(rm.corners[wl.from]), px(rm.corners[wl.to])], mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, cx = m + ((X1 - X0) * k) / 2, cy = m + ((Y1 - Y0) * k) / 2;
    const dx = mx - cx, dy = my - cy, L = Math.hypot(dx, dy) || 1;
    return `<text class="am-fold-lab" x="${n2(mx + (dx / L) * 8)}" y="${n2(my + (dy / L) * 8)}">${wl.letter}</text>`;
  }).join('');
  if (r && end) {
    const stops = [[0, 1], ...r.crossings.map(c => c.at), r.corner ? r.corner.at : [1, 1]];
    const path = r.legs.slice(0, stops.length - 1).flatMap(([s, e], i) => [px(at(s, e, stops[i])), px(at(s, e, stops[i + 1]))]);
    out += `<polyline class="am-fold-path" points="${path.map(p => p.join(',')).join(' ')}"/>`;
    out += r.crossings.map((c, i) => { const [s, e] = r.legs[i]; const [x, y] = px(at(s, e, c.at)); return `<circle class="am-fold-hit" cx="${x}" cy="${y}" r="2.6"/>`; }).join('');
    const last = path.at(-1);
    out += r.corner ? `<circle class="am-corner" cx="${last[0]}" cy="${last[1]}" r="5"/>` : `<circle class="am-fold-end" cx="${last[0]}" cy="${last[1]}" r="3.2"/>`;
  }
  const [sx, sy] = px(start);
  return `${out}<circle class="am-fold-start" cx="${sx}" cy="${sy}" r="3.6"/></svg>`;
}
// The other room's window with its shot (remake puzzles). After the solve
// Stretch carries it onto the play window's shape: lines stretch, marks slide.
function givenWindow(q, v, stretched) {
  const g = q.given, r = shot(g.room, g.start, g.end), crossed = crossedWalls(g.room, r), layer = copiesLayer(v, g.room, g.frame, r.copies, crossed);
  const k = ROOMS[q.room].W / ROOMS[g.room].W, cx = n2(v.W / 2);
  const slide = svg => svg.replace(/<(text|circle) class="([^"]*)" (x|cx)="([-\d.]+)"/g, (all, tag, cls, attr, x) => `<${tag} class="${cls}" style="--dx:${n2((Number(x) - cx) * (k - 1))}px" ${attr}="${x}"`);
  const marks = slide(layer.labels + shotLayer(v, g.start, g.end, r).replace(/<line[^>]*\/>/g, '') + `<circle class="am-start" cx="${v.px(g.start)[0]}" cy="${v.px(g.start)[1]}" r="5.5"/><circle class="am-end given" cx="${v.px(g.end)[0]}" cy="${v.px(g.end)[1]}" r="6"/>`);
  const lines = layer.svg + (shotLayer(v, g.start, g.end, r).match(/<line[^>]*\/>/g) || []).join('');
  return `<svg class="am-given${stretched ? ' stretched' : ''}" viewBox="0 0 ${n2(v.W)} ${n2(v.H)}" style="--k:${k};--cx:${cx}px" role="img" aria-label="A shot in the ${ROOM_WORD[g.room]} with the word ${esc(r.word)}"><g class="am-geo">${lines}</g><g class="am-marks">${marks}</g></svg>`;
}

// Small square windows under the word: a square shot with the same word
// (a refused Check), the two walls on one line (a right pair), and for
// A C D B and the like, steeper than the diagonal and flatter.
function copyIndex(map) { const [x, y] = apply(map, [5, 5]); return [Math.floor(x / 10), Math.floor(y / 10)]; }
function miniWindow(maps) {
  const idx = maps.map(copyIndex), f = [Math.min(...idx.map(c => c[0])), Math.max(...idx.map(c => c[0])), Math.min(...idx.map(c => c[1])), Math.max(...idx.map(c => c[1]))];
  const cols = f[1] - f[0] + 1, rows = f[3] - f[2] + 1, k = Math.min(200 / (cols * 10), 150 / (rows * 10));
  return {f, v: view('square', f, k, cols * 10 * k)};
}
function evidenceSvg(word) {
  const s = squareShot(word);
  if (!s) return '';
  const r = fold('square', s.start, s.end), {f, v} = miniWindow(r.copies), layer = copiesLayer(v, 'square', f, r.copies, crossedWalls('square', r));
  const [sx, sy] = v.px(s.start), [ex, ey] = v.px(s.end);
  return `<svg class="am-mini" viewBox="0 0 ${n2(v.W)} ${n2(v.H)}" role="img" aria-label="A square shot with the word ${esc(word)}">${layer.svg}${shotLayer(v, s.start, s.end, r)}${layer.labels}<circle class="am-start" cx="${sx}" cy="${sy}" r="5"/><circle class="am-end" cx="${ex}" cy="${ey}" r="6"/></svg>`;
}
function pairSvg(word, [i, j]) {
  const maps = routeMaps('square', word.slice(0, j)), {f, v} = miniWindow(maps), letter = word[i];
  const walls = [i, j].map(n => wallSeam('square', maps[n], letter)), route = new Set([...word.slice(0, j)].map((c, n) => wallSeam('square', maps[n], c).id));
  const layer = copiesLayer(v, 'square', f, maps, route), [X0, X1, Y0, Y1] = box('square', f), y = walls[0].a[1], x = walls[0].a[0], level = walls[0].a[1] === walls[0].b[1];
  const [A, B] = level ? [v.px([X0, y]), v.px([X1, y])] : [v.px([x, Y0]), v.px([x, Y1])];
  return `<svg class="am-mini" viewBox="0 0 ${n2(v.W)} ${n2(v.H)}" role="img" aria-label="In the square’s copies the two ${letter} walls of ${esc(word.slice(i, j + 1))} lie on one line">${layer.svg}<line class="am-proof" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>${walls.map(s => segment(v, s, 'am-proved')).join('')}${layer.labels}</svg>`;
}
function slopesSvg(word) {
  const cell = (x0, a, b, steep) => {
    const box = `<rect class="am-fold-room" x="${x0}" y="10" width="80" height="80"/><line class="am-diag" x1="${x0}" y1="90" x2="${x0 + 80}" y2="10"/>`;
    const line = steep ? `<line class="am-fold-path" x1="${x0 + 30}" y1="90" x2="${x0 + 52}" y2="10"/>` : `<line class="am-fold-path" x1="${x0 + 80}" y1="38" x2="${x0}" y2="60"/>`;
    const labs = steep ? `<text class="am-fold-lab" x="${x0 + 30}" y="102">${a}</text><text class="am-fold-lab" x="${x0 + 52}" y="2">${b}</text>` : `<text class="am-fold-lab" x="${x0 + 90}" y="38">${a}</text><text class="am-fold-lab" x="${x0 - 9}" y="60">${b}</text>`;
    return box + line + labs;
  };
  const steepFirst = SIDE[word[0]] === 'AC';
  return `<svg class="am-mini" viewBox="-14 -8 228 118" role="img" aria-label="${esc(slopesText(word))}">${cell(0, word[0], word[1], steepFirst)}${cell(110, word[2], word[3], !steepFirst)}</svg>`;
}
const slopesText = word => (SIDE[word[0]] === 'AC'
  ? `In a rectangle, ${word[0]} to ${word[1]} is steeper than the diagonal and ${word[2]} to ${word[3]} is flatter.`
  : `In a rectangle, ${word[0]} to ${word[1]} is flatter than the diagonal and ${word[2]} to ${word[3]} is steeper.`);

function noteFor(q, b, v, claiming) {
  const r = shotOf(q, b), aim = aiming(v, b) && !claiming;
  if (q.cant && b.claimed) return {text: `Both ${q.word[obstruction(q.word)[0]]} walls lie on one line.`, good: true};
  if (q.cant && b.refused?.shown) return {text: q.room === 'rhombus' && b.refused.why === 'line' ? 'Not on one line.' : `Those two don’t stop ${q.word}.`};
  if (q.mode === 'design') {
    const w = wordOf(r);
    if (b.done) return q.four ? {text: slopesText(w), good: true, svg: slopesSvg(w)} : {text: `In a rectangle the two ${w[b.pair[0]]} walls would lie on one line.`, good: true, svg: pairSvg(w, b.pair)};
    if (b.refused?.shown) {
      if (b.refused.why === 'rect') return {text: 'A square makes it too.', svg: evidenceSvg(b.refused.word)};
      return {text: b.refused.why === 'four' ? 'Use each wall once.' : 'Those two don’t show why.'};
    }
    if (canPair(q, b)) return {text: 'No rectangle makes it. Tap the two letters that show why.'};
  }
  if (claiming) return {text: 'Tap two walls.'};
  if (!aim && r?.corner) return {text: 'That shot hits a corner.'};
  return null;
}

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), v = viewOf(p, b), views2 = viewsOf(q), w = views2.play;
  if (v.claiming && !canClaim(q, b)) { v.claiming = false; v.pick = null; }
  if (v.tile !== null && !canPair(q, b)) v.tile = null;
  const claiming = v.claiming, aim = aiming(v, b) && !claiming, r = aim ? null : shotOf(q, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, hinted = shown?.type === 'move' ? shown.action : null;
  const given = q.mode === 'remake' && done ? {start: mapGiven(q, q.given.start), end: mapGiven(q, q.given.end), r: shot(q.room, mapGiven(q, q.given.start), mapGiven(q, q.given.end))} : null;
  const inner = boardInner(p, b, v, {claiming, hinted, given});
  const tall = w.H > w.W ? ` style="max-width:${Math.round((380 * w.W) / w.H)}px"` : '';
  const label = `Copies of the ${ROOM_WORD[q.room]}${aim ? ', aiming' : r ? `, a shot with the word ${r.word || 'empty'}${r.corner ? ' that hits a corner' : ''}` : ''}`;
  const board = `<svg class="am-board${claiming ? ' claiming' : ''}${done ? ' solved' : ''}" data-am-board viewBox="0 0 ${n2(w.W)} ${n2(w.H)}"${tall} tabindex="0" data-focus="am-board" role="application" aria-label="${esc(label)}">${inner}</svg>`;
  const top = q.mode === 'remake' ? givenWindow(q, views2.given, done && v.stretched) : '';
  const tools = [];
  if (!done) {
    const launch = {type: 'launch', start: v.start, end: v.end};
    // Launch is outlined once the aim is at the hinted spot; until then the spot is.
    const ready = hinted?.type === 'launch' && aim && same(hinted.start, v.start) && same(hinted.end, v.end);
    tools.push(`<button type="button" class="primary am-launch${ready ? ' hinted' : ''}" data-action="expansion-move" data-move='${JSON.stringify(launch)}' data-focus="am-launch" ${aim && v.end ? '' : 'disabled'}>Launch</button>`);
  }
  if (q.cant && !done) tools.push(`<button type="button" class="secondary am-cant${hinted?.type === 'claim' ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='{"claiming":${!claiming}}' aria-pressed="${claiming}" data-focus="am-cant" ${canClaim(q, b) ? '' : 'disabled'}>Can’t</button>`);
  if (q.mode === 'design' && !done && !b.checked) tools.push(`<button type="button" class="secondary am-check${hinted?.type === 'check' ? ' hinted' : ''}" data-action="expansion-move" data-move='{"type":"check"}' data-focus="am-check" ${canCheck(q, b) ? '' : 'disabled'}>Check</button>`);
  if (q.mode === 'remake' && done) tools.push(`<button type="button" class="secondary am-stretch" data-am-stretch aria-pressed="${v.stretched}" data-focus="am-stretch">${q.given.room === 'square' ? 'Stretch' : 'Squeeze'}</button>`);
  const rows = wordRows(p, b, v, {claiming, hintTiles: hinted?.type === 'pair' ? hinted.tiles : null});
  const strip = `<div class="am-strip"><div class="am-words"><div class="am-rows">${rows}</div>${tools.length ? `<div class="am-tools">${tools.join('')}</div>` : ''}</div><div class="am-fold-box">${foldInner(q.room, aim ? v.start : b.start, aim ? null : b.end, r)}</div></div>`;
  const note = noteFor(q, b, v, claiming);
  const status = aim ? 'Aiming.' : r ? `Word ${r.word || 'empty'}${r.corner ? ', then a corner' : ''}.` : 'No shot yet.';
  const foot = note ? `<p class="am-note${note.good ? ' good' : ''}" role="status">${esc(note.text)}</p>${note.svg ? `<div class="am-proofbox">${note.svg}</div>` : ''}<p class="sr-only">${esc(status)}</p>` : `<p class="sr-only" role="status">${esc(status)}</p>`;
  return `<div class="am-puzzle mode-${q.mode}" data-mechanic-wire="aims">${top}${board}${strip}${foot}</div>`;
}

// How to play: the worksheet's first example, folded and through a copy.
function help() {
  const room = `<polygon class="am-fold-room" points="10,10 90,10 90,90 10,90"/>`;
  const labs = (dx, dy) => `<text class="am-fold-lab" x="${50 + dx}" y="${100 + dy}">A</text><text class="am-fold-lab" x="${2 + dx}" y="${52 + dy}">B</text><text class="am-fold-lab" x="${50 + dx}" y="${4 + dy}">C</text><text class="am-fold-lab" x="${98 + dx}" y="${52 + dy}">D</text>`;
  return `<div class="am-help" data-mechanic-wire="aims"><svg viewBox="-4 -6 108 112" width="108" height="112" role="img" aria-label="A shot from the start hits A, then D: its word is AD"><g>${room}${labs(0, 0)}<polyline class="am-fold-path" points="30,50 70,90 90,70 70,50"/><circle class="am-fold-hit" cx="70" cy="90" r="3"/><circle class="am-fold-hit" cx="90" cy="70" r="3"/><circle class="am-fold-start" cx="30" cy="50" r="4"/></g></svg><svg viewBox="-4 -6 188 192" width="132" height="134" role="img" aria-label="The same shot runs straight through mirror copies across A and then D"><rect class="am-paper" x="10" y="10" width="160" height="160"/><rect class="am-copy room" x="10" y="10" width="80" height="80"/><rect class="am-copy passed" x="10" y="90" width="80" height="80"/><rect class="am-copy passed" x="90" y="90" width="80" height="80"/><line class="am-wall crossed" x1="10" y1="90" x2="90" y2="90"/><line class="am-wall crossed" x1="90" y1="90" x2="90" y2="170"/><line class="am-shot" x1="30" y1="50" x2="110" y2="130"/><circle class="am-hit" cx="70" cy="90" r="3"/><circle class="am-hit" cx="90" cy="110" r="3"/><text class="am-lab crossed" x="50" y="90">A</text><text class="am-lab crossed" x="90" y="150">D</text><circle class="am-start" cx="30" cy="50" r="5"/><circle class="am-end" cx="110" cy="130" r="7"/></svg></div>`;
}

// --- Gestures --------------------------------------------------------------------
// Drag or tap in the window to aim (the end snaps to the nearest aim point);
// drag the start dot when it can move. While aiming only the straight aim is
// drawn; Launch (or Enter on the board) sends the shot. On a touch screen the
// end rides above the finger. After Can't a tap picks the nearest wall.
// Arrow keys move the aim's end (Shift moves the start) and Escape puts it
// back; Enter or Space picks a focused wall. After a right Check the word's
// letters are buttons.
const LIFT = 34;
function wire(root, p, api) {
  const q = p.parameters, board = () => api.attempt().board, v0 = () => viewOf(p, board());
  const busy = () => solved(p, board());
  const claimingNow = () => { const v = v0(); return v.claiming && canClaim(q, board()); };
  root.querySelectorAll('[data-am-tile]').forEach(button => button.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const v = v0(), i = Number(button.dataset.amTile);
    if (!canPair(q, board())) return;
    if (v.tile === null) { api.ui({tile: i}); return; }
    if (v.tile === i) { api.ui({tile: null}); return; }
    const tiles = [v.tile, i].sort((x, y) => x - y);
    v.tile = null;
    api.apply({type: 'pair', tiles});
  }));
  // Stretch slides the window without redrawing, so the change can be seen.
  const stretch = root.querySelector('[data-am-stretch]');
  stretch?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const v = v0();
    v.stretched = !v.stretched;
    root.querySelector('.am-given')?.classList.toggle('stretched', v.stretched);
    stretch.setAttribute('aria-pressed', String(v.stretched));
  });
  const svg = root.querySelector('[data-am-board]');
  if (!svg) return;
  const w = viewsOf(q).play, aims = frameAims(q.room, q.frame), roomPts = roomAims(q.room);
  const local = (x, y) => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(m.inverse()); return [r.x, r.y]; };
  const scale = () => svg.getScreenCTM?.()?.a || 1;
  const closest = (list, [x, y], skip = null) => { let best = null, d = Infinity; for (const pt of list) { if (skip && same(pt, skip)) continue; const [u, t] = w.px(pt), e = (u - x) ** 2 + (t - y) ** 2; if (e < d) { d = e; best = pt; } } return best; };
  const words = root.querySelector('.am-rows'), foldBox = root.querySelector('.am-fold-box');
  // While aiming: the straight aim only, no word and no bounces.
  const paint = () => {
    const b = board(), v = v0();
    svg.innerHTML = boardInner(p, b, v, {});
    if (words) words.innerHTML = wordRows(p, b, v);
    if (foldBox) foldBox.innerHTML = foldInner(q.room, v.start, null, null);
  };
  let drag = null;
  const tapWall = id => {
    const v = v0();
    if (v.pick === id) { api.ui({pick: null}); return; }
    if (v.pick === null) { api.ui({pick: id}); return; }
    const walls = [v.pick, id].sort();
    Object.assign(v, {claiming: false, pick: null});
    api.apply({type: 'claim', walls});
  };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || busy()) return;
    const here = local(e.clientX, e.clientY);
    if (!here) return;
    e.preventDefault();
    // Keep keyboard focus on the board, never on Can't or the page.
    if (document.activeElement !== svg) svg.focus?.({preventScroll: true});
    svg.setPointerCapture?.(e.pointerId);
    if (claimingNow()) { drag = {pointer: e.pointerId, claim: true}; return; }
    const v = v0(), sv = w.px(v.start), toStart = Math.hypot(sv[0] - here[0], sv[1] - here[1]);
    const nearStart = q.movable && toStart * scale() < 24 && !(v.end && (() => { const ev = w.px(v.end); return Math.hypot(ev[0] - here[0], ev[1] - here[1]) < toStart; })());
    drag = {pointer: e.pointerId, what: nearStart ? 'start' : 'end', x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch', near: toStart * scale() < 24, was: {start: v.start, end: v.end, claiming: v.claiming}};
    v.claiming = false;
    if (!nearStart) { const pt = closest(aims, here, v.start); if (pt) { v.end = pt; paint(); } }
  });
  svg.addEventListener('pointermove', e => {
    const g = drag;
    if (!g || g.claim || e.pointerId !== g.pointer) return;
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moved = true;
    if (!g.moved) return;
    const here = local(e.clientX, e.clientY - (g.touch ? LIFT : 0));
    if (!here) return;
    const v = v0();
    if (g.what === 'start') { const pt = closest(roomPts, here); if (pt && !same(pt, v.start)) { v.start = pt; if (v.end && same(v.end, pt)) v.end = null; paint(); } return; }
    const pt = closest(aims, here, v.start);
    if (pt && !same(pt, v.end)) { v.end = pt; paint(); }
  });
  const finish = e => {
    const g = drag;
    if (!g || e.pointerId !== g.pointer) return;
    drag = null;
    const v = v0();
    if (e.type !== 'pointerup') { if (!g.claim) Object.assign(v, g.was); api.ui({}); return; }
    if (g.claim) {
      const here = local(e.clientX, e.clientY);
      if (!here) return;
      let best = null, d = Infinity;
      for (const s of seams(q, board())) {
        const [x1, y1] = w.px(s.a), [x2, y2] = w.px(s.b), dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((here[0] - x1) * dx + (here[1] - y1) * dy) / (dx * dx + dy * dy)));
        const e2 = Math.hypot(x1 + t * dx - here[0], y1 + t * dy - here[1]);
        if (e2 < d) { d = e2; best = s; }
      }
      if (best && d * scale() < 22) tapWall(best.id);
      return;
    }
    // A tap on a movable start (no drag) aims at the nearest other spot.
    if (g.what === 'start' && !g.moved) { const here = local(e.clientX, e.clientY); const pt = here && closest(aims, here, v.start); if (pt) v.end = pt; }
    api.ui({aim: {start: v.start, end: v.end}});
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
  svg.addEventListener('keydown', e => {
    const wall = e.target.closest?.('[data-seam]');
    if (wall && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapWall(wall.dataset.seam); return; }
    if (e.key === 'Escape' && claimingNow()) { e.preventDefault(); api.ui({claiming: false}); return; }
    if (busy() || claimingNow() || e.altKey || e.ctrlKey || e.metaKey) return;
    const b = board(), v = v0();
    // Escape puts the aim back on the launched shot.
    if (e.key === 'Escape' && aiming(v, b)) { e.preventDefault(); api.ui({aim: {start: b.start, end: b.end}}); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === svg) {
      e.preventDefault();
      if (aiming(v, b) && v.end) api.apply({type: 'launch', start: v.start, end: v.end});
      return;
    }
    const dir = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
    if (!dir) return;
    e.preventDefault();
    const moveStart = e.shiftKey && q.movable, from = moveStart ? v.start : v.end ?? v.start;
    const next = step(q.room, (moveStart ? roomPts : aims).filter(pt => moveStart || !same(pt, v.start)), from, dir);
    if (!next) return;
    api.ui({aim: moveStart ? {start: next, end: v.end && same(v.end, next) ? null : v.end} : {start: v.start, end: next}});
  });
}
// The nearest aim point in an arrow's direction (within 45° of it).
export function step(room, list, from, [dx, dy]) {
  const [x, y] = euclid(room, from);
  let best = null;
  for (const pt of list) {
    const [u, w] = euclid(room, pt), ax = u - x, ay = w - y, ahead = ax * dx + ay * dy, off = Math.abs(ax * dy - ay * dx);
    if (ahead <= 1e-9 || off > ahead) continue;
    const score = ahead + 2 * off;
    if (!best || score < best.score - 1e-9) best = {pt, score};
  }
  return best ? best.pt : null;
}

export const aimsMechanics = {
  aims: {
    fresh, valid, solved, move, hint, render, wire, help,
    ui: setUi,
    reset(p) { views.delete(p.id); },
    // Undo keeps a refusal while the shot is the same, without its words.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to) || !from.refused || to.refused || !same(from.start, to.start) || !sameEnd(from.end, to.end)) return to;
      if (q.cant && to.claimed === null) return {...to, refused: {...from.refused, shown: false}};
      if (q.mode === 'design' && !to.done) return {...to, checked: from.checked, refused: {...from.refused, shown: false}};
      return to;
    }
  }
};

// The family seam entry (dist/families.js). The puzzles join Mirror Couriers
// as its Bounce words group, so the module adds no satchel family.
export default {
  id: 'aims',
  mechanics: aimsMechanics,
  pack: new URL('./aims.json', import.meta.url).href,
  css: new URL('./aims.css', import.meta.url).href,
  focus: '.am-board,.am-check:not([disabled]),.am-stretch'
};
