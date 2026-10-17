// Bounce words (worksheet Week 71, "Can you hear the room?"): the Aims group
// of Mirror Couriers. A shot starts inside a room with lettered walls and
// bounces like light in a mirror; its word is the walls it hits, in order.
// The child drags the end of the shot through mirror copies of the room, where
// it runs straight on, and the app folds it back into bounces and spells the
// word. Corner hits are not allowed, and fold.js decides them exactly.
//
// Three kinds of puzzle: make a given word (target), make in one rectangle the
// word a shot in the other rectangle makes (remake), and make a word no
// rectangle can make (design). Some target words have Can't: in a rectangle a
// word with A, then B, then A again can't happen, because in the copies both
// A walls lie on one line, which a straight shot crosses once. After Can't the
// child taps those two walls; the 60° rhombus can make ABA at its sharp corner.
import {esc} from '../../expansion-controls.js';
import {ROOMS, fold, isAim, inRoom, roomAims, apply, compose, ID, rectangleWord, wallOf} from './fold.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPoint = value => Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
const sameEnd = (a, b) => (a === null && b === null) || same(a, b);
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
  for (const m of maps) for (const w of ROOMS[room].walls) { const s = wallSeam(room, m, w.letter); if (!seen.has(s.id)) seen.set(s.id, s); }
  return [...seen.values()];
}
// The walls a claim can tap: every wall in a rectangle's window, or the walls
// of the copies the rhombus shot passes through.
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
// Where a word breaks the rectangle rule: [i, j] when letter j repeats
// letter i with only walls of the other direction between (ABA: [0, 2]).
export function obstruction(word) {
  for (let j = 1; j < word.length; j++) {
    let i = j - 1;
    while (i >= 0 && SIDE[word[i]] !== SIDE[word[j]]) i--;
    if (i >= 0 && i < j - 1 && word[i] === word[j]) return [i, j];
  }
  return null;
}
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

