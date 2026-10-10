// The shared bead ring: n beads equally spaced on a circle, each painted one
// of a few colours, and a see-through copy of the ring that can be turned and
// flipped over it, like tracing paper. Families that work with rings
// (necklaces and distinguishing colourings, worksheet Weeks 33 and 34) decide
// what a tap does and what counts as a solve; this module does the arithmetic
// of turns and flips, lists rings up to symmetry, and draws the ring, its copy
// and small ring cards. It never names a family. See docs/bead-ring.md.
import {esc} from './expansion-controls.js';

// A ring is a string with one letter per bead: position 0 is at the top and
// positions run clockwise. '.' is an unpainted bead.
export const COLOURS = ['A', 'B', 'C'];
export const COLOUR_NAMES = {A: 'green', B: 'gold', C: 'blue', '.': 'empty'};
export const EMPTY = '.';
const mod = (a, n) => ((a % n) + n) % n;

export const complete = word => word.length > 0 && !word.includes(EMPTY);
export const validWord = (word, n, colours) => typeof word === 'string' && word.length === n && [...word].every(c => c === EMPTY || COLOURS.slice(0, colours).includes(c));
export const blank = n => EMPTY.repeat(n);
export const tally = word => Object.fromEntries(COLOURS.map(c => [c, [...word].filter(x => x === c).length]));
export const coloursUsed = word => new Set([...word].filter(c => c !== EMPTY)).size;

// Motions. A turn by k moves the bead at position i to i + k. A flip with
// number k moves it to k − i: its mirror line passes through position k / 2
// (through a bead when k is even, between two beads when k is odd). A ring of
// n beads has n − 1 turns and n flips besides staying still.
export function turn(word, k) {
  const n = word.length, out = Array(n);
  for (let i = 0; i < n; i++) out[mod(i + k, n)] = word[i];
  return out.join('');
}
export function flip(word, k) {
  const n = word.length, out = Array(n);
  for (let i = 0; i < n; i++) out[mod(k - i, n)] = word[i];
  return out.join('');
}
export const motions = n => [...Array.from({length: n - 1}, (_, i) => ({kind: 'turn', k: i + 1})), ...Array.from({length: n}, (_, k) => ({kind: 'flip', k}))];
export const apply = (word, m) => m.kind === 'turn' ? turn(word, m.k) : flip(word, m.k);
// The motions other than staying still that leave the ring looking the same.
export const hiddenMotions = word => motions(word.length).filter(m => apply(word, m) === word);
export const matchingFlips = word => hiddenMotions(word).filter(m => m.kind === 'flip').length;
// A ring that no turn or flip matches: a distinguishing colouring of the cycle.
export const lopsided = word => complete(word) && !hiddenMotions(word).length;
// The fewest turns that bring the ring back: also the number of different
// readouts from the n starting places. It always divides n.
export function period(word) {
  for (let d = 1; d <= word.length; d++) if (turn(word, d) === word) return d;
  return word.length;
}

// Rings up to symmetry: a necklace is a ring up to turns, a bracelet up to
// turns and flips. The key is the smallest spelling in the class.
export const necklace = word => Array.from({length: word.length}, (_, k) => turn(word, k)).sort()[0];
export const bracelet = word => [necklace(word), necklace(flip(word, 0))].sort()[0];
export const ringKey = (word, flips = false) => flips ? bracelet(word) : necklace(word);
// The motion that carries `from` onto `to` (turns first, fewest steps), or
// null. {kind: 'turn', k: 0} means they already look the same.
export function motionBetween(from, to, flips = false) {
  if (from.length !== to.length) return null;
  for (let k = 0; k < from.length; k++) if (turn(from, k) === to) return {kind: 'turn', k};
  if (flips) for (let k = 0; k < from.length; k++) if (flip(from, k) === to) return {kind: 'flip', k};
  return null;
}

