// Bead rings (worksheet Weeks 33 and 34). A ring of n beads, each one of a
// few colours, stays face up; turning it does not make a new ring.
//
// Necklaces (Week 33): the number of different rings a ring shows as it turns
// is the fewest turns that bring it back, and that number divides n. So at a
// prime length p every ring with two colours or more shows p different
// readouts, the c^p − c mixed readouts fall into families of p, and p divides
// c^p − c (Fermat's little theorem, by counting).
//
// Hidden turns (Week 34): a ring is lopsided when no turn or flip other than
// staying still makes it look the same (a distinguishing colouring of the
// cycle). Three, four and five beads need three colours; from six beads on,
// two colours are enough, and then the less common colour needs three beads.
import {esc} from '../../expansion-controls.js';
import {
  COLOURS, EMPTY, complete, validWord, blank, tally, coloursUsed, turn, flip, matchingFlips, lopsided, period,
  ringKey, motionBetween, clashes, windows, allWords, ringClasses, HOME, validCopy, copyAtHome, copyMotion,
  copyWord, turnCopy, flipCopy, ringBoard, miniRing, beadStrip, animateCopy, showMatch, colourName, describeRing
} from '../../bead-ring.js';

export const PLAY_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 12];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const flag = value => typeof value === 'boolean';
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const unique = list => new Set(list).size === list.length;
const mod = (a, n) => ((a % n) + n) % n;

// ------------------------------------------------------------------ goals
// What a ring must be for a puzzle. Every test is unchanged by turning the
// ring (and by flipping it in Hidden turns), so it holds for a whole class.
export function fits(p, word) {
  const q = p.parameters;
  if (!complete(word) || word.length !== q.n) return false;
  if (q.counts && Object.entries(q.counts).some(([c, k]) => tally(word)[c] !== k)) return false;
  if (q.mixed && coloursUsed(word) < 2) return false;
  if (q.apart && clashes(word).length) return false;
  if (q.windows && new Set(windows(word, q.windows)).size !== word.length) return false;
  if (q.period && period(word) !== q.period) return false;
  if (q.sooner && period(word) >= word.length) return false;
  if (p.mechanic === 'lopsided') return q.flips === undefined ? lopsided(word) : matchingFlips(word) === q.flips;
  return true;
}
// Rings in Hidden turns count as the same after a turn or a flip.
const flipsCount = p => p.mechanic === 'lopsided';
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
// Every class of rings that fits, by key.
export const answers = p => cached(`answers|${p.id}|${JSON.stringify(p.parameters)}`, () => ringClasses(p.parameters.n, p.parameters.colours, w => fits(p, w), flipsCount(p)));
// Fewest puzzles measure a ring by its colours or by its gold beads, and ask
// for a lopsided ring with the smallest measure and a claim one below it.
export const measure = (p, word) => p.parameters.fewest === 'colours' ? coloursUsed(word) : tally(word)[p.parameters.fewest];
const measureName = (p, m) => p.parameters.fewest === 'colours' ? plural(m, 'colour') : `${m} ${colourName(p.parameters.fewest)}`;
export const fewestOf = p => cached(`fewest|${p.id}|${JSON.stringify(p.parameters)}`, () => Math.min(...allWords(p.parameters.n, p.parameters.colours).filter(lopsided).map(w => measure(p, w))));
const lopsidedAtMost = (p, m) => allWords(p.parameters.n, p.parameters.colours).some(w => lopsided(w) && measure(p, w) <= m);
const kind = p => p.parameters.mode === 'every' ? 'every' : p.parameters.fewest ? 'fewest' : 'make';
const usesCopy = p => p.mechanic === 'lopsided' || p.parameters.mode === 'playground' || Boolean(p.parameters.period || p.parameters.sooner);
const canFlip = p => p.mechanic === 'lopsided' || p.parameters.mode === 'playground';

