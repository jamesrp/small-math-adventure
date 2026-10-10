// Lamplighter (worksheet Week 66, "Lamplighter streets"), a group in Lantern
// Wires. A lamplighter stands at one lantern of a street, a ring or a grid.
// One move walks to a neighbouring lantern or lights or puts out the lantern
// underfoot. A state is where the lamplighter stands and which lanterns are
// lit. To turn lit set S into T and walk from p to q, every lantern in the
// difference D = S △ T needs an odd number of flips, so at least one, and the
// lamplighter must stand at each; extra flips never shorten the walk. So the
// fewest moves is |D| plus the shortest walk from p that visits every lantern
// of D and ends at q. On a street with a = min D and b = max D that walk is
// min(|p − a| + (b − a) + |b − q|, |p − b| + (b − a) + |a − q|): the only
// choice is which end to visit first. On a ring the walk may go either way
// round; on a grid it is a short tour through D with Manhattan distances.
// This is the word metric of the lamplighter group Z₂ ≀ Z (and Z₂ ≀ Z_n,
// Z₂ ≀ Z²). Its oddity is dead ends: from the dark street with the
// lamplighter home, the state "home, lanterns −1, 0 and 1 lit" takes 7 moves,
// and every move from it gives a state that takes 6.
//
// The save is the move word: L and R walk left and right (on the ring,
// anticlockwise and clockwise), U and D walk up and down on a grid, and F
// lights or puts out the lantern underfoot. Everything shown is replayed from
// it. A move is a tap on a lantern, {lantern: k}: the one underfoot flips, a
// neighbour is walked to, and any other is refused.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const signed = n => n < 0 ? `−${-n}` : String(n);
const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// The board: lanterns 0 … n − 1, the letters that walk between them, how a
// position in the pack names a lantern, and where each lantern is drawn.
const boards = new WeakMap();
export function boardOf(q) {
  if (boards.has(q)) return boards.get(q);
  let g;
  if (q.geometry === 'street') {
    const n = q.max - q.min + 1;
    g = {n, letters: 'LRF', walk: {L: k => k > 0 ? k - 1 : null, R: k => k < n - 1 ? k + 1 : null},
      index: pos => Number.isInteger(pos) && pos >= q.min && pos <= q.max ? pos - q.min : -1, pos: k => q.min + k,
      name: k => `lantern ${signed(q.min + k)}`, short: k => signed(q.min + k)};
  } else if (q.geometry === 'ring') {
    const n = q.size;
    g = {n, letters: 'LRF', walk: {L: k => (k + n - 1) % n, R: k => (k + 1) % n},
      index: pos => Number.isInteger(pos) && pos >= 0 && pos < n ? pos : -1, pos: k => k,
      name: k => `lantern ${k}`, short: k => String(k)};
  } else {
    const {rows, cols} = q, n = rows * cols;
    g = {n, letters: 'UDLRF', walk: {U: k => k >= cols ? k - cols : null, D: k => k < n - cols ? k + cols : null, L: k => k % cols ? k - 1 : null, R: k => k % cols < cols - 1 ? k + 1 : null},
      index: pos => Array.isArray(pos) && pos.length === 2 && pos.every(Number.isInteger) && pos[0] >= 0 && pos[0] < rows && pos[1] >= 0 && pos[1] < cols ? pos[0] * cols + pos[1] : -1,
      pos: k => [Math.floor(k / cols), k % cols],
      name: k => `lantern in row ${Math.floor(k / cols) + 1}, column ${k % cols + 1}`, short: k => `row ${Math.floor(k / cols) + 1} column ${k % cols + 1}`};
  }
  boards.set(q, g);
  return g;
}
const maskOf = (g, lit) => lit.reduce((m, pos) => m | 1 << g.index(pos), 0);
export const startOf = q => { const g = boardOf(q); return {at: g.index(q.start.at), lit: maskOf(g, q.start.lit)}; };
export const goalOf = q => { const g = boardOf(q); return {at: g.index(q.goal.at), lit: maskOf(g, q.goal.lit)}; };
export const litList = (g, mask) => Array.from({length: g.n}, (_, k) => k).filter(k => mask >> k & 1);
export const sameState = (a, b) => a.at === b.at && a.lit === b.lit;

