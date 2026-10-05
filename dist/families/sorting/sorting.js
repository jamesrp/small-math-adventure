// Sorting machines (worksheet Week 23). Cards ride left to right along their
// lanes. A bar joins two lanes; when the cards reach it, the smaller goes to
// the upper lane and the larger to the lower one. The bars never change, so a
// machine is a fixed list of compare-exchanges. It sorts when every start
// finishes smallest at the top. It does that for every start exactly when it
// does it for every start made of short and tall cards (the 0–1 principle),
// and k bars light up in at most 2^k ways, so 3 lanes need 3 bars and 4 lanes 5.
import {esc} from '../../expansion-controls.js';

export const PLAY_LANES = [2, 3, 4, 5];
export const PLAY_SLOTS = {2: 2, 3: 4, 4: 6, 5: 9};
const TRIED_LIMIT = 64;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const lane = (n, value) => Number.isInteger(value) && value >= 0 && value < n;
export const key = values => values.join('');

// Every start: the orders of 1..n, or every row of 0s and 1s.
const cache = new Map();
const remember = (name, make) => { if (!cache.has(name)) cache.set(name, make()); return cache.get(name); };
export function orders(n) {
  return remember(`orders${n}`, () => {
    const out = [];
    (function walk(prefix, left) {
      if (!left.length) { out.push(prefix); return; }
      for (const v of left) walk([...prefix, v], left.filter(x => x !== v));
    })([], Array.from({length: n}, (_, i) => i + 1));
    return out;
  });
}
export const binaries = n => remember(`bin${n}`, () => Array.from({length: 2 ** n}, (_, m) => Array.from({length: n}, (_, i) => (m >> (n - 1 - i)) & 1)));
export const starts = (n, cards) => cards === 'binary' ? binaries(n) : orders(n);
export const inOrder = values => values.every((v, i) => i === 0 || values[i - 1] <= v);

// One run: the finish, which bars swapped, and where every card stood before
// each bar (for the animation). Empty slots are skipped.
export function runMachine(bars, start) {
  const values = [...start], lit = [], frames = [[...values]];
  for (const bar of bars) {
    if (!bar) { lit.push(false); frames.push([...values]); continue; }
    const [i, j] = bar, swap = values[i] > values[j];
    if (swap) [values[i], values[j]] = [values[j], values[i]];
    lit.push(swap); frames.push([...values]);
  }
  return {finish: values, lit, frames, sorted: inOrder(values)};
}
export const failures = (bars, n, cards = 'numbers') => starts(n, cards).filter(s => !runMachine(bars, s).sorted);
// A finish that no single extra bar puts in order: at least two separate swaps are needed.
export function oneBarFixes(finish) {
  if (inOrder(finish)) return true;
  for (let i = 0; i < finish.length; i++) for (let j = i + 1; j < finish.length; j++) if (runMachine([[i, j]], finish).sorted) return true;
  return false;
}
// The starts a break puzzle accepts: wrong finishes, or (target 'unfixable')
// finishes that one more bar could not put right.
export const breakers = q => {
  const bars = machineOf(q), wrong = failures(bars, q.lanes, q.cards);
  return q.target === 'unfixable' ? wrong.filter(s => !oneBarFixes(runMachine(bars, s).finish)) : wrong;
};
export const sortsAll = (bars, n) => !failures(bars, n, 'binary').length;
const pattern = run => run.lit.map(Number).join('');

// Puzzle parameters: lanes, cards, the machine's fixed bars (lanes numbered from
// 1 in the pack) and, for building, the number of slots.
const machineOf = q => (q.machine || []).map(([a, b]) => [a - 1, b - 1]);
const slotCount = q => q.mode === 'build' ? q.slots : machineOf(q).length;
const locked = q => machineOf(q).length;
const pairOk = (q, bar) => Array.isArray(bar) && bar.length === 2 && lane(q.lanes, bar[0]) && lane(q.lanes, bar[1]) && bar[0] < bar[1] && (!q.adjacent || bar[1] === bar[0] + 1);
export function pairsFor(q) {
  const out = [];
  for (let i = 0; i < q.lanes; i++) for (let j = i + 1; j < q.lanes; j++) if (pairOk(q, [i, j])) out.push([i, j]);
  return out;
}
const sameBar = (a, b) => (a === null && b === null) || (Boolean(a) && Boolean(b) && a[0] === b[0] && a[1] === b[1]);
const validStart = (q, start) => Array.isArray(start) && start.length === q.lanes && (q.cards === 'binary' ? start.every(v => v === 0 || v === 1) : key([...start].sort((a, b) => a - b)) === key(orders(q.lanes)[0]));
const validKey = (q, k) => typeof k === 'string' && starts(q.lanes, q.cards).some(s => key(s) === k);
const fromKey = k => [...k].map(Number);