// ------------------------------------------------------------------ boards
// every:  {ring, found, fresh, early, claimed}  fresh: the last move kept a ring
// make:   {ring, tried, claimed, wrong}      "No ring can" is a checked claim
// fewest: {ring, found, tried, claims, wrong} measures with a lopsided ring,
//          measures tried, measures truly claimed, a refused measure or null
function freshPuzzle(p) {
  const ring = blank(p.parameters.n);
  if (kind(p) === 'every') return {ring, found: [], fresh: false, early: false, claimed: false};
  if (kind(p) === 'fewest') return {ring, found: [], tried: [], claims: [], wrong: null};
  return {ring, tried: false, claimed: false, wrong: false};
}
const counted = list => Array.isArray(list) && list.every(Number.isInteger) && unique(list);
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b) || !validWord(b.ring, q.n, q.colours)) return false;
  if (kind(p) === 'every') {
    const all = answers(p);
    if (!Array.isArray(b.found) || !unique(b.found) || !b.found.every(key => all.includes(key))) return false;
    return flag(b.fresh) && flag(b.early) && flag(b.claimed) && (!b.claimed || b.found.length === all.length) && (!b.fresh || (b.found.at(-1) === ringKey(b.ring, flipsCount(p)) && complete(b.ring)));
  }
  if (kind(p) === 'fewest') {
    if (![b.found, b.tried, b.claims].every(counted) || !(b.wrong === null || Number.isInteger(b.wrong))) return false;
    if (complete(b.ring) && !b.tried.includes(measure(p, b.ring))) return false;
    if (!b.found.every(m => b.tried.includes(m) && lopsidedAtMost(p, m))) return false;
    if (!b.claims.every(m => b.tried.includes(m) && !lopsidedAtMost(p, m))) return false;
    return b.wrong === null || (b.tried.includes(b.wrong) && lopsidedAtMost(p, b.wrong));
  }
  if (![b.tried, b.claimed, b.wrong].every(flag) || (complete(b.ring) && !b.tried)) return false;
  const possible = answers(p).length > 0;
  return (!b.claimed || (!possible && b.tried)) && (!b.wrong || (possible && b.tried && !b.claimed));
}
function solvedPuzzle(p, b) {
  if (!validPuzzle(p, b)) return false;
  if (kind(p) === 'every') return b.claimed;
  if (kind(p) === 'fewest') { const least = fewestOf(p); return b.found.includes(least) && b.claims.includes(least - 1); }
  return b.claimed || fits(p, b.ring);
}
// After the ring changes: keep a new class in "every", note what was tried.
function settle(p, b) {
  const ring = b.ring;
  if (kind(p) === 'every') {
    const key = ringKey(ring, flipsCount(p)), fresh = fits(p, ring) && !b.found.includes(key);
    return fresh ? {...b, found: [...b.found, key], fresh} : {...b, fresh};
  }
  if (!complete(ring)) return b;
  if (kind(p) === 'fewest') {
    const m = measure(p, ring), tried = b.tried.includes(m) ? b.tried : [...b.tried, m].sort((x, y) => x - y);
    const found = lopsided(ring) && !b.found.includes(m) ? [...b.found, m].sort((x, y) => x - y) : b.found;
    return {...b, tried, found};
  }
  return b.tried ? b : {...b, tried: true};
}
const calm = (p, b) => kind(p) === 'every' ? {...b, early: false, fresh: false} : kind(p) === 'fewest' ? {...b, wrong: null} : {...b, wrong: false};
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, palette = COLOURS.slice(0, q.colours);
  if (action.type === 'paint') {
    const i = action.bead;
    if (!Number.isInteger(i) || i < 0 || i >= q.n) return null;
    const now = b.ring[i], next = action.colour === undefined ? palette[(palette.indexOf(now) + 1) % palette.length] : action.colour;
    if (!palette.includes(next) || next === now) return null;
    return settle(p, calm(p, {...b, ring: b.ring.slice(0, i) + next + b.ring.slice(i + 1)}));
  }
  if (action.type === 'clear') return b.ring === blank(q.n) ? null : calm(p, {...b, ring: blank(q.n)});
  if (action.type === 'done' && kind(p) === 'every') {
    if (!b.found.length) return null;
    return b.found.length === answers(p).length ? {...b, claimed: true, early: false, fresh: false} : {...b, early: true, fresh: false};
  }
  if (action.type === 'claim' && kind(p) === 'make') {
    if (!b.tried || b.wrong) return null;
    return answers(p).length ? {...b, wrong: true} : {...b, claimed: true};
  }
  if (action.type === 'claim' && kind(p) === 'fewest') {
    if (!complete(b.ring) || lopsided(b.ring)) return null;
    const m = measure(p, b.ring);
    if (b.claims.includes(m) || b.wrong === m) return null;
    return lopsidedAtMost(p, m) ? {...b, wrong: m} : {...b, claims: [...b.claims, m].sort((x, y) => x - y), wrong: null};
  }
  return null;
}

