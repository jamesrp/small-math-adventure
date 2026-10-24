// Running totals (worksheet Week 89, Growing shapes and totals: discrete
// calculus). Input cards go into a lane, one card a turn. Each turn adds the
// card to the first tray's total, then adds the first tray's new total to the
// second tray's, and so on down: tray j gains the new total of tray j − 1.
// The board is the worksheet's table, a column for each turn and a row for
// each tray, so every total is the one to its left plus the one above it.
//
// After N turns the last of k trays holds what its starts give plus
// Σ C(N − i + k − 1, k − 1)·u_i: with two trays and five turns the cards count
// 5, 4, 3, 2 and 1 times, with three trays 15, 10, 6, 3 and 1. With one tray
// every card counts once, so the order changes nothing. With two or more the
// weights fall strictly, so putting a smaller card a just before a larger
// card b loses (b − a) times the drop in weight: biggest first is the only
// order that makes the most and smallest first the only order that makes the
// least. That sorted lane, played, is the certificate for Can't past either
// end. Going back, differences undo totals: a card is tray 1's new total
// minus its old one, and tray j − 1's new total is tray j's change.
//
// Puzzles: make a final total with given cards (or Can't), match a row of
// totals with cards from an endless supply, and find every start that a row
// of totals could have come from. The playground runs one to three trays.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isInteger;
export const MODES = ['make', 'match', 'every', 'playground'];
export const SUPPLY = [0, 1, 2, 3, 4, 5];
export const PLAY_TURNS = 6, MAX_TRAYS = 3;

// --- The machine ------------------------------------------------------------------
export const full = lane => lane.every(v => v !== null);
export const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
// rows[t][j]: tray t's total after turn j (j = 0 is the start). Totals stop at
// the first empty turn, and every total is blank while a start is unknown.
export function columns(start, lane) {
  const rows = start.map(s => [s]);
  let now = start.every(int) ? [...start] : null;
  for (const u of lane) {
    if (now && u !== null) { const next = []; now.forEach((v, t) => next.push(v + (t ? next[t - 1] : u))); now = next; } else now = null;
    rows.forEach((r, t) => r.push(now ? now[t] : null));
  }
  return rows;
}
export const finalOf = (start, lane) => columns(start, lane).at(-1).at(-1);
const binom = (n, r) => { let x = 1; for (let i = 1; i <= r; i++) x = x * (n - r + i) / i; return Math.round(x); };
// How many times each turn's card counts in the last of k trays after n turns.
export const weights = (n, k) => Array.from({length: n}, (_, i) => binom(n - i - 1 + k - 1, k - 1));
// Every distinct order of a deck.
const orderMemo = new Map();
export function orders(cards) {
  const key = cards.join(',');
  if (!orderMemo.has(key)) {
    const out = [];
    const go = (left, acc) => {
      if (!left.length) { out.push(acc); return; }
      for (const v of [...new Set(left)]) { const i = left.indexOf(v); go([...left.slice(0, i), ...left.slice(i + 1)], [...acc, v]); }
    };
    go([...cards], []);
    orderMemo.set(key, out);
  }
  return orderMemo.get(key);
}
// Every final total a deck can make, with the orders that make it.
const reachMemo = new Map();
export function reach(q) {
  const key = JSON.stringify([q.start, q.cards]);
  if (!reachMemo.has(key)) {
    const m = new Map();
    for (const o of orders(q.cards)) { const t = finalOf(q.start, o); if (!m.has(t)) m.set(t, []); m.get(t).push(o); }
    reachMemo.set(key, m);
  }
  return reachMemo.get(key);
}
export const sortedDown = cards => [...cards].sort((a, b) => b - a);
export const sortedUp = cards => [...cards].sort((a, b) => a - b);
export const extremes = q => ({most: finalOf(q.start, sortedDown(q.cards)), least: finalOf(q.start, sortedUp(q.cards))});
// The cards that make a row of last-tray totals from the starts, by taking
// differences once for each tray (some may be negative or too big).
export function inputsFor(start, goal) {
  let seq = goal;
  for (let t = start.length - 1; t >= 0; t--) seq = seq.map((v, j) => v - (j ? seq[j - 1] : start[t]));
  return seq;
}
const supplyOf = q => q.supply || SUPPLY;
const fits = (q, inputs) => inputs.every(u => supplyOf(q).includes(u));
// The starts (up to the cap) a row of one-tray totals could have come from.
const startMemo = new Map();
export function startsFor(q) {
  const key = JSON.stringify([q.goal, supplyOf(q), q.startCap]);
  if (!startMemo.has(key)) startMemo.set(key, Array.from({length: q.startCap + 1}, (_, s) => s).filter(s => fits(q, inputsFor([s], q.goal))));
  return startMemo.get(key);
}
// The cards still in the hand: the deck less the lane, in the deck's order.
export function handOf(q, lane) {
  const left = [...q.cards];
  for (const v of lane) if (v !== null) { const i = left.indexOf(v); if (i < 0) return null; left.splice(i, 1); }
  return left;
}