// What a run shows and what has been found, all derived from the board.
export function viewOf(p, b) {
  const q = p.parameters, run = runMachine(b.bars, b.start);
  const tried = b.tried.map(k => ({key: k, run: runMachine(b.bars, fromKey(k))}));
  let pair = null;
  if (q.mode === 'lights') {
    const seen = new Map();
    for (const t of tried) { const lit = pattern(t.run); if (seen.has(lit) && !pair) pair = [seen.get(lit), t.key]; else seen.set(lit, t.key); }
  }
  return {q, run, tried, pair, grid: q.mode === 'build' && b.tested && sortsAll(b.bars, q.lanes) ? orders(q.lanes).map(s => ({key: key(s), sorted: runMachine(b.bars, s).sorted})) : null};
}

function freshPuzzle(p) {
  const q = p.parameters, bars = Array.from({length: slotCount(q)}, (_, i) => machineOf(q)[i] || null);
  return {bars, start: [...q.start], ran: false, tried: [], tested: false, claimed: false, missed: false};
}
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b) || !Array.isArray(b.bars) || b.bars.length !== slotCount(q) || !validStart(q, b.start)) return false;
  if (!b.bars.every((bar, i) => i < locked(q) ? sameBar(bar, machineOf(q)[i]) : bar === null || pairOk(q, bar))) return false;
  if (!['ran', 'tested', 'claimed', 'missed'].every(name => typeof b[name] === 'boolean')) return false;
  if (!Array.isArray(b.tried) || b.tried.length > TRIED_LIMIT || new Set(b.tried).size !== b.tried.length || !b.tried.every(k => validKey(q, k))) return false;
  if (b.ran && !b.tried.includes(key(b.start))) return false;
  if (q.mode !== 'build' && b.tested) return false;
  if (q.mode !== 'every' && (b.claimed || b.missed)) return false;
  if (b.claimed && failures(b.bars, q.lanes, q.cards).some(s => !b.tried.includes(key(s)))) return false;
  return !(b.claimed && b.missed);
}
function solvedPuzzle(p, b) {
  if (!validPuzzle(p, b)) return false;
  const q = p.parameters;
  if (q.mode === 'break') return b.ran && (q.target === 'unfixable' ? !oneBarFixes(runMachine(b.bars, b.start).finish) : !runMachine(b.bars, b.start).sorted);
  if (q.mode === 'every') return b.claimed;
  if (q.mode === 'lights') return Boolean(viewOf(p, b).pair);
  return b.tested && sortsAll(b.bars, q.lanes);
}
// A changed start or machine hides the last run.
const changed = b => ({...b, ran: false, missed: false});
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters;
  switch (action.type) {
    case 'swap': {
      const {a, b: c} = action;
      if (q.cards === 'binary' || !lane(q.lanes, a) || !lane(q.lanes, c) || a === c) return null;
      const start = [...b.start]; [start[a], start[c]] = [start[c], start[a]];
      return {...changed(b), start};
    }
    case 'flip': {
      if (q.cards !== 'binary' || !lane(q.lanes, action.lane)) return null;
      const start = [...b.start]; start[action.lane] = 1 - start[action.lane];
      return {...changed(b), start};
    }
    case 'run': {
      if (b.ran) return null;
      const k = key(b.start), tried = b.tried.includes(k) ? b.tried : [...b.tried, k];
      return tried.length > TRIED_LIMIT ? null : {...b, ran: true, missed: false, tried};
    }
    case 'bar': {
      if (q.mode !== 'build' || !Number.isInteger(action.slot) || action.slot < locked(q) || action.slot >= b.bars.length) return null;
      const bar = action.lanes === null ? null : Array.isArray(action.lanes) ? [...action.lanes].sort((x, y) => x - y) : undefined;
      if (bar === undefined || (bar && !pairOk(q, bar)) || sameBar(bar, b.bars[action.slot])) return null;
      const bars = b.bars.map((old, i) => i === action.slot ? bar : old);
      // Earlier runs belong to the old machine.
      return {...changed(b), bars, tried: [], tested: false};
    }
    case 'test': {
      if (q.mode !== 'build' || b.tested) return null;
      const bad = failures(b.bars, q.lanes)[0];
      if (!bad) return {...b, tested: true};
      const k = key(bad);
      return {...b, tested: true, start: [...bad], ran: true, tried: b.tried.includes(k) ? b.tried : [...b.tried, k].slice(-TRIED_LIMIT)};
    }
    case 'claim': {
      if (q.mode !== 'every' || b.missed) return null;
      const all = failures(b.bars, q.lanes, q.cards).every(s => b.tried.includes(key(s)));
      return all ? {...b, claimed: true} : {...b, missed: true};
    }
  }
  return null;
}