// Hints walk toward the nearest ring of a class not yet found, one bead at a
// time. Puzzles with a "No ring can" claim show the authored hints only, so
// a hint never says whether a ring exists.
function variants(key, flips) {
  const out = Array.from({length: key.length}, (_, k) => turn(key, k));
  if (flips) for (let k = 0; k < key.length; k++) out.push(flip(key, k));
  return out;
}
export function paintToward(ring, targets) {
  let best = null, gap = Infinity;
  for (const target of targets) {
    const d = [...target].filter((c, i) => c !== ring[i]).length;
    if (d < gap) { best = target; gap = d; }
  }
  if (!best || !gap) return null;
  const i = [...best].findIndex((c, j) => c !== ring[j]);
  return {bead: i, colour: best[i]};
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Start again to restore this ring.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  if (kind(p) !== 'every') return {type: 'note'};
  const open = answers(p).filter(key => !b.found.includes(key));
  if (!open.length) return {type: 'move', action: {type: 'done'}, text: 'Every ring is here.'};
  const step = paintToward(b.ring, open.flatMap(key => variants(key, flipsCount(p))));
  if (!step) return {type: 'deadend', text: 'Start again to restore this ring.'};
  return {type: 'move', action: {type: 'paint', ...step}, bead: step.bead, text: `Make the outlined bead ${colourName(step.colour)}.`};
}

// ------------------------------------------------------------------ playground
const freshPlay = (n = 6, colours = 2) => ({n, colours, ring: blank(n)});
const validPlay = b => object(b) && PLAY_SIZES.includes(b.n) && [2, 3].includes(b.colours) && validWord(b.ring, b.n, b.colours);
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  if (action.type === 'size') return PLAY_SIZES.includes(action.n) && action.n !== b.n ? freshPlay(action.n, b.colours) : null;
  if (action.type === 'colours') {
    if (![2, 3].includes(action.colours) || action.colours === b.colours) return null;
    return {...b, colours: action.colours, ring: b.ring.replace(/C/g, action.colours === 2 ? 'A' : 'C')};
  }
  if (action.type === 'clear') return b.ring === blank(b.n) ? null : {...b, ring: blank(b.n)};
  if (action.type === 'paint') {
    const i = action.bead, palette = COLOURS.slice(0, b.colours);
    if (!Number.isInteger(i) || i < 0 || i >= b.n) return null;
    const next = palette[(palette.indexOf(b.ring[i]) + 1) % palette.length];
    return {...b, ring: b.ring.slice(0, i) + next + b.ring.slice(i + 1)};
  }
  return null;
}

// ------------------------------------------------------------------ view state
// The copy's position is view state, outside the save: it stays put while the
// ring is repainted, so a child can paint until the copy matches or not.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {copy: {...HOME}}); return uiState.get(p.id); };
function uiChange(p, payload) {
  if (!object(payload) || !usesCopy(p)) return;
  const state = ui(p);
  if (payload.copy === 'turn') state.copy = turnCopy(state.copy);
  else if (payload.copy === 'flip' && canFlip(p)) state.copy = flipCopy(state.copy);
}