// --- Can't --------------------------------------------------------------------------
// A full lane whose total misses the target rules the target out when every
// order makes the same total, or the lane makes the most and the target is
// more, or the lane makes the least and the target is less.
export function certificate(q, lane) {
  if (!Array.isArray(lane) || !full(lane) || q.mode !== 'make') return null;
  const t = finalOf(q.start, lane), {most, least} = extremes(q);
  if (t === q.target) return null;
  if (most === least) return 'same';
  if (t === most && q.target > t) return 'most';
  if (t === least && q.target < t) return 'least';
  return null;
}
export function reasonText(q) {
  const {most, least} = extremes(q), T = q.target;
  if (most === least) return `Every order makes ${most}, so ${T} can’t be made.`;
  return T > most ? `Biggest first makes the most, ${most}. ${T} is more.` : `Smallest first makes the least, ${least}. ${T} is less.`;
}

// --- Boards ---------------------------------------------------------------------------
// make:       {lane, claim, refused}   claim: 'most', 'least' or 'same' after a
//             right Can't; refused: a Can't the lane did not show, which waits
//             for the lane to change.
// match:      {lane}
// every:      {start, lane, found, told, done}   found: the starts found, in
//             order; told: 'more' after a wrong That's all, until a new find.
// playground: {trays, lane}
const turnsOf = q => q.mode === 'make' ? q.cards.length : q.mode === 'playground' ? PLAY_TURNS : q.goal.length;
export const startOf = (q, b) => q.mode === 'every' ? [b.start] : q.mode === 'playground' ? Array(b.trays).fill(0) : q.start;
const blank = n => Array(n).fill(null);
export const matches = (q, b) => q.mode !== 'make' && q.mode !== 'playground' && full(b.lane) && (q.mode !== 'every' || b.start !== null) && same(columns(startOf(q, b), b.lane).at(-1).slice(1), q.goal);
// Record a start the moment its lane makes the totals.
const record = (q, b) => matches(q, b) && !b.found.includes(b.start) ? {...b, found: [...b.found, b.start].sort((x, y) => x - y), told: null} : b;

function fresh(p) {
  const q = p.parameters, lane = blank(turnsOf(q));
  if (q.mode === 'make') return {lane, claim: null, refused: false};
  if (q.mode === 'every') return {start: null, lane, found: [], told: null, done: false};
  if (q.mode === 'playground') return {trays: 2, lane};
  return {lane};
}
function laneOk(q, b) {
  const lane = b.lane;
  if (!Array.isArray(lane) || lane.length !== turnsOf(q) || !lane.every(v => v === null || int(v))) return false;
  return q.mode === 'make' ? handOf(q, lane) !== null : lane.every(v => v === null || supplyOf(q).includes(v));
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const keys = Object.keys(b).sort().join();
  if (q.mode === 'make') {
    if (keys !== 'claim,lane,refused' || !laneOk(q, b) || typeof b.refused !== 'boolean') return false;
    if (b.claim !== null && !(q.cant && b.claim === certificate(q, b.lane))) return false;
    if (b.refused && !(q.cant && full(b.lane) && certificate(q, b.lane) === null && finalOf(q.start, b.lane) !== q.target)) return false;
    return !(b.claim !== null && b.refused);
  }
  if (q.mode === 'match') return keys === 'lane' && laneOk(q, b);
  if (q.mode === 'playground') return keys === 'lane,trays' && int(b.trays) && b.trays >= 1 && b.trays <= MAX_TRAYS && laneOk(q, b);
  if (keys !== 'done,found,lane,start,told' || !laneOk(q, b) || typeof b.done !== 'boolean' || ![null, 'more'].includes(b.told)) return false;
  if (!(b.start === null || (int(b.start) && b.start >= 0 && b.start <= q.startCap))) return false;
  const all = startsFor(q);
  if (!Array.isArray(b.found) || !b.found.every((s, k) => all.includes(s) && (k === 0 || b.found[k - 1] < s))) return false;
  if (matches(q, b) && !b.found.includes(b.start)) return false;
  if (b.told === 'more' && (b.found.length === all.length || b.done)) return false;
  return !b.done || b.found.length === all.length;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'make') return b.claim !== null || (full(b.lane) && finalOf(q.start, b.lane) === q.target);
  if (q.mode === 'every') return b.done;
  return matches(q, b);
}