// One letter from a state, or null when it walks off the board.
export function step(g, s, letter) {
  if (letter === 'F') return {at: s.at, lit: s.lit ^ 1 << s.at};
  const walk = g.walk[letter], k = walk ? walk(s.at) : null;
  return k === null ? null : {at: k, lit: s.lit};
}
// The letter that takes the lamplighter from `at` to lantern k: F for the
// lantern underfoot, a walk for a neighbour, null for any other.
export function letterTo(g, at, k) {
  if (k === at) return 'F';
  return [...g.letters].find(c => c !== 'F' && g.walk[c](at) === k) || null;
}
// Replays a word from the puzzle's start; null if a letter is unknown or walks
// off the board.
export function replay(q, word) {
  const g = boardOf(q);
  let s = startOf(q);
  for (const c of word) {
    if (!g.letters.includes(c)) return null;
    s = step(g, s, c);
    if (!s) return null;
  }
  return s;
}

// Fewest moves from every state to the goal, by breadth-first search from the
// goal (every move is undone by a move: L and R, U and D, F and F). A state is
// coded at · 2^n + lit.
const tables = new Map();
export function distances(q) {
  const key = JSON.stringify([q.geometry, q.min, q.max, q.size, q.rows, q.cols, q.goal]);
  if (tables.has(key)) return tables.get(key);
  const g = boardOf(q), size = 2 ** g.n, dist = new Int16Array(g.n * size).fill(-1), goal = goalOf(q);
  const queue = [goal.at * size + goal.lit];
  dist[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const code = queue[i], s = {at: Math.floor(code / size), lit: code % size};
    for (const c of g.letters) {
      const t = step(g, s, c);
      if (!t) continue;
      const next = t.at * size + t.lit;
      if (dist[next] < 0) { dist[next] = dist[code] + 1; queue.push(next); }
    }
  }
  const table = {size, get: s => dist[s.at * size + s.lit]};
  tables.set(key, table);
  return table;
}
export const fewestFrom = (q, s) => distances(q).get(s);
export const fewest = q => fewestFrom(q, startOf(q));
// A shortest word from s to the goal: flips first, then walks in the order
// of the board's letters.
export function shortestWord(q, s) {
  const g = boardOf(q), table = distances(q);
  let word = '';
  for (let d = table.get(s); d > 0; d--) {
    const c = ['F', ...g.letters.replace('F', '')].find(x => { const t = step(g, s, x); return t && table.get(t) === d - 1; });
    word += c;
    s = step(g, s, c);
  }
  return word;
}

// The save: the move word, at most the budget, replaying on the board.
const budgetOf = p => p.parameters.budget;
function valid(p, b) {
  if (!object(b) || Object.keys(b).join() !== 'word' || typeof b.word !== 'string' || b.word.length > budgetOf(p)) return false;
  const q = p.parameters, g = boardOf(q), goal = goalOf(q);
  let s = startOf(q);
  for (const c of b.word) {
    // Nothing follows a solve.
    if (sameState(s, goal) || !g.letters.includes(c)) return false;
    s = step(g, s, c);
    if (!s) return false;
  }
  return true;
}
const solved = (p, b) => valid(p, b) && sameState(replay(p.parameters, b.word), goalOf(p.parameters));
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action) || b.word.length >= budgetOf(p)) return null;
  const q = p.parameters, g = boardOf(q), k = action.lantern;
  if (!Number.isInteger(k) || k < 0 || k >= g.n) return null;
  const letter = letterTo(g, replay(q, b.word).at, k);
  return letter ? {word: b.word + letter} : null;
}

// Words for a move, used by hints, the move record and screen readers.
const WALKS = {street: {L: 'Walk left', R: 'Walk right'}, ring: {L: 'Walk anticlockwise', R: 'Walk clockwise'}, grid: {U: 'Walk up', D: 'Walk down', L: 'Walk left', R: 'Walk right'}};
export const moveWords = (q, s, letter) => letter === 'F' ? (s.lit >> s.at & 1 ? 'Put out this lantern' : 'Light this lantern') : WALKS[q.geometry][letter];

// Hints: the next move of a shortest finish within the moves left, the
// lantern underfoot first; Undo when no finish fits.
function plan(p, b) {
  const q = p.parameters, g = boardOf(q), s = replay(q, b.word), left = budgetOf(p) - b.word.length, d = fewestFrom(q, s);
  if (d < 0 || d > left) return {type: 'deadend', text: b.word.length ? 'Too few moves are left. Undo.' : 'Restart.'};
  const letter = shortestWord(q, s)[0], t = step(g, s, letter);
  return {type: 'move', action: {lantern: t.at}, remaining: d, text: `${moveWords(q, s, letter)}.`};
}
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return plan(p, b);
}