// ------------------------------------------------------------------ drawing
const button = (label, action, cls, extra = '') => `<button type="button" class="${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="bd-${esc(action.type)}" ${extra}>${label}</button>`;
const swatch = c => `<i class="bd-swatch br-c-${c}" aria-hidden="true"></i>`;
function countBadges(q, word) {
  const now = tally(word);
  return `<div class="bd-counts" role="group" aria-label="Beads of each colour">${Object.entries(q.counts).map(([c, k]) => {
    const state = now[c] === k ? 'exact' : now[c] > k ? 'over' : 'under';
    return `<span class="bd-count ${state}" role="img" aria-label="${esc(`${colourName(c)}: ${now[c]} of ${k}`)}">${swatch(c)}<b>${k}</b></span>`;
  }).join('')}</div>`;
}
// Window cards: every window the ring must show once. Green once, ochre more.
function windowCards(q, word) {
  const seen = complete(word) || word.includes(EMPTY) ? windows(word, q.windows).filter(w => !w.includes(EMPTY)) : [];
  return `<div class="bd-windows" role="group" aria-label="Windows">${allWords(q.windows, q.colours).map(w => {
    const k = seen.filter(x => x === w).length;
    return `<span class="bd-window ${k === 1 ? 'once' : k > 1 ? 'more' : ''}">${beadStrip(w, {label: `${describeRing(w)}: ${k === 0 ? 'not shown' : k === 1 ? 'shown once' : `shown ${k} times`}`})}</span>`;
  }).join('')}</div>`;
}
function copyTools(p, pos, n, flips) {
  const steps = pos.flips % 2 ? null : mod(pos.turns, n);
  const count = steps ? `<b class="bd-turns" aria-hidden="true">${steps}</b>` : '';
  const turnButton = `<button type="button" class="secondary bd-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({copy: 'turn'}))}" data-focus="bd-turn" aria-label="${esc(`Turn the copy${steps ? `. Turned ${plural(steps, 'step')}` : ''}`)}"><span aria-hidden="true">↻</span> Turn${count}</button>`;
  const flipButton = flips ? `<button type="button" class="secondary bd-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({copy: 'flip'}))}" data-focus="bd-flip" aria-label="Flip the copy"><span aria-hidden="true">⇋</span> Flip</button>` : '';
  return `<div class="bd-tools" role="group" aria-label="The copy">${turnButton}${flipButton}</div>`;
}
function copyStatus(word, pos) {
  const n = word.length;
  if (!pos || copyAtHome(n, pos)) return '';
  const shown = copyWord(word, pos), m = copyMotion(n, pos), agree = [...word].filter((c, i) => c !== EMPTY && c === shown[i]).length;
  const what = m.kind === 'turn' ? `The copy is turned ${plural(m.k, 'step')}` : 'The copy is flipped';
  return complete(word) && shown === word ? ` ${what} and matches every bead.` : ` ${what}; ${agree} of ${n} beads match.`;
}
function shelf(p, b, current) {
  if (!b.found.length) return '';
  const flips = flipsCount(p), key = complete(current) ? ringKey(current, flips) : null;
  return `<ol class="bd-found" aria-label="Rings found">${b.found.map(k => {
    const state = k === key ? (b.fresh ? 'fresh' : 'again') : '';
    const motion = state === 'again' ? ` data-match="${esc(JSON.stringify(motionBetween(k, current, flips)))}"` : '';
    return `<li class="${state}"${motion}>${miniRing(k)}</li>`;
  }).join('')}</ol>`;
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b), word = b.ring;
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null;
  const pos = usesCopy(p) ? ui(p).copy : null;
  const bead = i => ({move: solved ? null : {type: 'paint', bead: i}, cls: hint?.bead === i ? 'hinted' : '', label: `Bead ${i + 1}: ${colourName(word[i])}`});
  const arcs = q.apart ? clashes(word).map(i => [i, 'clash']) : [];
  const board = ringBoard(word, {bead, copy: pos, arcs, clockwise: Boolean(q.windows), label: `Ring of ${q.n} beads`});
  const top = `${q.counts ? countBadges(q, word) : ''}${q.windows ? windowCards(q, word) : ''}`;
  const tools = pos ? copyTools(p, pos, q.n, canFlip(p)) : '';
  let actions = '', message = '', record = '';
  const clear = word !== blank(q.n) && !solved ? button('Clear', {type: 'clear'}, 'secondary bd-clear') : '';
  if (kind(p) === 'every') {
    const done = b.found.length && !solved ? button('That’s all', {type: 'done'}, `primary bd-done${hint?.action?.type === 'done' ? ' hinted' : ''}`) : '';
    actions = clear + done;
    if (b.early) message = '<p class="bd-say" role="status">There is another.</p>';
  } else if (kind(p) === 'fewest') {
    const m = complete(word) ? measure(p, word) : null, claimable = m !== null && !lopsided(word) && !b.claims.includes(m) && b.wrong !== m;
    const claim = !solved && claimable ? button(`None with ${esc(measureName(p, m))}`, {type: 'claim'}, 'secondary bd-claim') : '';
    actions = clear + claim;
    if (b.wrong !== null) message = `<p class="bd-say" role="status">There is one with ${esc(measureName(p, b.wrong))}.</p>`;
    const marks = [...new Set([...b.found, ...b.claims])].sort((x, y) => x - y);
    record = marks.length ? `<ul class="bd-record" aria-label="Found and ruled out">${marks.map(k => `<li class="${b.found.includes(k) ? 'yes' : 'no'}" aria-label="${esc(`${measureName(p, k)}: ${b.found.includes(k) ? 'a ring works' : 'none works'}`)}"><span aria-hidden="true">${b.found.includes(k) ? '✓' : '✗'}</span> ${q.fewest === 'colours' ? `<b>${k}</b> <span class="bd-palette" aria-hidden="true">${COLOURS.slice(0, k).map(swatch).join('')}</span>` : `${swatch(q.fewest)}<b>${k}</b>`}</li>`).join('')}</ul>` : '';
  } else {
    const claim = !solved ? button('No ring can', {type: 'claim'}, 'secondary bd-claim', b.tried && !b.wrong ? '' : 'disabled') : '';
    actions = clear + claim;
    if (b.wrong) message = '<p class="bd-say" role="status">There is one.</p>';
  }
  const status = `${describeRing(word)}.${pos ? copyStatus(word, pos) : ''}`;
  return `<div class="beads-puzzle mode-${kind(p)}" data-mechanic-wire="beads">${top}${board}${tools}${record}${actions ? `<div class="bd-actions">${actions}</div>` : ''}${message}${kind(p) === 'every' ? shelf(p, b, word) : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

const sizeButton = (n, on) => `<button type="button" class="bd-size" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', n}))}" data-focus="bd-size-${n}" aria-pressed="${on}" aria-label="${n} beads">${n}</button>`;
function renderPlay(p, a) {
  const b = a.board, pos = ui(p).copy;
  const sizes = `<div class="bd-sizes" role="group" aria-label="Beads">${PLAY_SIZES.map(n => sizeButton(n, n === b.n)).join('')}</div>`;
  const palettes = `<div class="bd-palettes" role="group" aria-label="Colours">${[2, 3].map(c => `<button type="button" class="bd-palette-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'colours', colours: c}))}" data-focus="bd-colours-${c}" aria-pressed="${c === b.colours}" aria-label="${c} colours">${COLOURS.slice(0, c).map(swatch).join('')}</button>`).join('')}</div>`;
  const bead = i => ({move: {type: 'paint', bead: i}, label: `Bead ${i + 1}: ${colourName(b.ring[i])}`});
  const board = ringBoard(b.ring, {bead, copy: pos, label: `Ring of ${b.n} beads`});
  const clear = `<div class="bd-actions">${button('Clear', {type: 'clear'}, 'secondary bd-clear', b.ring === blank(b.n) ? 'disabled' : '')}</div>`;
  return `<div class="beads-play" data-mechanic-wire="beads">${sizes}${palettes}${board}${copyTools(p, pos, b.n, true)}${clear}<p class="sr-only" role="status">${esc(`${describeRing(b.ring)}.${copyStatus(b.ring, pos)}`)}</p></div>`;
}