// --- Moves ------------------------------------------------------------------------------
// put {slot, card}: a card into an empty turn. change {slot, card}: a different
// card into a full turn (in a make puzzle the old card goes back to the hand).
// take {slot}: a card back out. swap {a, b}: two turns trade cards (one may be
// empty). start {value}: an every puzzle's start. trays {n}: the playground's
// number of trays. cant: Can't, with the lane as the reason. all: That's all.
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const lane = b.lane, n = lane.length, slot = i => int(i) && i >= 0 && i < n;
  const avail = c => int(c) && (q.mode === 'make' ? handOf(q, lane).includes(c) : supplyOf(q).includes(c));
  let next = null;
  const {type} = action;
  if (type === 'put' && slot(action.slot) && lane[action.slot] === null && avail(action.card)) next = lane.map((v, i) => i === action.slot ? action.card : v);
  if (type === 'change' && slot(action.slot) && lane[action.slot] !== null && lane[action.slot] !== action.card && avail(action.card)) next = lane.map((v, i) => i === action.slot ? action.card : v);
  if (type === 'take' && slot(action.slot) && lane[action.slot] !== null) next = lane.map((v, i) => i === action.slot ? null : v);
  if (type === 'swap' && slot(action.a) && slot(action.b) && action.a !== action.b && lane[action.a] !== lane[action.b]) next = lane.map((v, i) => i === action.a ? lane[action.b] : i === action.b ? lane[action.a] : v);
  if (next) return q.mode === 'make' ? {...b, lane: next, refused: false} : q.mode === 'every' ? record(q, {...b, lane: next}) : {...b, lane: next};
  if (type === 'start' && q.mode === 'every' && int(action.value) && action.value >= 0 && action.value <= q.startCap && action.value !== b.start) return record(q, {...b, start: action.value});
  if (type === 'trays' && q.mode === 'playground' && int(action.n) && action.n >= 1 && action.n <= MAX_TRAYS && action.n !== b.trays) return {...b, trays: action.n};
  // Can't comes after an attempt (a full lane) and waits for a change after a refusal.
  if (type === 'cant' && q.mode === 'make' && q.cant && full(lane) && !b.refused) {
    const why = certificate(q, lane);
    return why ? {...b, claim: why} : {...b, refused: true};
  }
  if (type === 'all' && q.mode === 'every' && b.told !== 'more') return b.found.length === startsFor(q).length ? {...b, done: true, told: null} : {...b, told: 'more'};
  return null;
}