// Hints. The witness is the answer nearest the child's own start or machine.
const distance = (a, b) => a.reduce((n, v, i) => n + (v !== b[i]), 0);
const nearest = (list, start) => [...list].sort((x, y) => distance(x, start) - distance(y, start))[0];
const words = ['top', 'second', 'third', 'fourth', 'fifth', 'sixth'];
function arrange(q, b, target, done) {
  const i = b.start.findIndex((v, j) => v !== target[j]);
  if (i < 0) return done;
  if (q.cards === 'binary') return {type: 'move', action: {type: 'flip', lane: i}, text: `Change the ${words[i]} card.`};
  const j = b.start.findIndex((v, k) => k !== i && v === target[i] && v !== target[k]);
  return {type: 'move', action: {type: 'swap', a: i, b: j}, text: `Swap the ${b.start[i]} and the ${b.start[j]}.`};
}
const runIt = {type: 'move', action: {type: 'run'}, text: 'Run it.'};
// Every way to fill the open slots that sorts, for the build hints.
const builders = new Map();
function sorterChoices(p) {
  if (builders.has(p.id)) return builders.get(p.id);
  const q = p.parameters, open = q.slots - locked(q), choices = [null, ...pairsFor(q)], fixed = machineOf(q);
  let fills = [[]];
  for (let s = 0; s < open; s++) fills = fills.flatMap(f => choices.map(c => [...f, c]));
  const out = fills.filter(f => sortsAll([...fixed, ...f], q.lanes));
  builders.set(p.id, out);
  return out;
}
function hintPuzzle(p, b) {
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters;
  if (q.mode === 'build') {
    const open = b.bars.slice(locked(q)), witness = [...sorterChoices(p)].sort((x, y) => y.filter((bar, i) => sameBar(bar, open[i])).length - x.filter((bar, i) => sameBar(bar, open[i])).length)[0];
    const s = witness.findIndex((bar, i) => !sameBar(bar, open[i]));
    if (s < 0) return {type: 'move', action: {type: 'test'}, text: 'Test it.'};
    const slot = s + locked(q), want = witness[s];
    if (open[s] && !want) return {type: 'move', action: {type: 'bar', slot, lanes: null}, text: 'Take this bar away.'};
    return {type: 'move', action: {type: 'bar', slot, lanes: want}, text: `Put a bar here joining the ${words[want[0]]} and ${words[want[1]]} lanes.`};
  }
  if (q.mode === 'every') {
    const open = failures(b.bars, q.lanes, q.cards).filter(s => !b.tried.includes(key(s)));
    if (!open.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    return arrange(q, b, nearest(open, b.start), runIt);
  }
  if (q.mode === 'lights') {
    const groups = new Map();
    for (const s of starts(q.lanes, q.cards)) { const lit = pattern(runMachine(b.bars, s)); groups.set(lit, [...(groups.get(lit) || []), s]); }
    const shared = [...groups.values()].filter(g => g.length > 1);
    const partnered = shared.filter(g => g.some(s => b.tried.includes(key(s))));
    const pool = (partnered.length ? partnered : shared).flatMap(g => g.filter(s => !b.tried.includes(key(s))));
    const target = nearest(pool, b.start);
    return arrange(q, b, target, b.ran ? {type: 'note'} : runIt);
  }
  const target = nearest(breakers(q), b.start);
  return arrange(q, b, target, runIt);
}

// The playground: any number of lanes, bars placed freely, cards of either kind.
function freshPlay(lanes = 3, cards = 'numbers') {
  return {lanes, cards, bars: Array(PLAY_SLOTS[lanes]).fill(null), start: cards === 'binary' ? Array(lanes).fill(0).map((_, i) => i % 2) : orders(lanes)[0].slice().reverse(), ran: false, tested: false};
}
const playQ = b => ({lanes: b.lanes, cards: b.cards, mode: 'build'});
function validPlay(b) {
  if (!object(b) || !PLAY_LANES.includes(b.lanes) || !['numbers', 'binary'].includes(b.cards)) return false;
  const q = playQ(b);
  return Array.isArray(b.bars) && b.bars.length === PLAY_SLOTS[b.lanes] && b.bars.every(bar => bar === null || pairOk(q, bar)) && validStart(q, b.start) && typeof b.ran === 'boolean' && typeof b.tested === 'boolean';
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  const q = playQ(b);
  if (action.type === 'lanes') return PLAY_LANES.includes(action.lanes) && action.lanes !== b.lanes ? freshPlay(action.lanes, b.cards) : null;
  if (action.type === 'cards') return ['numbers', 'binary'].includes(action.cards) && action.cards !== b.cards ? {...freshPlay(b.lanes, action.cards), bars: b.bars} : null;
  if (action.type === 'clear') return b.bars.some(Boolean) ? {...b, bars: b.bars.map(() => null), ran: false, tested: false} : null;
  if (action.type === 'shuffle') {
    const pool = starts(b.lanes, b.cards).filter(s => key(s) !== key(b.start));
    return {...b, start: [...pool[Math.floor(random() * pool.length) % pool.length]], ran: false, tested: false};
  }
  if (action.type === 'swap') {
    const {a, b: c} = action;
    if (b.cards === 'binary' || !lane(b.lanes, a) || !lane(b.lanes, c) || a === c) return null;
    const start = [...b.start]; [start[a], start[c]] = [start[c], start[a]];
    return {...b, start, ran: false, tested: false};
  }
  if (action.type === 'flip') {
    if (b.cards !== 'binary' || !lane(b.lanes, action.lane)) return null;
    const start = [...b.start]; start[action.lane] = 1 - start[action.lane];
    return {...b, start, ran: false, tested: false};
  }
  if (action.type === 'run') return b.ran ? null : {...b, ran: true, tested: false};
  if (action.type === 'bar') {
    if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= b.bars.length) return null;
    const bar = action.lanes === null ? null : Array.isArray(action.lanes) ? [...action.lanes].sort((x, y) => x - y) : undefined;
    if (bar === undefined || (bar && !pairOk(q, bar)) || sameBar(bar, b.bars[action.slot])) return null;
    return {...b, bars: b.bars.map((old, i) => i === action.slot ? bar : old), ran: false, tested: false};
  }
  if (action.type === 'test') {
    if (b.tested) return null;
    const bad = failures(b.bars, b.lanes, b.cards)[0];
    return bad ? {...b, tested: true, start: [...bad], ran: true} : {...b, tested: true, ran: false};
  }
  return null;
}