// Neighbours, including the closing pair, that share a colour: the position i
// of each pair (i, i + 1).
export function clashes(word) {
  const n = word.length, out = [];
  for (let i = 0; i < n; i++) if (word[i] !== EMPTY && word[i] === word[(i + 1) % n]) out.push(i);
  return out;
}
// The n windows of k beads read clockwise from each position, crossing the
// closing gap.
export const windows = (word, k) => Array.from({length: word.length}, (_, i) => Array.from({length: k}, (_, j) => word[(i + j) % word.length]).join(''));
export const allWords = (n, colours) => {
  let out = [''];
  for (let i = 0; i < n; i++) out = out.flatMap(w => COLOURS.slice(0, colours).map(c => w + c));
  return out;
};
// The classes of complete rings that pass `test`, by key, in order.
export function ringClasses(n, colours, test = () => true, flips = false) {
  const keys = new Set();
  for (const word of allWords(n, colours)) if (test(word)) keys.add(ringKey(word, flips));
  return [...keys].sort();
}

// The copy. Its position is {flips, turns}: how many times it has been
// flipped over its upright mirror line, then how many single turns clockwise
// it has made on top of that, both counted without wrapping so the drawing
// can animate the shorter way. The copy of bead i lies over position
// copyTarget(n, pos, i).
export const HOME = {flips: 0, turns: 0};
export const validCopy = pos => pos !== null && typeof pos === 'object' && Number.isInteger(pos.flips) && Number.isInteger(pos.turns);
export const copyTarget = (n, pos, i) => pos.flips % 2 ? mod(-(i + pos.turns), n) : mod(i + pos.turns, n);
export const copyAtHome = (n, pos) => pos.flips % 2 === 0 && mod(pos.turns, n) === 0;
// The motion the copy has made, as a turn or a flip of the ring.
export const copyMotion = (n, pos) => pos.flips % 2 ? {kind: 'flip', k: mod(-pos.turns, n)} : {kind: 'turn', k: mod(pos.turns, n)};
// What the copy shows over each position.
export const copyWord = (word, pos) => apply(word, copyMotion(word.length, pos));
// Turning the copy clockwise one step, and flipping it over the upright line:
// a flip reverses the direction its turns are counted in.
export const turnCopy = (pos, steps = 1) => ({flips: pos.flips, turns: pos.turns + (pos.flips % 2 ? -steps : steps)});
export const flipCopy = pos => ({flips: pos.flips + 1, turns: pos.turns});
export const copyTransform = (n, pos) => `rotateY(${pos.flips * 180}deg) rotate(${(pos.turns * 360 / n).toFixed(3)}deg)`;

// Geometry, in a 100 × 100 box: bead i sits at angle 360 i / n clockwise from
// the top. Bead size shrinks as the ring fills.
export const RING_R = 37;
export const point = (n, i, r = RING_R) => { const a = 2 * Math.PI * i / n; return [50 + r * Math.sin(a), 50 - r * Math.cos(a)]; };
export const beadSize = n => Math.min(21, 2 * RING_R * Math.sin(Math.PI / n) * 0.74);
const f = x => Number(x.toFixed(2));
const at = (n, i) => { const [x, y] = point(n, i); return `left:${f(x)}%;top:${f(y)}%`; };
export const colourName = c => COLOUR_NAMES[c] || 'empty';
export const describeRing = word => [...word].map(colourName).join(', ');

// A small ring card: the string, then the beads, in a group that showMatch
// can turn.
export function miniRing(word, {label = describeRing(word), cls = ''} = {}) {
  const n = word.length, r = Math.min(9, beadSize(n) / 2 + 1.5);
  const beads = [...word].map((c, i) => { const [x, y] = point(n, i); return `<circle class="br-c-${c === EMPTY ? 'empty' : c}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`; }).join('');
  return `<svg class="br-mini ${cls}" viewBox="-2 -2 104 104" role="img" aria-label="${esc(label)}"><circle class="br-mini-string" cx="50" cy="50" r="${RING_R}"/><g class="br-mini-beads">${beads}</g></svg>`;
}
// A strip of beads read left to right, for windows.
export function beadStrip(word, {label = describeRing(word), cls = ''} = {}) {
  return `<span class="br-strip ${cls}" role="img" aria-label="${esc(label)}">${[...word].map(c => `<i class="br-c-${c === EMPTY ? 'empty' : c}"></i>`).join('')}</span>`;
}