// Motion: the copy slides or flips to its new place, and a ring made again
// turns its card on the shelf to show the match.
const seen = new Map();
function wire(root, p, api) {
  const b = api.attempt().board, n = p.parameters.mode === 'playground' ? b.n : p.parameters.n;
  const pos = usesCopy(p) ? ui(p).copy : null, before = seen.get(p.id);
  seen.set(p.id, {ring: b.ring, copy: pos && {...pos}, n});
  if (pos) animateCopy(root, n, before?.n === n ? before.copy : null, pos);
  const again = root.querySelector('.bd-found li.again');
  if (again && before && before.ring !== b.ring) { try { showMatch(again, n, JSON.parse(again.dataset.match)); } catch { /* no motion to show */ } }
}

const forMode = (puzzle, play) => (p, ...rest) => p.parameters.mode === 'playground' ? play(p, ...rest) : puzzle(p, ...rest);
const hooks = {
  fresh: forMode(freshPuzzle, () => freshPlay()),
  valid: forMode(validPuzzle, (p, b) => validPlay(b)),
  solved: forMode(solvedPuzzle, () => false),
  move: forMode(movePuzzle, (p, b, action) => movePlay(b, action)),
  hint: forMode(hintPuzzle, () => ({type: 'done'})),
  render: forMode(renderPuzzle, renderPlay),
  wire,
  ui: uiChange,
  reset: p => { uiState.delete(p.id); seen.delete(p.id); },
  // Undo takes back a bead but never a ring already found or a true claim.
  carry: (p, from, to) => {
    if (p.parameters.mode === 'playground' || !object(to) || !object(from)) return to;
    if (kind(p) === 'every') return {...to, found: [...from.found], fresh: false};
    if (kind(p) === 'fewest') return {...to, found: [...from.found], claims: [...from.claims], tried: [...new Set([...from.tried, ...to.tried])].sort((x, y) => x - y)};
    return {...to, tried: from.tried || to.tried};
  },
  noHint: p => p.parameters.mode === 'playground'
};
export const beadMechanics = {beads: hooks, lopsided: hooks};

// The family seam entry (dist/families.js).
export default {
  id: 'beads',
  family: {id: 'beads', symbol: '◌'},
  mechanics: beadMechanics,
  pack: new URL('./beads.json', import.meta.url).href,
  css: new URL('./beads.css', import.meta.url).href,
  focus: 'button.br-bead,.bd-done,.bd-claim'
};