// View-only state: the card or lane end picked first, and which move to animate.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null}); return uiState.get(p.id); };
let pending = null;

// Board geometry: the start column, one column per slot, the finish column.
const xStart = 7, xFinish = 93;
const slotX = (k, s) => k === 1 ? 50 : 24 + s * (52 / (k - 1));
const laneY = (n, i) => (i + 0.5) / n * 100;
const tokenSize = (q, v) => q.cards === 'binary' ? (v ? 48 : 32) : 32 + (v - 1) * (16 / Math.max(1, q.lanes - 1));
const cardStyle = (q, v, x, i) => `left:${x}%;top:${laneY(q.lanes, i)}%;--size:${tokenSize(q, v).toFixed(1)}px`;
const face = (q, v) => q.cards === 'binary' ? '' : String(v);
function board(p, b, opts) {
  const q = opts.q, n = q.lanes, k = b.bars.length, run = opts.run, pick = opts.pick, hint = opts.hint?.action;
  const lanes = Array.from({length: n}, (_, i) => `<line x1="${xStart}" y1="${laneY(n, i)}" x2="${xFinish}" y2="${laneY(n, i)}" class="sort-lane"/>`).join('');
  const bars = b.bars.map((bar, s) => {
    if (!bar) return '';
    const x = slotX(k, s), [y1, y2] = bar.map(i => laneY(n, i)), lit = opts.ran && run.lit[s];
    return `<g class="sort-bar${lit ? ' lit' : ''}"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><circle cx="${x}" cy="${y1}" r="1.6"/><circle cx="${x}" cy="${y2}" r="1.6"/></g>`;
  }).join('');
  const svg = `<svg class="sort-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lanes}${bars}</svg>`;
  // Lane ends for placing bars in open slots; a placed open bar can be taken away.
  const editable = s => opts.build && s >= opts.locked;
  const pegs = opts.build ? b.bars.map((bar, s) => {
    if (!editable(s)) return '';
    const x = slotX(k, s);
    const remove = bar ? `<button type="button" class="sort-remove${hint?.type === 'bar' && hint.slot === s && hint.lanes === null ? ' hinted' : ''}" style="left:${x}%;top:${(laneY(n, bar[0]) + laneY(n, bar[1])) / 2}%;height:${(laneY(n, bar[1]) - laneY(n, bar[0]))}%" data-sort-move="${esc(JSON.stringify({type: 'bar', slot: s, lanes: null}))}" data-focus="sort-remove-${s}" aria-label="${esc(`Bar ${s + 1} joins lanes ${bar[0] + 1} and ${bar[1] + 1}. Take it away`)}"></button>` : '';
    if (bar) return remove;
    const ends = Array.from({length: n}, (_, i) => {
      const chosen = pick?.slot === s && pick.lane === i;
      const allowed = !pick || pick.slot !== s ? true : chosen || pairOk(q, [Math.min(i, pick.lane), Math.max(i, pick.lane)]);
      const hinted = hint?.type === 'bar' && hint.slot === s && hint.lanes?.includes(i);
      return `<button type="button" class="sort-peg${chosen ? ' picked' : ''}${hinted ? ' hinted' : ''}" style="left:${x}%;top:${laneY(n, i)}%" data-sort-peg="${s},${i}" data-focus="sort-peg-${s}-${i}" aria-label="${esc(`Slot ${s + 1}, lane ${i + 1}${chosen ? ', chosen' : ''}`)}" ${allowed ? '' : 'aria-disabled="true"'}></button>`;
    }).join('');
    return ends;
  }).join('') : '';
  const starts = b.start.map((v, i) => {
    const picked = pick?.card === i, hinted = (hint?.type === 'swap' && (hint.a === i || hint.b === i)) || (hint?.type === 'flip' && hint.lane === i);
    const label = q.cards === 'binary' ? (v ? 'tall' : 'short') : String(v);
    return `<button type="button" class="sort-card start v${v}${picked ? ' picked' : ''}${hinted ? ' hinted' : ''}" style="${cardStyle(q, v, xStart, i)}" data-sort-card="${i}" data-focus="sort-card-${i}" aria-label="${esc(`Lane ${i + 1}: ${label}${picked ? ', chosen' : ''}`)}"${opts.still ? ' aria-disabled="true"' : ''}>${face(q, v)}</button>`;
  }).join('');
  const out = (v, i) => run.finish[i - 1] > v || run.finish[i + 1] < v;
  const finish = opts.ran ? run.finish.map((v, i) => `<span class="sort-card finish v${v}${out(v, i) ? ' wrong' : ''}" style="${cardStyle(q, v, xFinish, i)}">${face(q, v)}</span>`).join('') : '';
  return `<div class="sort-board${opts.ran ? (run.sorted ? ' is-sorted' : ' is-wrong') : ''}" style="--lanes:${n}" data-lanes="${n}" data-slots="${k}">${svg}${pegs}${starts}<div class="sort-finish">${finish}</div><div class="sort-fly" aria-hidden="true"></div></div>`;
}
const mini = (q, k, extra = '') => `<span class="sort-mini">${[...k].map(c => q.cards === 'binary' ? `<i class="b${c}"></i>` : `<b>${c}</b>`).join('')}${extra}</span>`;
const litMarks = lit => `<span class="sort-litmarks" aria-hidden="true">${lit.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</span>`;
const describeStart = (q, s) => q.cards === 'binary' ? s.map(v => v ? 'tall' : 'short').join(', ') : s.join(', ');
function shelf(q, v, mode) {
  if (!v.tried.length) return '';
  const items = v.tried.map(t => {
    const inPair = v.pair?.includes(t.key);
    const mark = `<span class="sort-mark ${t.run.sorted ? 'ok' : 'bad'}" aria-hidden="true">${t.run.sorted ? '✓' : '✗'}</span>`;
    const label = `${describeStart(q, fromKey(t.key))}: ${mode === 'lights' ? `finishes ${describeStart(q, t.run.finish)}` : t.run.sorted ? 'sorted' : 'wrong'}${mode === 'lights' ? `, lit ${t.run.lit.filter(Boolean).length ? t.run.lit.map((on, i) => on ? i + 1 : '').filter(Boolean).join(' and ') : 'none'}` : ''}`;
    const body = mode === 'lights' ? `<span class="sort-pairrow">${mini(q, t.key)}<span class="sort-arrow" aria-hidden="true">→</span>${mini(q, t.run.finish.join(''))}</span>${litMarks(t.run.lit)}` : `${mini(q, t.key)}${mark}`;
    return `<li class="sort-tried${inPair ? ' pair' : ''}" aria-label="${esc(label)}">${body}</li>`;
  }).join('');
  return `<ol class="sort-shelf" aria-label="Starts tried">${items}</ol>`;
}
function grid(q, v) {
  if (!v.grid) return '';
  return `<ol class="sort-grid" aria-label="Every start">${v.grid.map((g, i) => `<li class="${g.sorted ? 'ok' : 'bad'}" style="--i:${i}" aria-label="${esc(`${g.key.split('').join(', ')}: ${g.sorted ? 'sorted' : 'wrong'}`)}">${mini(q, g.key)}</li>`).join('')}</ol>`;
}
const moveButton = (label, action, cls = '', extra = '') => `<button type="button" class="secondary sort-action ${cls}" data-sort-move="${esc(JSON.stringify(action))}" data-focus="sort-${action.type}" ${extra}>${label}</button>`;
function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, v = viewOf(p, b), solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action?.type;
  const pick = solved ? null : ui(p).pick;
  const body = board(p, b, {q, run: v.run, ran: b.ran, pick, hint, build: q.mode === 'build' && !solved, locked: locked(q), still: solved});
  const buttons = solved ? '' : `<div class="sort-actions">${moveButton('▶ Run', {type: 'run'}, h === 'run' ? 'hinted' : '', b.ran ? 'data-replay="1"' : '')}${q.mode === 'build' ? moveButton('Test', {type: 'test'}, h === 'test' ? 'hinted' : '', b.tested ? 'disabled' : '') : ''}${q.mode === 'every' ? moveButton('That’s all', {type: 'claim'}, h === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '') : ''}</div>`;
  const missed = b.missed ? '<p class="sort-note" role="status">There’s another.</p>' : '';
  const status = b.ran ? `${describeStart(q, b.start)} finishes ${describeStart(q, v.run.finish)}${v.run.sorted ? ', in order' : ', out of order'}.` : `Start: ${describeStart(q, b.start)}.`;
  return `<div class="sorting-puzzle mode-${q.mode} cards-${q.cards}" data-mechanic-wire="sorting">${body}${buttons}${missed}${q.mode === 'build' ? grid(q, v) : shelf(q, v, q.mode)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const laneIcon = n => `<svg class="sort-lane-icon" viewBox="0 0 28 28" aria-hidden="true">${Array.from({length: n}, (_, i) => `<line x1="3" x2="25" y1="${(4 + i * 20 / Math.max(1, n - 1)).toFixed(1)}" y2="${(4 + i * 20 / Math.max(1, n - 1)).toFixed(1)}"/>`).join('')}</svg>`;
function renderPlay(p, a) {
  const b = a.board, q = playQ(b), run = runMachine(b.bars, b.start), pick = ui(p).pick;
  const pickLanes = `<div class="sort-tools" role="group" aria-label="Lanes">${PLAY_LANES.map(n => `<button type="button" class="secondary sort-tool" data-sort-move="${esc(JSON.stringify({type: 'lanes', lanes: n}))}" data-focus="sort-lanes-${n}" aria-pressed="${b.lanes === n}" aria-label="${n} lanes">${laneIcon(n)}</button>`).join('')}</div>`;
  const pickCards = `<div class="sort-tools" role="group" aria-label="Cards">${[['numbers', '1 2 3', 'Numbers'], ['binary', '<i class="b0"></i><i class="b1"></i>', 'Short and tall']].map(([cards, label, name]) => `<button type="button" class="secondary sort-tool sort-kind" data-sort-move="${esc(JSON.stringify({type: 'cards', cards}))}" data-focus="sort-cards-${cards}" aria-pressed="${b.cards === cards}" aria-label="${name}">${label}</button>`).join('')}</div>`;
  const body = board(p, b, {q, run, ran: b.ran, pick, hint: null, build: true, locked: 0});
  const pass = b.tested && !b.ran ? '<span class="sort-pass" role="img" aria-label="Sorts every start">✓</span>' : '';
  const actions = `<div class="sort-actions">${moveButton('▶ Run', {type: 'run'}, '', b.ran ? 'data-replay="1"' : '')}${moveButton('Test', {type: 'test'}, '', b.tested ? 'disabled' : '')}${moveButton('Shuffle', {type: 'shuffle'})}${moveButton('Clear', {type: 'clear'}, '', b.bars.some(Boolean) ? '' : 'disabled')}${pass}</div>`;
  const status = b.tested && !b.ran ? 'This machine sorts every start.' : b.ran ? `${describeStart(q, b.start)} finishes ${describeStart(q, run.finish)}${run.sorted ? ', in order' : ', out of order'}.` : `Start: ${describeStart(q, b.start)}.`;
  return `<div class="sorting-play cards-${b.cards}" data-mechanic-wire="sorting"><div class="sort-pickers">${pickLanes}${pickCards}</div>${body}${actions}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Animation after a run: copies of the start cards ride through each bar and