// The main ring. `opts.bead(i)` returns {move, label, cls}: a bead with a
// move is a button that sends it (data-action="expansion-move"); one without
// is a picture. `opts.copy` is the copy's position, or null to hide it.
// `opts.arcs` lists [i, cls] string pieces between beads i and i + 1 to mark
// (a clash, a window). `opts.clockwise` draws the reading direction. Beads
// whose copy matches get `match` once the copy has settled; the ring gets
// `br-all` when the copy is away from home and matches everywhere.
export function ringBoard(word, opts = {}) {
  const n = word.length, bead = opts.bead || (() => ({})), pos = opts.copy || null, size = beadSize(n);
  const away = pos && !copyAtHome(n, pos), shown = pos ? copyWord(word, pos) : null;
  const all = away && complete(word) && shown === word;
  const arc = (i, cls) => {
    const [x1, y1] = point(n, i), [x2, y2] = point(n, i + 1);
    return `<path class="br-arc ${cls}" d="M${f(x1)} ${f(y1)} A${RING_R} ${RING_R} 0 0 1 ${f(x2)} ${f(y2)}"/>`;
  };
  const arrow = opts.clockwise ? '<path class="br-way" d="M43 31 A20 20 0 0 1 69 44"/><path class="br-way-head" d="M71.5 39.5 L69.6 46.5 L63.6 42.6 Z"/>' : '';
  const string = `<svg class="br-string" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${RING_R}"/>${(opts.arcs || []).map(([i, cls]) => arc(i, cls)).join('')}${arrow}</svg>`;
  const beads = [...word].map((c, i) => {
    const look = bead(i) || {}, colour = c === EMPTY ? 'empty' : c;
    const match = away && shown[i] !== EMPTY && shown[i] === c ? ' match' : '';
    const cls = `br-bead br-c-${colour}${match}${look.cls ? ` ${look.cls}` : ''}`, label = esc(look.label || `Bead ${i + 1}: ${colourName(c)}`);
    if (look.move) return `<button type="button" class="${cls}" style="${at(n, i)}" data-action="expansion-move" data-move="${esc(JSON.stringify(look.move))}" data-focus="br-bead-${i}" data-bead="${i}" aria-label="${label}"></button>`;
    return `<span class="${cls}" style="${at(n, i)}" data-bead="${i}" role="img" aria-label="${label}"></span>`;
  }).join('');
  const copy = pos ? `<div class="br-copy${away ? '' : ' home'}" style="transform:${copyTransform(n, pos)}" data-copy="${esc(JSON.stringify(pos))}" aria-hidden="true">${[...word].map((c, i) => `<i class="br-c-${c === EMPTY ? 'empty' : c}" style="${at(n, i)}"></i>`).join('')}</div>` : '';
  const label = opts.label || 'Ring of beads';
  return `<div class="br-ring${all ? ' br-all' : ''}${opts.cls ? ` ${opts.cls}` : ''}" style="--bead:${f(size)}%" role="group" aria-label="${esc(label)}">${string}${beads}${copy}</div>`;
}

// Motion for the copy: called from a family's wire hook with the copy's
// position before and after a change. Match marks wait until it lands.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function animateCopy(root, n, before, after) {
  const ring = root.querySelector('.br-ring'), layer = ring?.querySelector('.br-copy');
  if (!layer) return;
  if (!before || !after || reduced() || (before.flips === after.flips && before.turns === after.turns)) { ring.classList.add('settled'); return; }
  // A copy coming home stays in sight until it lands, then fades.
  const home = layer.classList.contains('home');
  ring.classList.remove('settled');
  layer.classList.remove('home');
  const run = layer.animate([{transform: copyTransform(n, before)}, {transform: copyTransform(n, after)}], {duration: before.flips !== after.flips ? 520 : 360, easing: 'ease-in-out'});
  const land = () => { ring.classList.add('settled'); if (home) layer.classList.add('home'); };
  run.onfinish = land;
  run.oncancel = land;
}
// Turns a ring card's beads to show the motion that carries it onto another
// ring (motionBetween(card, other)): a turn, or a flip and then a turn.
export function showMatch(card, n, motion) {
  const group = card?.querySelector('.br-mini-beads');
  if (!group || !motion || reduced()) return;
  const end = motion.kind === 'flip' ? `rotate(${(motion.k * 360 / n).toFixed(3)}deg) scaleX(-1)` : `rotate(${(motion.k * 360 / n).toFixed(3)}deg)`;
  group.animate([{transform: 'none'}, {transform: end, offset: .7}, {transform: end}], {duration: 1100, easing: 'ease-in-out'});
}