// --- Boards ----------------------------------------------------------------
// target:      {start, end}                      end null before the first shot
// target, Can't: {start, end, claimed, refused}  claimed: the two wall ids;
//                refused: {walls, why, shown}
// remake:      {start, end}
// design:      {start, end, done, refused}       refused: {why, shown}
// A refusal stays until the shot changes; Undo keeps it but hides its words.
const KEYS = q => (q.mode === 'design' ? 'done,end,refused,start' : q.cant ? 'claimed,end,refused,start' : 'end,start');
function fresh(p) {
  const q = p.parameters, b = {start: [...q.start], end: null};
  if (q.mode === 'design') return {...b, done: false, refused: null};
  if (q.cant) return {...b, claimed: null, refused: null};
  return b;
}
const validFrame = (room, f) => Array.isArray(f) && f.length === 4 && f.every(Number.isSafeInteger) && (room === 'rhombus' ? f[0] < f[1] && f[2] < f[3] : f[0] <= f[1] && f[2] <= f[3]);
const validParams = q => remember(`vp|${JSON.stringify(q)}`, () => {
  if (!object(q) || !MODES.includes(q.mode) || !Object.hasOwn(ROOMS, q.room) || !validFrame(q.room, q.frame)) return false;
  if (!isPoint(q.start) || !isAim(q.room, q.start) || !inRoom(q.room, q.start) || !inFrame(q.room, q.frame, q.start)) return false;
  if (q.mode !== 'design' && !(typeof q.word === 'string' && /^[ABCD]{1,8}$/.test(q.word))) return false;
  if (q.cant && q.mode !== 'target') return false;
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
const endOK = (q, e) => e === null || (isPoint(e) && isAim(q.room, e) && inFrame(q.room, q.frame, e));
const validPair = (q, b, pair) => Array.isArray(pair) && pair.length === 2 && pair.every(id => typeof id === 'string') && pair[0] < pair[1] && pair.every(id => seams(q, b).some(s => s.id === id));
function valid(p, b) {
  const q = p.parameters;
  if (!validParams(q) || !object(b) || Object.keys(b).sort().join() !== KEYS(q)) return false;
  if (!startOK(q, b.start) || !endOK(q, b.end)) return false;
  const r = shotOf(q, b);
  if (q.mode === 'design') {
    if (typeof b.done !== 'boolean') return false;
    if (b.done && b.refused !== null) return false;
    if (b.done) return legal(r) && meets(q, r.word);
    if (b.refused === null) return true;
    return object(b.refused) && Object.keys(b.refused).sort().join() === 'shown,why' && typeof b.refused.shown === 'boolean'
      && legal(r) && tried(r) && !meets(q, r.word) && b.refused.why === designWhy(q, r.word);
  }
  if (!q.cant) return true;
  if (b.claimed === null && b.refused === null) return true;
  if (b.claimed !== null && b.refused !== null) return false;
  if (!tried(r)) return false;
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
// Claims and checks can be made once per shot.
const canClaim = (q, b) => q.cant && b.claimed === null && b.refused === null && tried(shotOf(q, b));
const canCheck = (q, b) => q.mode === 'design' && !b.done && b.refused === null && legal(shotOf(q, b)) && tried(shotOf(q, b));
const newShot = (q, b) => (q.mode === 'design' ? {...b, refused: null} : q.cant ? {...b, refused: null} : b);

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (action.type === 'aim') {
    if (!isPoint(action.end) || !endOK(q, action.end) || same(action.end, b.end)) return null;
    return newShot(q, {...b, end: [...action.end]});
  }
  if (action.type === 'start') {
    if (!q.movable || !startOK(q, action.start) || same(action.start, b.start)) return null;
    return newShot(q, {...b, start: [...action.start]});
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
    return meets(q, word) ? {...b, done: true} : {...b, refused: {why: designWhy(q, word), shown: true}};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
const spell = word => [...word].join(', then ');
const gap = (room, a, b) => { const [x, y] = euclid(room, a), [u, v] = euclid(room, b); return (x - u) ** 2 + (y - v) ** 2; };
const byPlace = (a, b) => a[0] - b[0] || a[1] - b[1];
const nearest = (room, list, to) => [...list].sort((a, b) => gap(room, a, to) - gap(room, b, to) || byPlace(a, b))[0];
// The next shot move toward one of the solving shots in `list`: keep the
// child's start if it can work, else move the start.
function toward(q, b, list) {
  const here = list.filter(w => same(w.start, b.start));
  if (here.length) return {type: 'aim', end: nearest(q.room, here.map(w => w.end), b.end ?? b.start)};
  const options = [...new Map(list.map(w => [String(w.start), w.start])).values()];
  return {type: 'start', start: nearest(q.room, options, b.start)};
}
// Shots whose word is the given prefix of the target (an attempt at it).
function attempts(q, prefix) {
  return remember(`at|${JSON.stringify(q)}|${prefix}`, () => {
    const out = [];
    for (const s of starts(q)) for (const e of frameAims(q.room, q.frame)) { const r = fold(q.room, s, e); if (legal(r) && r.word === prefix) out.push({start: s, end: e}); }
    return out;
  });
}
function computeHint(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart to clear the board.'};
  if (solved(p, b)) return {type: 'done'};
  const r = shotOf(q, b), corner = r?.corner ? 'That shot hits a corner. ' : '';
  if (q.cant && !possible(q)) {
    const [i, j] = obstruction(q.word), prefix = q.word.slice(0, j), letter = q.word[i];
    if (canClaim(q, b)) {
      const between = q.word.slice(i + 1, j);
      return {type: 'move', action: {type: 'claim', walls: certificate(q).map(s => s.id).sort()},
        text: `The ${letter} wall a shot crosses and the ${letter} wall it needs after ${spell(between)} lie on one line, and a straight shot crosses a line only once. So ${q.word} can’t happen: press Can’t and tap those two walls.`};
    }
    const list = attempts(q, prefix).filter(w => !(same(w.start, b.start) && same(w.end, b.end)));
    const action = toward(q, b, list);
    return {type: 'move', action, text: `${corner}Try ${spell(prefix)}${action.type === 'start' ? ', from the outlined start' : ', ending at the outlined spot'}.`};
  }
  if (q.mode === 'design') {
    if (canCheck(q, b) && meets(q, r.word)) return {type: 'move', action: {type: 'check'}, text: `No rectangle can make ${r.word}. Press Check.`};
    const list = answers(q), action = toward(q, b, list);
    const goal = action.type === 'aim' ? fold(q.room, b.start, action.end).word : null;
    return {type: 'move', action, text: action.type === 'start' ? `${corner}Start at the outlined spot.` : `${corner}Try ${spell(goal)}: end the shot at the outlined spot.`};
  }
  const action = toward(q, b, answers(q));
  if (action.type === 'start') return {type: 'move', action, text: `${corner}Start at the outlined spot.`};
  if (q.mode === 'remake') return {type: 'move', action, text: `${corner}End the shot in the same copy, at the same spot, as the shot above: the outlined spot.`};
  return {type: 'move', action, text: `${corner}Cross ${spell(q.word)}: end the shot at the outlined spot.`};
}
const hint = (p, b) => remember(`h|${p.id}|${JSON.stringify(p.parameters)}|${JSON.stringify(b)}`, () => computeHint(p, b));

// --- View state ----------------------------------------------------------------
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, pick: null, stretched: false}); return uiState.get(p.id); };

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

// The copies: a rectangle's whole window, or the rhombus copies along the shot.
function copiesLayer(v, room, f, r, crossedIds) {
  let out = '';
  if (room === 'rhombus') {
    // Copies past the frame are cut off at its edge.
    const maps = r ? r.copies : [ID], [X0, X1, Y0, Y1] = box(room, f), frame = `x="${n2(v.left)}" y="${PAD}" width="${n2((X1 - X0) * v.k)}" height="${n2((Y1 - Y0) * v.k)}"`;
    out += `<clipPath id="am-clip"><rect ${frame}/></clipPath><rect class="am-paper" ${frame}/><g clip-path="url(#am-clip)">`;
    out += maps.map((m, i) => `<polygon class="am-copy${i === 0 ? ' room' : ' passed'}" points="${pts(v, roomPoly(room, m))}"/>`).join('');
    const walls = chainSeams(room, maps);
    out += walls.map(s => `<line class="am-wall${crossedIds.has(s.id) ? ' crossed' : ''}" x1="${v.px(s.a)[0]}" y1="${v.px(s.a)[1]}" x2="${v.px(s.b)[0]}" y2="${v.px(s.b)[1]}"/>`).join('');
    return {svg: `${out}</g>`, labels: `<g clip-path="url(#am-clip)">${walls.map(s => label(v, s, crossedIds.has(s.id) ? ' crossed' : '')).join('')}</g>`};
  }
  const [x0, y0] = v.px([f[0] * ROOMS[room].W, (f[3] + 1) * ROOMS[room].H]);
  out += `<rect class="am-paper" x="${x0}" y="${y0}" width="${n2(v.w)}" height="${n2(v.h)}"/>`;
  out += (r ? r.copies : []).slice(1).map(m => `<polygon class="am-copy passed" points="${pts(v, roomPoly(room, m))}"/>`).join('');
  out += `<polygon class="am-copy room" points="${pts(v, roomPoly(room, ID))}"/>`;
  const walls = gridSeams(room, f);
  out += walls.map(s => `<line class="am-wall${crossedIds.has(s.id) ? ' crossed' : ''}" x1="${v.px(s.a)[0]}" y1="${v.px(s.a)[1]}" x2="${v.px(s.b)[0]}" y2="${v.px(s.b)[1]}"/>`).join('');
  return {svg: out, labels: walls.map(s => label(v, s, crossedIds.has(s.id) ? ' crossed' : '')).join('')};
}
// The walls a shot crosses, by id.
function crossedWalls(room, r) {
  if (!r) return new Set();
  return new Set(r.crossings.map((c, k) => wallSeam(room, r.copies[k], ROOMS[room].walls[c.wall].letter).id));
}
// The shot itself: straight to its end, or to the corner it hits (then faint).
function shotLayer(v, room, start, end, r, cls = '') {
  if (!r) return '';
  const S = v.px(start), E = v.px(end), stop = r.corner ? v.px(at(start, end, r.corner.at)) : E;
  let out = `<line class="am-shot${cls}" x1="${S[0]}" y1="${S[1]}" x2="${stop[0]}" y2="${stop[1]}"/>`;
  if (r.corner) out += `<line class="am-shot-after${cls}" x1="${stop[0]}" y1="${stop[1]}" x2="${E[0]}" y2="${E[1]}"/><circle class="am-corner" cx="${stop[0]}" cy="${stop[1]}" r="7"/>`;
  out += r.crossings.map(c => { const [x, y] = v.px(at(start, end, c.at)); return `<circle class="am-hit${cls}" cx="${x}" cy="${y}" r="3"/>`; }).join('');
  return out;
}
const ring = (v, pt, cls) => { const [x, y] = v.px(pt); return `<circle class="${cls}" cx="${x}" cy="${y}" r="12"/>`; };

// The play window's inside, redrawn while a shot is dragged.
function boardInner(p, b, opts = {}) {
  const q = p.parameters, v = viewsOf(q).play, r = shotOf(q, b), st = opts.ui || {claiming: false, pick: null};
  const crossed = crossedWalls(q.room, r), layer = copiesLayer(v, q.room, q.frame, r, crossed);
  let out = layer.svg;
  // A right claim draws the line through both walls across the window (in a
  // rectangle, where claims can be right, that line is level or upright).
  if (q.cant && b.claimed) {
    const [s] = b.claimed.map(parseSeam), [X0, X1, Y0, Y1] = box(q.room, q.frame), level = s.a[1] === s.b[1];
    const [A, B] = level ? [v.px([X0, s.a[1]]), v.px([X1, s.a[1]])] : [v.px([s.a[0], Y0]), v.px([s.a[0], Y1])];
    out += `<line class="am-proof" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`;
    out += b.claimed.map(id => { const s = parseSeam(id), [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b); return `<line class="am-proved" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
  }
  if (opts.given) out += shotLayer(v, q.room, opts.given.start, opts.given.end, opts.given.r, ' ghost');
  out += shotLayer(v, q.room, b.start, b.end, r);
  out += layer.labels;
  const hinted = opts.hinted;
  if (hinted?.type === 'aim') out += ring(v, hinted.end, 'am-hint');
  if (hinted?.type === 'start') out += ring(v, hinted.start, 'am-hint');
  if (hinted?.type === 'claim') out += hinted.walls.map(id => { const s = parseSeam(id), [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b); return `<line class="am-hint-wall" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
  const [sx, sy] = v.px(b.start);
  out += `<circle class="am-start${q.movable ? ' movable' : ''}" cx="${sx}" cy="${sy}" r="${q.movable ? 7 : 5.5}"/>`;
  if (b.end) { const [ex, ey] = v.px(b.end); out += `<circle class="am-end" cx="${ex}" cy="${ey}" r="8"/>`; }
  // Walls to tap after Can't: each a wide invisible line, the picked one pine.
  if (st.claiming) {
    const list = seams(q, b);
    out += list.map((s, i) => { const [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b); return `<line class="am-pick${st.pick === s.id ? ' picked' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" tabindex="0" role="button" data-seam="${s.id}" data-focus="am-seam-${s.id}" aria-pressed="${st.pick === s.id}" aria-label="${s.letter} wall ${i + 1} of ${list.length}"/>`; }).join('');
  }
  return out;
}

// The word: the goal's letters (dashed) over the shot's.
function wordRows(p, b) {
  const q = p.parameters, r = shotOf(q, b);
  const tiles = (word, cls) => [...word].map(c => `<span class="am-tile${cls}">${c}</span>`).join('');
  const goal = q.mode === 'design' ? '' : `<div class="am-row goal" aria-label="Goal word ${esc(q.word)}">${tiles(q.word, ' goal')}</div>`;
  const now = !r ? '' : `${tiles(r.word, '')}${r.corner ? '<span class="am-tile corner" aria-label="corner">⌟</span>' : ''}`;
  return `${goal}<div class="am-row now" aria-label="${r ? `Shot word ${esc(r.word) || 'empty'}${r.corner ? ', then a corner' : ''}` : 'No shot yet'}">${now || '<span class="am-tile empty"></span>'}</div>`;
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
  if (r) {
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
// Stretch carries it onto the play window: lines stretch, marks slide.
function givenWindow(q, v, stretched) {
  const g = q.given, r = shot(g.room, g.start, g.end), crossed = crossedWalls(g.room, r), layer = copiesLayer(v, g.room, g.frame, r, crossed);
  const k = ROOMS[q.room].W / ROOMS[g.room].W, cx = n2(v.W / 2);
  const slide = svg => svg.replace(/<(text|circle) class="([^"]*)" (x|cx)="([-\d.]+)"/g, (all, tag, cls, attr, x) => `<${tag} class="${cls}" style="--dx:${n2((Number(x) - cx) * (k - 1))}px" ${attr}="${x}"`);
  const marks = slide(layer.labels + shotLayer(v, g.room, g.start, g.end, r).replace(/<line[^>]*\/>/g, '') + `<circle class="am-start" cx="${v.px(g.start)[0]}" cy="${v.px(g.start)[1]}" r="5.5"/><circle class="am-end given" cx="${v.px(g.end)[0]}" cy="${v.px(g.end)[1]}" r="6"/>`);
  const lines = layer.svg + (shotLayer(v, g.room, g.start, g.end, r).match(/<line[^>]*\/>/g) || []).join('');
  return `<svg class="am-given${stretched ? ' stretched' : ''}" viewBox="0 0 ${n2(v.W)} ${n2(v.H)}" style="--k:${k};--cx:${cx}px" role="img" aria-label="A shot in the ${ROOM_WORD[g.room]} with the word ${esc(r.word)}"><g class="am-geo">${lines}</g><g class="am-marks">${marks}</g></svg>`;
}

const NOTE = {
  line: 'Not on one line.',
  four: 'Use each wall once.',
  rect: 'A rectangle can make it too.'
};
function noteFor(q, b, st) {
  const r = shotOf(q, b);
  if (q.cant && b.claimed) { const letter = q.word[obstruction(q.word)[0]]; return {text: `Both ${letter} walls lie on one line.`, good: true}; }
  if (q.cant && b.refused?.shown) return {text: b.refused.why === 'line' ? NOTE.line : `Not the ${q.word[obstruction(q.word)?.[0] ?? 0]} walls ${q.word} needs.`};
  if (q.mode === 'design' && b.refused?.shown) return {text: NOTE[b.refused.why]};
  if (st.claiming) return {text: 'Tap two walls.'};
  if (r?.corner) return {text: 'That shot hits a corner.'};
  return null;
}

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), st = ui(p), views = viewsOf(q), v = views.play, r = shotOf(q, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, hinted = shown?.type === 'move' ? shown.action : null;
  const claiming = st.claiming && canClaim(q, b);
  const given = q.mode === 'remake' && done ? {start: mapGiven(q, q.given.start), end: mapGiven(q, q.given.end), r: shot(q.room, mapGiven(q, q.given.start), mapGiven(q, q.given.end))} : null;
  const inner = boardInner(p, b, {ui: {claiming, pick: st.pick}, hinted, given});
  const tall = v.H > v.W ? ` style="max-width:${Math.round((380 * v.W) / v.H)}px"` : '';
  const label = `Copies of the ${ROOM_WORD[q.room]}${r ? `, a shot with the word ${r.word || 'empty'}${r.corner ? ' that hits a corner' : ''}` : ''}`;
  const board = `<svg class="am-board${claiming ? ' claiming' : ''}${done ? ' solved' : ''}" data-am-board viewBox="0 0 ${n2(v.W)} ${n2(v.H)}"${tall} tabindex="0" data-focus="am-board" role="application" aria-label="${esc(label)}">${inner}</svg>`;
  const top = q.mode === 'remake' ? givenWindow(q, views.given, done && st.stretched) : '';
  const tools = [];
  if (q.cant && !done) tools.push(`<button type="button" class="secondary am-cant${hinted?.type === 'claim' ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='{"claiming":${!claiming}}' aria-pressed="${claiming}" data-focus="am-cant" ${canClaim(q, b) ? '' : 'disabled'}>Can’t</button>`);
  if (q.mode === 'design' && !done) tools.push(`<button type="button" class="secondary am-check${hinted?.type === 'check' ? ' hinted' : ''}" data-action="expansion-move" data-move='{"type":"check"}' data-focus="am-check" ${canCheck(q, b) ? '' : 'disabled'}>Check</button>`);
  if (q.mode === 'remake' && done) tools.push(`<button type="button" class="secondary am-stretch" data-am-stretch aria-pressed="${st.stretched}" data-focus="am-stretch">${q.given.room === 'square' ? 'Stretch' : 'Squeeze'}</button>`);
  const note = noteFor(q, b, {claiming});
  const status = r ? `Word ${r.word || 'empty'}${r.corner ? ', then a corner' : ''}.` : 'No shot yet.';
  // The buttons sit under the word, beside the folded room, to keep the card short.
  const strip = `<div class="am-strip"><div class="am-words"><div class="am-rows">${wordRows(p, b)}</div>${tools.length ? `<div class="am-tools">${tools.join('')}</div>` : ''}</div><div class="am-fold-box">${foldInner(q.room, b.start, b.end ?? b.start, b.end ? r : null)}</div></div>`;
  return `<div class="am-puzzle mode-${q.mode}" data-mechanic-wire="aims">${top}${board}${strip}${note ? `<p class="am-note${note.good ? ' good' : ''}" role="status">${esc(note.text)}</p><p class="sr-only">${esc(status)}</p>` : `<p class="sr-only" role="status">${esc(status)}</p>`}</div>`;
}
// The given shot carried into the play room by the stretch (or squeeze).
function mapGiven(q, [x, y]) { return [(x * ROOMS[q.room].W) / ROOMS[q.given.room].W, y]; }

// How to play: the worksheet's first example, folded and through a copy.
function help() {
  const room = `<polygon class="am-fold-room" points="10,10 90,10 90,90 10,90"/>`;
  const labs = (dx, dy) => `<text class="am-fold-lab" x="${50 + dx}" y="${100 + dy}">A</text><text class="am-fold-lab" x="${2 + dx}" y="${52 + dy}">B</text><text class="am-fold-lab" x="${50 + dx}" y="${4 + dy}">C</text><text class="am-fold-lab" x="${98 + dx}" y="${52 + dy}">D</text>`;
  return `<div class="am-help" data-mechanic-wire="aims"><svg viewBox="-4 -6 108 112" width="108" height="112" role="img" aria-label="A shot from the start hits A, then D: its word is AD"><g>${room}${labs(0, 0)}<polyline class="am-fold-path" points="30,50 70,90 90,70 70,50"/><circle class="am-fold-hit" cx="70" cy="90" r="3"/><circle class="am-fold-hit" cx="90" cy="70" r="3"/><circle class="am-fold-start" cx="30" cy="50" r="4"/></g></svg><svg viewBox="-4 -6 188 192" width="132" height="134" role="img" aria-label="The same shot runs straight through mirror copies across A and then D"><rect class="am-paper" x="10" y="10" width="160" height="160"/><rect class="am-copy room" x="10" y="10" width="80" height="80"/><rect class="am-copy passed" x="10" y="90" width="80" height="80"/><rect class="am-copy passed" x="90" y="90" width="80" height="80"/><line class="am-wall crossed" x1="10" y1="90" x2="90" y2="90"/><line class="am-wall crossed" x1="90" y1="90" x2="90" y2="170"/><line class="am-shot" x1="30" y1="50" x2="110" y2="130"/><circle class="am-hit" cx="70" cy="90" r="3"/><circle class="am-hit" cx="90" cy="110" r="3"/><text class="am-lab crossed" x="50" y="90">A</text><text class="am-lab crossed" x="90" y="150">D</text><circle class="am-start" cx="30" cy="50" r="5"/><circle class="am-end" cx="110" cy="130" r="7"/></svg></div>`;
}

// --- Gestures --------------------------------------------------------------------
// Drag or tap in the window to set the end of the shot (it snaps to the
// nearest aim point); drag the start dot when it can move. While dragging the
// board, word and folded room are redrawn; release makes one move. On a touch
// screen the end rides above the finger. After Can't a tap picks the nearest
// wall. Arrow keys move the end (Shift moves the start); Enter or Space picks
// a focused wall.
const LIFT = 34;
function wire(root, p, api) {
  const svg = root.querySelector('[data-am-board]'), q = p.parameters;
  if (!svg) return;
  const v = viewsOf(q).play, aims = frameAims(q.room, q.frame), roomPts = roomAims(q.room);
  const local = (x, y) => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(m.inverse()); return [r.x, r.y]; };
  const scale = () => svg.getScreenCTM?.()?.a || 1;
  const closest = (list, [x, y]) => { let best = null, d = Infinity; for (const pt of list) { const [u, w] = v.px(pt), e = (u - x) ** 2 + (w - y) ** 2; if (e < d) { d = e; best = pt; } } return {pt: best, d: Math.sqrt(d)}; };
  const words = root.querySelector('.am-rows'), foldBox = root.querySelector('.am-fold-box');
  const paint = board => {
    svg.innerHTML = boardInner(p, board, {ui: {claiming: false, pick: null}});
    if (words) words.innerHTML = wordRows(p, board);
    if (foldBox) foldBox.innerHTML = foldInner(q.room, board.start, board.end ?? board.start, board.end ? shotOf(q, board) : null);
  };
  const board = () => api.attempt().board;
  const busy = () => solved(p, board());
  let drag = null;
  const tapWall = id => {
    const st = ui(p);
    if (st.pick === id) { api.ui({pick: null}); return; }
    if (st.pick === null) { api.ui({pick: id}); return; }
    const walls = [st.pick, id].sort();
    Object.assign(st, {claiming: false, pick: null});
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
    if (ui(p).claiming) { drag = {pointer: e.pointerId, claim: true, x: e.clientX, y: e.clientY}; return; }
    const b = board(), sv = v.px(b.start), nearStart = q.movable && Math.hypot(sv[0] - here[0], sv[1] - here[1]) * scale() < 24
      && !(b.end && (() => { const ev = v.px(b.end); return Math.hypot(ev[0] - here[0], ev[1] - here[1]) < Math.hypot(sv[0] - here[0], sv[1] - here[1]); })());
    drag = {pointer: e.pointerId, what: nearStart ? 'start' : 'end', x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch', at: null};
    if (!nearStart) { drag.at = closest(aims, here).pt; paint({...newShot(q, b), end: drag.at}); }
  });
  svg.addEventListener('pointermove', e => {
    const g = drag;
    if (!g || g.claim || e.pointerId !== g.pointer) return;
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moved = true;
    if (!g.moved) return;
    const here = local(e.clientX, e.clientY - (g.touch ? LIFT : 0));
    if (!here) return;
    const pt = closest(g.what === 'start' ? roomPts : aims, here).pt, b = board();
    if (same(pt, g.at)) return;
    g.at = pt;
    paint(g.what === 'start' ? {...newShot(q, b), start: pt} : {...newShot(q, b), end: pt});
  });
  const finish = e => {
    const g = drag;
    if (!g || e.pointerId !== g.pointer) return;
    drag = null;
    if (e.type !== 'pointerup') { api.ui({}); return; }
    if (g.claim) {
      const here = local(e.clientX, e.clientY);
      if (!here) return;
      let best = null, d = Infinity;
      for (const s of seams(q, board())) {
        const [x1, y1] = v.px(s.a), [x2, y2] = v.px(s.b), dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((here[0] - x1) * dx + (here[1] - y1) * dy) / (dx * dx + dy * dy)));
        const e2 = Math.hypot(x1 + t * dx - here[0], y1 + t * dy - here[1]);
        if (e2 < d) { d = e2; best = s; }
      }
      if (best && d * scale() < 22) tapWall(best.id);
      return;
    }
    const b = board();
    if (g.what === 'start') { if (g.at && !same(g.at, b.start)) api.apply({type: 'start', start: g.at}); else api.ui({}); return; }
    if (g.at && !same(g.at, b.end)) api.apply({type: 'aim', end: g.at}); else api.ui({});
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
  svg.addEventListener('keydown', e => {
    const wall = e.target.closest?.('[data-seam]');
    if (wall && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapWall(wall.dataset.seam); return; }
    if (e.key === 'Escape' && ui(p).claiming) { e.preventDefault(); api.ui({claiming: false}); return; }
    const dir = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey || busy() || ui(p).claiming) return;
    e.preventDefault();
    const b = board(), moveStart = e.shiftKey && q.movable, from = moveStart ? b.start : b.end ?? b.start;
    const next = step(q.room, moveStart ? roomPts : aims, from, dir);
    if (!next) return;
    api.apply(moveStart ? {type: 'start', start: next} : {type: 'aim', end: next});
  });
  // Stretch slides the window without redrawing, so the change can be seen.
  const stretch = root.querySelector('[data-am-stretch]');
  stretch?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const st = ui(p);
    st.stretched = !st.stretched;
    root.querySelector('.am-given')?.classList.toggle('stretched', st.stretched);
    stretch.setAttribute('aria-pressed', String(st.stretched));
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
    ui(p, payload) {
      if (!object(payload)) return;
      const st = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(st, {claiming: payload.claiming, pick: null});
      if ('pick' in payload) st.pick = typeof payload.pick === 'string' ? payload.pick : null;
    },
    reset(p) { uiState.delete(p.id); },
    // Undo keeps a refusal while the shot is the same, without its words.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to) || !from.refused || to.refused || !same(from.start, to.start) || !sameEnd(from.end, to.end)) return to;
      if (q.cant && to.claimed === null) return {...to, refused: {...from.refused, shown: false}};
      if (q.mode === 'design' && !to.done) return {...to, refused: {...from.refused, shown: false}};
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