// swap where it lights; the finish cards appear when they arrive.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function animate(root, q, bars, start) {
  const boardEl = root.querySelector('.sort-board'), layer = root.querySelector('.sort-fly'), finish = root.querySelector('.sort-finish');
  if (!boardEl || !layer) return;
  layer.replaceChildren();
  const token = String(Date.now() + Math.random());
  boardEl.dataset.ride = token;
  const run = runMachine(bars, start), k = bars.length, n = q.lanes;
  const cards = start.map((v, i) => {
    const el = document.createElement('span');
    el.className = `sort-card v${v} riding`;
    el.style.cssText = cardStyle(q, v, xStart, i);
    el.textContent = face(q, v);
    layer.append(el);
    return el;
  });
  const lanesOf = cards.map((_, i) => i), barEls = [...boardEl.querySelectorAll('.sort-bar')];
  const shown = run.lit.filter((_, s) => bars[s]);
  barEls.forEach(el => el.classList.remove('lit'));
  finish?.classList.add('waiting');
  boardEl.classList.add('running');
  const step = 420;
  let t = 60;
  const at = (fn, delay) => setTimeout(() => { if (root.isConnected && boardEl.dataset.ride === token) fn(); }, delay);
  let barIndex = 0;
  for (let s = 0; s < k; s++) {
    const bar = bars[s], x = slotX(k, s);
    const isBar = Boolean(bar), myBar = isBar ? barIndex++ : -1;
    at(() => cards.forEach(el => { el.style.left = `${x}%`; }), t);
    t += step;
    if (isBar && run.lit[s]) {
      const [i, j] = bar;
      at(() => {
        const ci = lanesOf.indexOf(i), cj = lanesOf.indexOf(j);
        cards[ci].style.top = `${laneY(n, j)}%`; cards[cj].style.top = `${laneY(n, i)}%`;
        lanesOf[ci] = j; lanesOf[cj] = i;
        barEls[myBar]?.classList.add('lit', 'flash');
      }, t);
      t += step;
    }
  }
  at(() => cards.forEach(el => { el.style.left = `${xFinish}%`; }), t);
  t += step;
  at(() => {
    layer.replaceChildren();
    finish?.classList.remove('waiting');
    boardEl.classList.remove('running');
    barEls.forEach((el, i) => { el.classList.toggle('lit', shown[i]); el.classList.remove('flash'); });
  }, t);
}
function wire(root, p, api) {
  const play = p.parameters.mode === 'playground', state = ui(p);
  const attempt = () => api.attempt(), b = () => attempt().board;
  const q = () => play ? playQ(b()) : p.parameters;
  const apply = action => { pending = {id: p.id, moves: attempt().moves, action}; state.pick = null; api.apply(action); };
  const pickUi = pick => api.ui({pick});
  const cardTap = i => {
    if (q().cards === 'binary') { apply({type: 'flip', lane: i}); return; }
    const first = state.pick?.card;
    if (first === undefined || first === null) pickUi({card: i});
    else if (first === i) pickUi(null);
    else apply({type: 'swap', a: first, b: i});
  };
  const pegTap = (s, i) => {
    const pick = state.pick;
    if (pick?.slot === s && pick.lane === i) { pickUi(null); return; }
    if (pick?.slot === s && pick.lane !== undefined) {
      const bar = [Math.min(i, pick.lane), Math.max(i, pick.lane)];
      if (pairOk(q(), bar)) apply({type: 'bar', slot: s, lanes: bar});
      return;
    }
    pickUi({slot: s, lane: i});
  };
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-sort-move],[data-sort-card],[data-sort-peg]');
    if (!control || !root.contains(control) || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    if (control.dataset.sortCard !== undefined) { cardTap(Number(control.dataset.sortCard)); return; }
    if (control.dataset.sortPeg !== undefined) { const [s, i] = control.dataset.sortPeg.split(',').map(Number); pegTap(s, i); return; }
    if (control.dataset.replay) { animate(root, q(), b().bars, b().start); return; }
    try { apply(JSON.parse(control.dataset.sortMove)); } catch { /* malformed control data is ignored */ }
  });
  // Dragging a card onto another swaps them; dragging between two lane ends in
  // one slot places a bar.
  let from = null;
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-sort-card],[data-sort-peg]');
    from = el && root.contains(el) ? el : null;
  });
  root.addEventListener('pointerup', e => {
    const start = from;
    from = null;
    if (!start || start.getAttribute('aria-disabled') === 'true') return;
    const to = document.elementFromPoint?.(e.clientX, e.clientY)?.closest?.('[data-sort-card],[data-sort-peg]');
    if (!to || to === start || !root.contains(to)) return;
    if (start.dataset.sortCard !== undefined && to.dataset.sortCard !== undefined && q().cards !== 'binary') {
      e.preventDefault(); apply({type: 'swap', a: Number(start.dataset.sortCard), b: Number(to.dataset.sortCard)});
    } else if (start.dataset.sortPeg !== undefined && to.dataset.sortPeg !== undefined) {
      const [s1, i1] = start.dataset.sortPeg.split(',').map(Number), [s2, i2] = to.dataset.sortPeg.split(',').map(Number), bar = [Math.min(i1, i2), Math.max(i1, i2)];
      if (s1 === s2 && i1 !== i2 && pairOk(q(), bar)) { e.preventDefault(); apply({type: 'bar', slot: s1, lanes: bar}); }
    }
  });
  // Animate the run that produced this render, once.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || attempt().moves !== last.moves + 1 || reduced()) return;
  if (last.action.type === 'test') root.querySelector('.sort-grid')?.classList.add('pop');
  if (b().ran && ['run', 'test'].includes(last.action.type)) animate(root, q(), b().bars, b().start);
}

export const sortingMechanics = {
  sorting: {
    fresh: p => p.parameters.mode === 'playground' ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => p.parameters.mode === 'playground' ? movePlay(b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload) || !Object.hasOwn(payload, 'pick')) return;
      const pick = payload.pick;
      ui(p).pick = object(pick) && (Number.isInteger(pick.card) || (Number.isInteger(pick.slot) && Number.isInteger(pick.lane))) ? pick : null;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back a move but keeps the starts already tried on the same machine.
    carry: (p, from, to) => {
      if (p.parameters.mode === 'playground' || !object(to) || p.parameters.mode === 'build') return to;
      const tried = [...to.tried, ...from.tried.filter(k => !to.tried.includes(k))];
      return {...to, tried, ran: to.ran && tried.includes(key(to.start))};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'sorting',
  family: {id: 'sorting', symbol: '⇅'},
  mechanics: sortingMechanics,
  pack: new URL('./sorting.json', import.meta.url).href,
  css: new URL('./sorting.css', import.meta.url).href,
  focus: '.sort-card.start:not([aria-disabled]),.sort-action:not([disabled])'
};