// --- Hints -----------------------------------------------------------------------------------
// Each hint is one step toward a lane: the nearest lane that solves it, or the
// sorted lane for Can't, or the cards a row of totals needs. A step mends the
// first turn that differs: a card from the hand if there is one, or else a
// swap with a turn holding that card in the wrong place.
const off = (lane, goal) => lane.reduce((s, v, i) => s + (v === goal[i] ? 0 : 1), 0);
const nearest = (lane, goals) => goals.reduce((best, g) => off(lane, g) < off(lane, best) ? g : best);
function toward(q, b, goal) {
  const lane = b.lane, i = lane.findIndex((v, k) => v !== goal[k]);
  if (i < 0) return null;
  const want = goal[i];
  if (q.mode !== 'make' || handOf(q, lane).includes(want)) {
    if (lane[i] !== null) return {type: 'move', action: {type: 'change', slot: i, card: want}, text: `Change turn ${i + 1} to ${want}.`};
    return {type: 'move', action: {type: 'put', slot: i, card: want}, text: lane.indexOf(null) === i ? `Play ${want} next.` : `Put ${want} in turn ${i + 1}.`};
  }
  const j = lane.findIndex((v, k) => k > i && v === want && v !== goal[k]);
  return {type: 'move', action: {type: 'swap', a: i, b: j}, text: `Swap turns ${i + 1} and ${j + 1}.`};
}
function makeHint(q, b) {
  const lane = b.lane, ways = reach(q).get(q.target);
  if (ways) return toward(q, b, nearest(lane, ways));
  const {most, least} = extremes(q), cant = {type: 'move', action: {type: 'cant'}, text: reasonText(q)};
  if (most === least) {
    if (full(lane)) return cant;
    const hand = handOf(q, lane);
    return toward(q, b, lane.map(v => v ?? hand.shift()));
  }
  return toward(q, b, q.target > most ? sortedDown(q.cards) : sortedUp(q.cards)) ?? cant;
}
function everyHint(q, b) {
  const left = startsFor(q).filter(s => !b.found.includes(s));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const from = b.start ?? 0, s = left.includes(b.start) ? b.start : left.reduce((best, x) => Math.abs(x - from) < Math.abs(best - from) ? x : best);
  if (b.start !== s) return {type: 'move', action: {type: 'start', value: s}, text: `Start at ${s}.`};
  return toward(q, b, inputsFor([s], q.goal));
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const k = `${p.id}|${JSON.stringify(b)}`;
  if (!hintMemo.has(k)) {
    if (hintMemo.size > 2000) hintMemo.clear();
    hintMemo.set(k, q.mode === 'make' ? makeHint(q, b) : q.mode === 'every' ? everyHint(q, b) : toward(q, b, inputsFor(q.start, q.goal)));
  }
  return hintMemo.get(k);
}