// Drawing. Lanterns are the Lantern Wires lanterns (sun with rays when lit,
// dotted when dark), joined by the street lines they stand on. The
// lamplighter, a small pine figure with a pole, stands just below its lantern
// so the lantern stays visible, and a pine ring marks that lantern; faint
// rings mark the lanterns it can walk to.
// The goal card is a smaller copy with a ghost lamplighter.
export function layoutOf(q, goal = false) {
  const g = boardOf(q), TALL = 36;
  if (q.geometry === 'street') {
    const r = goal ? 9 : 14, y = goal ? 15 : 24, scale = goal ? .8 : 1, feet = y + r + 2 + TALL * scale;
    return {width: 40 * g.n, height: goal ? feet + 4 : feet + 27, r, scale, xy: Array.from({length: g.n}, (_, k) => [20 + 40 * k, y]), feet: () => feet, numerals: !goal};
  }
  if (q.geometry === 'ring') {
    const R = 106, cx = 150, cy = 136, r = 17;
    const xy = Array.from({length: g.n}, (_, k) => [cx + R * Math.sin(2 * Math.PI * k / g.n), cy - R * Math.cos(2 * Math.PI * k / g.n)].map(v => Math.round(v * 10) / 10));
    return {width: 300, height: cy + R + r + 2 + TALL + 4, r, scale: 1, xy, feet: k => xy[k][1] + r + 2 + TALL, ring: {cx, cy, R}};
  }
  const r = 16, gap = 92, xy = Array.from({length: g.n}, (_, k) => [42 + 84 * (k % q.cols), 26 + gap * Math.floor(k / q.cols)]);
  return {width: 84 * q.cols, height: 26 + gap * (q.rows - 1) + r + 2 + TALL + 5, r, scale: 1, xy, feet: k => xy[k][1] + r + 2 + TALL};
}
const n1 = v => Math.round(v * 10) / 10;
function streets(q, L) {
  if (q.geometry === 'street') return `<line class="ll-road" x1="${L.xy[0][0]}" y1="${L.xy[0][1]}" x2="${L.xy.at(-1)[0]}" y2="${L.xy[0][1]}"/>`;
  if (q.geometry === 'ring') return `<circle class="ll-road" cx="${L.ring.cx}" cy="${L.ring.cy}" r="${L.ring.R}"/>`;
  const g = boardOf(q), out = [];
  for (let k = 0; k < g.n; k++) for (const c of ['R', 'D']) { const j = g.walk[c](k); if (j !== null) out.push(`<line class="ll-road" x1="${L.xy[k][0]}" y1="${L.xy[k][1]}" x2="${L.xy[j][0]}" y2="${L.xy[j][1]}"/>`); }
  return out.join('');
}
function lantern([x, y], r, lit, extra = '') {
  const ray = r + 4, len = r > 10 ? 5 : 3.5;
  return `<g class="lantern${lit ? ' lit' : ''}${extra}"><circle cx="${x}" cy="${y}" r="${r}"/>${lit ? `<path class="lamp-rays" d="M${x - ray} ${y}h${-len}M${x + ray} ${y}h${len}M${x} ${y - ray}v${-len}M${x} ${y + ray}v${len}"/>` : ''}</g>`;
}
// The lamplighter, feet at (x, y), 30 units tall at scale 1: a cap, a head, a
// coat and a pole held up to the lantern above.
function figure(x, y, scale, cls) {
  return `<g transform="translate(${n1(x)} ${n1(y)})"><g class="${cls}"><g transform="scale(${scale})"><path class="ll-pole" d="M8.5 -13V-36"/><path class="ll-coat" d="M-8 0-6 -18.5Q0 -22 6 -18.5L8 0Z"/><path class="ll-arm" d="M3.5 -17 8.5 -13"/><circle class="ll-head" cx="0" cy="-25.5" r="5.2"/><path class="ll-cap" d="M-6.5 -30h13M-4 -30v-4h8v4"/></g></g></g>`;
}
// A pine ring round the lantern the lamplighter stands at (dashed on the
// goal card), a faint one round each lantern it can walk to, and an ochre
// one round the lantern a hint names.
const halo = ([x, y], r, cls) => `<circle class="ll-halo${cls}" cx="${x}" cy="${y}" r="${r + (cls === ' ghost' ? 3.5 : 5)}"/>`;
function picture(q, s, {goal = false, walkable = [], hinted = null} = {}) {
  const g = boardOf(q), L = layoutOf(q, goal), feet = L.feet;
  const lamps = L.xy.map((xy, k) => lantern(xy, L.r, s.lit >> k & 1, k === s.at && !goal ? ' here' : '')).join('');
  const marks = walkable.map(k => halo(L.xy[k], L.r, ' next')).join('') + (hinted === null ? '' : halo(L.xy[hinted], L.r + 3, ' hint'));
  // Home, lantern 0 on the street: a small house round its numeral.
  const home = L.numerals && g.index(0) >= 0 ? `<path class="ll-home" d="M${L.xy[g.index(0)][0] - 10} ${n1(L.height - 3)}v-13l10-7 10 7v13z"/>` : '';
  const numerals = L.numerals ? L.xy.map(([x], k) => `<text class="ll-numeral" x="${x}" y="${L.height - 6}">${signed(g.pos(k))}</text>`).join('') : '';
  const who = figure(L.xy[s.at][0], feet(s.at), L.scale, goal ? 'll-lamplighter ghost' : 'll-lamplighter');
  return `<svg class="ll-picture" viewBox="0 0 ${L.width} ${n1(L.height)}" aria-hidden="true">${streets(q, L)}${marks}${home}${numerals}${halo(L.xy[s.at], L.r, goal ? ' ghost' : '')}${lamps}${who}</svg>`;
}
// Where each lantern's button sits over the picture, as percentages: the
// lantern and the spot below it where the lamplighter stands.
function hitBox(q, L, k) {
  const [x, y] = L.xy[k], top = q.geometry === 'street' ? 0 : y - L.r - 5, bottom = q.geometry === 'street' ? L.feet(k) + 5 : L.feet(k) + 3;
  const w = q.geometry === 'street' ? 40 : 54;
  const pc = (v, of) => `${n1(v / of * 100)}%`;
  return `left:${pc(x - w / 2, L.width)};top:${pc(top, L.height)};width:${pc(w, L.width)};height:${pc(bottom - top, L.height)}`;
}
const MOVE_GLYPH = {
  L: '<path d="M16 10H4m4.5-4.5L4 10l4.5 4.5"/>', R: '<path d="M4 10h12m-4.5-4.5L16 10l-4.5 4.5"/>',
  U: '<path d="M10 16V4M5.5 8.5 10 4l4.5 4.5"/>', D: '<path d="M10 4v12m-4.5-4.5L10 16l4.5-4.5"/>',
  // On the ring: a turn arrow, anticlockwise or clockwise.
  A: '<path d="M15.5 12.5A6 6 0 1 0 5 13"/><path d="M2.5 9.5 5 13l3.5-2.5"/>', C: '<path d="M4.5 12.5A6 6 0 1 1 15 13"/><path d="M17.5 9.5 15 13l-3.5-2.5"/>'
};
function moveGlyph(q, letter, lit) {
  if (letter === 'F') return `<svg viewBox="0 0 20 20" class="ll-glyph" aria-hidden="true"><g class="lantern${lit ? ' lit' : ''}"><circle cx="10" cy="10" r="5"/>${lit ? '<path class="lamp-rays" d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2"/>' : ''}</g></svg>`;
  const key = q.geometry === 'ring' ? {L: 'A', R: 'C'}[letter] : letter;
  return `<svg viewBox="0 0 20 20" class="ll-glyph walk" aria-hidden="true">${MOVE_GLYPH[key]}</svg>`;
}
function record(q, word, budget) {
  const g = boardOf(q);
  let s = startOf(q);
  const played = [...word].map(c => {
    const before = s;
    s = step(g, s, c);
    const lit = c === 'F' && (s.lit >> s.at & 1);
    const words = c === 'F' ? `${lit ? 'Lit' : 'Put out'} ${g.name(before.at)}` : moveWords(q, before, c);
    return `<li class="ll-move${c === 'F' ? ' flip' : ''}"><span class="sr-only">${esc(words)}</span>${moveGlyph(q, c, lit)}</li>`;
  }).join('');
  return `<ol class="ll-moves" aria-label="Moves">${played}${'<li class="ll-slot" aria-hidden="true"></li>'.repeat(budget - word.length)}</ol>`;
}
const litWords = (q, g, mask) => {
  const lit = litList(g, mask).map(g.short);
  return lit.length ? `${lit.length > 1 ? 'lanterns' : 'lantern'} ${q.geometry === 'grid' ? 'at ' : ''}${list(lit)} lit` : 'every lantern dark';
};
const where = (g, k) => `the lamplighter at ${g.short(k)}`;
const GROUP = {street: q => `Street, lanterns ${signed(q.min)} to ${signed(q.max)}`, ring: q => `Ring of ${q.size} lanterns, numbered 0 to ${q.size - 1} clockwise from the top`, grid: q => `Grid of ${q.rows} rows and ${q.cols} columns of lanterns`};
function render(p, attempt) {
  const q = p.parameters, g = boardOf(q), b = attempt.board, s = replay(q, b.word), done = solved(p, b), budget = budgetOf(p), full = b.word.length >= budget;
  const live = !done && !full;
  const shown = attempt.hintLevel >= 2 && live ? plan(p, b) : null, hinted = shown?.type === 'move' ? shown.action.lantern : null;
  const walkable = live ? [...g.letters].filter(c => c !== 'F').map(c => g.walk[c](s.at)).filter(k => k !== null) : [];
  const L = layoutOf(q);
  const buttons = Array.from({length: g.n}, (_, k) => {
    const lit = s.lit >> k & 1, here = k === s.at, can = live && (here || walkable.includes(k));
    const name = can ? (here ? `${lit ? 'Put out' : 'Light'} ${g.name(k)}` : `Walk to ${g.name(k)}${lit ? ', lit' : ''}`) : `${g.name(k)[0].toUpperCase()}${g.name(k).slice(1)}${lit ? ', lit' : ''}${here ? ', the lamplighter here' : ''}`;
    const attrs = can ? `data-action="expansion-move" data-move="${esc(JSON.stringify({lantern: k}))}"` : 'aria-disabled="true" tabindex="-1"';
    return `<button type="button" class="ll-lamp${here ? ' here' : ''}${k === hinted ? ' hinted' : ''}" style="${hitBox(q, L, k)}" data-ll="${k}" data-focus="ll-${k}" aria-label="${esc(name)}" ${attrs}></button>`;
  }).join('');
  const goal = goalOf(q);
  const goalWords = `Goal: ${litWords(q, g, goal.lit)}; ${where(g, goal.at)}.`, now = litWords(q, g, s.lit);
  const status = `${now[0].toUpperCase()}${now.slice(1)}; ${where(g, s.at)}. ${budget - b.word.length} of ${budget} moves left.`;
  return `<div class="ll-board ll-${q.geometry}${done ? ' solved' : ''}" style="--ll-width:${L.width}" data-mechanic-wire="lamplighter">
<figure class="ll-goal" role="img" aria-label="${esc(goalWords)}">${picture(q, goal, {goal: true})}</figure>
<div class="ll-yard"><div class="ll-stage">${picture(q, s, {walkable, hinted})}<div class="ll-hits" role="group" aria-label="${esc(GROUP[q.geometry](q))}">${buttons}</div></div></div>
${record(q, b.word, budget)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Arrow keys walk (on the ring, left is anticlockwise and right clockwise);
// Enter or Space on a lantern taps it. Focus follows the lamplighter. A walk
// just made glides from the lantern before; a lantern just lit glows on.
const KEYS = {ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D'};
let seen = null;
function wire(root, p, api) {
  const q = p.parameters, g = boardOf(q);
  root.addEventListener('keydown', e => {
    const letter = KEYS[e.key];
    if (!letter || !g.letters.includes(letter) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const b = api.attempt().board, s = replay(q, b.word), t = s && step(g, s, letter);
    if (!t || solved(p, b) || b.word.length >= budgetOf(p)) return;
    api.apply({lantern: t.at});
    document.querySelector('.ll-board .ll-lamp.here:not([aria-disabled])')?.focus({preventScroll: true});
  });
  const word = api.attempt().board.word, last = seen;
  seen = {id: p.id, word};
  if (!last || last.id !== p.id || word.length !== last.word.length + 1 || !word.startsWith(last.word) || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const letter = word.at(-1), s = replay(q, word);
  if (letter === 'F') { if (s.lit >> s.at & 1) root.querySelector('.ll-yard .lantern.here')?.classList.add('fresh'); return; }
  const before = replay(q, last.word).at, L = layoutOf(q), dx = L.xy[before][0] - L.xy[s.at][0], dy = L.feet(before) - L.feet(s.at);
  root.querySelector('.ll-yard .ll-lamplighter')?.animate?.([{transform: `translate(${dx}px,${dy}px)`}, {transform: 'none'}], {duration: 260, easing: 'ease-out'});
}

export const lamplighterMechanics = {
  lamplighter: {
    fresh: () => ({word: ''}),
    valid,
    solved,
    move,
    hint,
    render,
    wire
  }
};

// The family seam entry (dist/families.js). The puzzles join Lantern Wires as
// its Lamplighter group, so the module adds no satchel family.
export default {
  id: 'lamplighter',
  mechanics: lamplighterMechanics,
  pack: new URL('./lamplighter.json', import.meta.url).href,
  css: new URL('./lamplighter.css', import.meta.url).href,
  // When the lantern used goes grey (the last move), focus moves to Undo.
  focus: '.ll-lamp.here:not([aria-disabled]),.play-layout:has(.ll-board) [data-action="undo"]:not(:disabled)'
};