// --- Drawing ------------------------------------------------------------------------------------
// A grid: the turn numbers, the lane of cards, a row for each tray (its start,
// then its total after each turn) and, under the last tray, the goal totals.
// The hand of cards is below. A tapped turn is picked: a card tapped next goes
// there, another turn tapped next trades with it, and tapping it again takes
// its card back. With no turn picked a card goes into the first empty turn.
const view = new Map();
function ui(p) { if (!view.has(p.id)) view.set(p.id, {sel: null, fresh: null}); return view.get(p.id); }
const calm = p => Object.assign(ui(p), {sel: null, fresh: null});
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}"`;
const uiAttrs = (payload, focus) => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="${focus}"`;
const pips = v => `<i class="rt-pips" aria-hidden="true">${'<b></b>'.repeat(v)}</i>`;
const face = v => `<span class="rt-face"><span class="rt-num">${v}</span>${pips(v)}</span>`;
const goalsOf = q => q.mode === 'make' ? [...blank(q.cards.length - 1), q.target] : q.mode === 'playground' ? null : q.goal;
const traysOf = (q, b) => q.mode === 'playground' ? b.trays : q.mode === 'every' ? 1 : q.start.length;
// The cells a move changed, to pop in order: the card, then tray 1, tray 2 and tray 3.
function cellsOf(q, b) {
  const out = new Map(), rows = columns(startOf(q, b), b.lane);
  b.lane.forEach((v, j) => out.set(`c${j + 1}`, v));
  rows.forEach((r, t) => r.forEach((v, j) => out.set(`${t}|${j}`, v)));
  return out;
}
function changed(q, from, to) {
  const before = cellsOf(q, from), after = cellsOf(q, to), cells = [];
  for (const [key, v] of after) if (v !== null && before.get(key) !== v) cells.push(key);
  return cells;
}
const hinted = (on) => on ? ' hinted' : '';

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), st = ui(p);
  const lane = b.lane, n = lane.length, k = traysOf(q, b), start = startOf(q, b), rows = columns(start, lane), goals = goalsOf(q);
  const shown = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b).action ?? null : null;
  const sel = !done && int(st.sel) && st.sel >= 0 && st.sel < n ? st.sel : null;
  const pop = st.fresh && st.fresh.key === JSON.stringify(b) ? new Set(st.fresh.cells) : new Set();
  const popAttr = (key, d) => pop.has(key) ? ` pop" style="--d:${d}` : '';
  const hand = q.mode === 'make' ? handOf(q, lane) : supplyOf(q);
  const firstEmpty = lane.indexOf(null);
  const slotHint = i => shown && (((shown.type === 'put' || shown.type === 'change' || shown.type === 'take') && shown.slot === i) || (shown.type === 'swap' && (shown.a === i || shown.b === i)));
  const cells = [];
  // Turn numbers.
  cells.push('<span class="rt-h" aria-hidden="true"></span>', `<span class="rt-h rt-hs" aria-hidden="true">start</span>`);
  for (let j = 1; j <= n; j++) cells.push(`<span class="rt-h" aria-hidden="true">${j}</span>`);
  // The lane.
  cells.push('<span class="rt-lab rt-lab-card" aria-hidden="true"></span>', '<span class="rt-gap" aria-hidden="true"></span>');
  lane.forEach((v, i) => {
    const look = `rt-slot${v === null ? ' empty' : ' filled'}${sel === i ? ' sel' : ''}${hinted(slotHint(i))}${popAttr(`c${i + 1}`, 0)}`;
    const label = `Turn ${i + 1}: ${v === null ? 'empty' : `card ${v}`}`;
    if (done) { cells.push(`<span class="${look}" role="img" aria-label="${esc(label)}">${v === null ? '' : face(v)}</span>`); return; }
    let attrs;
    if (sel === null) attrs = uiAttrs({sel: i}, `rt-s${i}`);
    else if (sel === i) attrs = v === null ? uiAttrs({sel: null}, `rt-s${i}`) : moveAttrs({type: 'take', slot: i}, `rt-s${i}`);
    else attrs = lane[sel] !== v ? moveAttrs({type: 'swap', a: sel, b: i}, `rt-s${i}`) : uiAttrs({sel: i}, `rt-s${i}`);
    cells.push(`<button type="button" class="${look}" ${attrs} data-tt-slot="${i}" aria-pressed="${sel === i}" aria-label="${esc(label)}">${v === null ? '' : face(v)}</button>`);
  });
  // The trays.
  for (let t = 0; t < k; t++) {
    const last = t === k - 1;
    cells.push(`<span class="rt-lab rt-lab-tray" aria-hidden="true">${t + 1}</span>`, `<span class="rt-cell rt-start${start[t] === null ? ' unknown' : ''}" aria-hidden="true">${start[t] ?? '?'}</span>`);
    for (let j = 1; j <= n; j++) {
      const v = rows[t][j], g = last && goals ? goals[j - 1] : null;
      const mark = g !== null && g !== undefined && v !== null ? (v === g ? ' good' : ' bad') : '';
      cells.push(`<span class="rt-cell${last ? ' last' : ''}${v === null ? ' none' : ''}${mark}${popAttr(`${t}|${j}`, t + 1)}" aria-hidden="true">${v ?? ''}</span>`);
    }
  }
  // The goals under the last tray.
  if (goals) {
    cells.push('<span class="rt-lab rt-lab-goal" aria-hidden="true">⚑</span>', '<span class="rt-gap" aria-hidden="true"></span>');
    goals.forEach(g => cells.push(`<span class="rt-goal${g === null ? ' none' : ''}" aria-hidden="true">${g ?? ''}</span>`));
  }
  const grid = `<div class="rt-grid" style="--n:${n}">${cells.join('')}</div>`;

  // Every: the starts to choose from; the ones found are green.
  let starts = '';
  if (q.mode === 'every') {
    const chips = Array.from({length: q.startCap + 1}, (_, s) => {
      const look = `rt-chip${b.start === s ? ' on' : ''}${b.found.includes(s) ? ' found' : ''}${hinted(shown?.type === 'start' && shown.value === s)}`;
      const label = `Start ${s}${b.found.includes(s) ? ', found' : ''}`;
      if (done || b.start === s) return `<span class="${look}" role="img" aria-label="${esc(label)}">${s}</span>`;
      return `<button type="button" class="${look}" ${moveAttrs({type: 'start', value: s}, `rt-st${s}`)} aria-label="${esc(label)}">${s}</button>`;
    });
    // On a phone the start buttons stand in two even rows.
    starts = `<div class="rt-starts" role="group" aria-label="Start"><span class="rt-hs" aria-hidden="true">start</span><span class="rt-chips" style="--cols:${Math.ceil(chips.length / 2)}">${chips.join('')}</span></div>`;
  }
  // The hand.
  let handHtml = '';
  if (!done) {
    let hintedCard = shown && (shown.type === 'put' || shown.type === 'change') ? shown.card : null;
    const cards = hand.map((v, h) => {
      const on = hintedCard === v;
      if (on) hintedCard = null;
      let attrs, disabled = false;
      if (sel !== null) attrs = lane[sel] === null ? moveAttrs({type: 'put', slot: sel, card: v}, `rt-h${h}`) : lane[sel] !== v ? moveAttrs({type: 'change', slot: sel, card: v}, `rt-h${h}`) : uiAttrs({sel: null}, `rt-h${h}`);
      else if (firstEmpty >= 0) attrs = moveAttrs({type: 'put', slot: firstEmpty, card: v}, `rt-h${h}`);
      else { attrs = `data-focus="rt-h${h}"`; disabled = true; }
      return `<button type="button" class="rt-card${hinted(on)}" ${attrs} data-tt-card="${v}" aria-label="${esc(`Card ${v}`)}"${disabled ? ' disabled' : ''}>${face(v)}</button>`;
    });
    handHtml = `<div class="rt-hand" data-tt-hand role="group" aria-label="Cards">${cards.join('')}</div>`;
  }
  // Tools.
  let tools = '';
  if (!done && q.mode === 'make' && q.cant) {
    const ready = full(lane) && !b.refused;
    tools = `<div class="rt-tools"><button type="button" class="secondary rt-cant${hinted(shown?.type === 'cant')}" ${moveAttrs({type: 'cant'}, 'rt-cant')} ${ready ? '' : 'disabled'}>Can’t</button></div>`;
  }
  if (!done && q.mode === 'every') tools = `<div class="rt-tools"><button type="button" class="primary rt-all${hinted(shown?.type === 'all')}" ${moveAttrs({type: 'all'}, 'rt-all')} ${b.told === 'more' ? 'disabled' : ''}>That’s all</button></div>`;
  if (q.mode === 'playground') {
    const buttons = Array.from({length: MAX_TRAYS}, (_, i) => i + 1).map(m => m === b.trays
      ? `<span class="rt-trayn on" role="img" aria-label="${m} ${m === 1 ? 'tray' : 'trays'}, chosen"><span class="rt-lab rt-lab-tray">${m}</span></span>`
      : `<button type="button" class="rt-trayn" ${moveAttrs({type: 'trays', n: m}, `rt-n${m}`)} aria-label="${m} ${m === 1 ? 'tray' : 'trays'}"><span class="rt-lab rt-lab-tray">${m}</span></button>`);
    tools = `<div class="rt-tools rt-trays" role="group" aria-label="Trays">${buttons.join('')}</div>`;
  }
  // The line under the board. After a right Can't it states the fact; the
  // reason (the sorted lane) is the child's, and the hints' and notes'.
  const {most, least} = q.mode === 'make' ? extremes(q) : {};
  const note = q.mode === 'make' && b.refused ? 'That doesn’t rule it out.'
    : b.claim === 'most' ? `${most} is the most.`
      : b.claim === 'least' ? `${least} is the least.`
        : b.claim === 'same' ? `Every order makes ${most}.`
          : q.mode === 'every' && b.told === 'more' ? 'There is another.' : '';
  const bad = (q.mode === 'make' && b.refused) || (q.mode === 'every' && b.told === 'more');
  const rowWords = rows.map((r, t) => `Tray ${t + 1}: ${r.map(v => v ?? '–').join(', ')}.`).join(' ');
  const goalWords = q.mode === 'make' ? ` Make ${q.target}.` : goals ? ` Goals: ${goals.join(', ')}.` : '';
  const foundWords = q.mode === 'every' && b.found.length ? ` Found ${b.found.join(', ')}.` : '';
  const status = `Cards: ${lane.map(v => v ?? '–').join(', ')}. ${rowWords}${goalWords}${foundWords}${note ? ` ${note}` : ''}`;
  return `<div class="rt-board rt-${q.mode}${done ? ' solved' : ''}${sel !== null ? ' picking' : ''}" data-mechanic-wire="totals">${grid}${starts}${handHtml}${tools}${note ? `<p class="rt-note${bad ? ' bad' : ''}">${esc(note)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Gestures --------------------------------------------------------------------------------------
// Drag a card from the hand onto a turn, a card from one turn onto another
// (they trade), or a card from a turn back to the hand. A drag that ends where
// it started is a tap. Each drop commits after the browser's own click for it
// has gone by, so that click is swallowed here rather than landing on a
// redrawn board.
function wire(root, p, api) {
  const board = root.matches('.rt-board') ? root : root.querySelector('.rt-board');
  if (!board || board.classList.contains('solved')) return;
  let drag = null, dragged = false;
  const later = fn => setTimeout(() => { dragged = false; fn(); }, 0);
  root.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  board.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const el = e.target.closest('button[data-tt-card]:not([disabled]),button[data-tt-slot].filled');
    if (!el || !board.contains(el)) return;
    drag = {el, id: e.pointerId, x: e.clientX, y: e.clientY, card: el.dataset.ttCard !== undefined ? Number(el.dataset.ttCard) : null, from: el.dataset.ttSlot !== undefined ? Number(el.dataset.ttSlot) : null, moved: false};
  });
  const zoneAt = e => { const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tt-slot],[data-tt-hand]'); return z && board.contains(z) ? z : null; };
  const clear = () => board.querySelectorAll('.rt-over').forEach(z => z.classList.remove('rt-over'));
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) { drag.moved = true; drag.el.classList.add('dragging'); }
    drag.el.style.transform = `translate(${dx}px,${dy}px)`;
    clear();
    zoneAt(e)?.classList.add('rt-over');
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    const zone = e.type === 'pointerup' ? zoneAt(e) : null;
    d.el.classList.remove('dragging');
    d.el.style.transform = '';
    clear();
    dragged = true;
    later(() => {
      if (!zone) return;
      const lane = api.attempt().board.lane;
      if (zone.dataset.ttHand !== undefined) { if (d.from !== null) api.apply({type: 'take', slot: d.from}); return; }
      const to = Number(zone.dataset.ttSlot);
      if (d.from !== null) { if (d.from !== to && lane[d.from] !== lane[to]) api.apply({type: 'swap', a: d.from, b: to}); return; }
      if (lane[to] === null) api.apply({type: 'put', slot: to, card: d.card});
      else if (lane[to] !== d.card) api.apply({type: 'change', slot: to, card: d.card});
    });
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
}

export const totalMechanics = {
  totals: {
    fresh, valid, solved, hint, render, wire,
    move(p, b, action) {
      const next = move(p, b, action);
      if (next) { calm(p); ui(p).fresh = {key: JSON.stringify(next), cells: changed(p.parameters, b, next)}; }
      return next;
    },
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      state.fresh = null;
      if (Object.hasOwn(payload, 'sel')) state.sel = int(payload.sel) && payload.sel >= 0 ? payload.sel : null;
    },
    reset: p => { view.delete(p.id); },
    // Undo takes back cards, never what was learned: a refused Can't stays
    // refused while the lane is the same, the starts found stay found and a
    // wrong That's all keeps waiting for a new find.
    carry(p, from, to) {
      calm(p);
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'make' && from.refused && !to.refused && to.claim === null && Array.isArray(from.lane) && Array.isArray(to.lane) && same(from.lane, to.lane)) return {...to, refused: true};
      if (q.mode === 'every' && Array.isArray(from.found) && Array.isArray(to.found)) {
        const found = [...new Set([...from.found, ...to.found, ...(matches(q, to) ? [to.start] : [])])].sort((x, y) => x - y);
        return {...to, found, told: found.length === startsFor(q).length ? null : from.told};
      }
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'totals',
  family: {id: 'totals', symbol: 'Σ', area: 'numbers'},
  mechanics: totalMechanics,
  pack: new URL('./totals.json', import.meta.url).href,
  css: new URL('./totals.css', import.meta.url).href,
  focus: '.rt-slot:not(span),.rt-card:not([disabled])'
};
