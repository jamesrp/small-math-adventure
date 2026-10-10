// Ruler strips (worksheet Week 51, honest measurement ranges). Each strip's
// length is a whole number of units somewhere in its card's band [lo, hi].
// Strips laid end to end from 0 make a join; it ends somewhere in
// [Σ lo, Σ hi], and every end in between occurs. Two joins started at 0 leave
// a gap between their ends. A strip drawn twice is one strip: in a gap it
// cancels, so (A + 4) − (A + 1) is exactly 3 while (A + 4) − (B + 1) runs
// from 1 to 5. A locked total A + B = 12 ties two strips together and can cut
// a band short.
//
// The board is reusable: the strips' card rows (the controls, each strip's
// end dragging only inside its band) and result rows built from strips and
// exact white pieces, on one ruler. Puzzles ask the child to break the app's
// claim about a join's end, or to press Can't and show the shortest and the
// longest join; to widen a card while the app looks for a join that escapes;
// or to make the biggest and the smallest gap. See docs/ranges/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (a, b) => Object.keys(a).sort().join() === Object.keys(b).sort().join();
export const MODES = ['break', 'widen', 'gap', 'playground'];
export const STRIPS = ['A', 'B', 'C'];

// --- Settings and measures ------------------------------------------------------
// A setting gives every strip a whole length in its card's band; a locked
// total {strips, sum} makes two lengths add to sum. White pieces in a row are
// numbers, exact lengths.
export const stripsOf = q => Object.keys(q.cards);
export const isCard = c => Array.isArray(c) && c.length === 2 && c.every(Number.isInteger) && c[0] >= 1 && c[0] <= c[1];
export const cardsOf = (q, b) => q.mode === 'widen' ? {...q.cards, [q.edit]: b.card} : q.mode === 'playground' ? b.cards : q.cards;
const totalOf = (q, len) => q.total.strips.reduce((t, s) => t + len[s], 0);
export const fits = (q, cards, len) => object(len) && sameKeys(len, cards) && Object.keys(cards).every(s => Number.isInteger(len[s]) && len[s] >= cards[s][0] && len[s] <= cards[s][1]) && (!q.total || totalOf(q, len) === q.total.sum);
const settingCache = new Map();
// Every setting, in order: the first strip slowest.
export function settings(q, cards) {
  const key = JSON.stringify([cards, q.total || null]);
  if (settingCache.has(key)) return settingCache.get(key);
  let out = [{}];
  for (const s of Object.keys(cards)) out = out.flatMap(len => Array.from({length: cards[s][1] - cards[s][0] + 1}, (_, k) => ({...len, [s]: cards[s][0] + k})));
  out = out.filter(len => !q.total || totalOf(q, len) === q.total.sum);
  settingCache.set(key, out);
  return out;
}
export const endOf = (row, len) => row.reduce((t, piece) => t + (typeof piece === 'number' ? piece : len[piece]), 0);
// What a puzzle measures: the end of the first row, or the gap of each pair
// of rows (top end less bottom end).
export const measures = q => q.mode === 'gap' ? q.pairs.map(([t, u]) => len => endOf(q.rows[t], len) - endOf(q.rows[u], len)) : [len => endOf(q.rows[0], len)];
// The least and greatest of each measure, each with the first setting that makes it.
const extremeCache = new Map();
export function extremes(q, cards) {
  const key = JSON.stringify([q.mode, q.rows, q.pairs || null, q.total || null, cards]);
  if (extremeCache.has(key)) return extremeCache.get(key);
  const all = settings(q, cards);
  const out = measures(q).map(m => {
    let low = all[0], high = all[0];
    for (const len of all) { if (m(len) < m(low)) low = len; if (m(len) > m(high)) high = len; }
    return {lo: m(low), hi: m(high), low, high};
  });
  extremeCache.set(key, out);
  return out;
}
// The lengths a strip's end can reach from this setting: its band, cut by a
// locked total.
export function reach(q, cards, len, s) {
  let [lo, hi] = cards[s];
  if (q.total?.strips.includes(s)) {
    const other = q.total.strips.find(t => t !== s), [a, b] = cards[other];
    lo = Math.max(lo, q.total.sum - b); hi = Math.min(hi, q.total.sum - a);
  }
  return [lo, hi];
}
// Setting one strip; a locked partner takes up the rest of the total.
export function withLength(q, len, s, v) {
  const next = {...len, [s]: v};
  if (q.total?.strips.includes(s)) { const other = q.total.strips.find(t => t !== s); next[other] = q.total.sum - v; }
  return next;
}

// --- Claims ---------------------------------------------------------------------
const outside = (q, v) => v < q.window[0] || v > q.window[1];
export const joinEnd = (q, len) => endOf(q.rows[0], len);
export const breakable = (q, cards = q.cards) => { const [e] = extremes(q, cards); return outside(q, e.lo) || outside(q, e.hi); };
// Widening: the largest right end a card may take keeps the first row on the ruler.
export const maxHi = q => q.ruler - q.rows[0].reduce((t, piece) => t + (piece === q.edit ? 0 : typeof piece === 'number' ? piece : q.cards[piece][1]), 0);
export const validCard = (q, c) => isCard(c) && c[1] <= maxHi(q);
export const safe = (q, card) => !breakable(q, {...q.cards, [q.edit]: card});
const widestCache = new Map();
// Every widest safe card (a puzzle has one).
export function widest(q) {
  const key = JSON.stringify([q.cards, q.edit, q.window, q.rows[0], q.ruler]);
  if (widestCache.has(key)) return widestCache.get(key);
  const safeCards = [];
  for (let lo = 1; lo <= maxHi(q); lo++) for (let hi = lo; hi <= maxHi(q); hi++) if (safe(q, [lo, hi])) safeCards.push([lo, hi]);
  const w = Math.max(...safeCards.map(c => c[1] - c[0]));
  const out = safeCards.filter(c => c[1] - c[0] === w);
  widestCache.set(key, out);
  return out;
}
const isWidest = (q, card) => widest(q).some(c => c[0] === card[0] && c[1] === card[1]);
// The app's attack on a card: a setting whose join escapes, or, when none
// does, the extreme nearest an edge of the window.
export function attack(q, card) {
  const cards = {...q.cards, [q.edit]: card}, [e] = extremes(q, cards);
  if (e.lo < q.window[0]) return {...e.low};
  if (e.hi > q.window[1]) return {...e.high};
  return {...(e.lo - q.window[0] <= q.window[1] - e.hi ? e.low : e.high)};
}

// --- Boards ---------------------------------------------------------------------
// break: {len, tried, cant, pins, told}   widen: {card, len, claim, pins, told}
// gap: {len, pins, told}                  playground: {cards, len}
// `cant` and `claim` are null, 'yes' (accepted) or 'no' (refused). The
// certificate is two pinned settings, judged when the second is pinned: the
// shortest and the longest join (after a right Can't or Widest), or settings
// making every pair's biggest and smallest gap. A wrong pair is refused with
// `told` ('shorter', 'longer', 'bigger' or 'smaller'), the pins clear, and the
// refusal stays (through Undo) until a strip moves or a new pin goes in.
// The largest right end a band may take in the playground keeps the join on the ruler.
const playTop = (q, cards, s) => q.ruler - q.rows[0].filter(o => o !== s).reduce((t, o) => t + cards[o][1], 0);
const cardTop = (q, cards, s) => q.mode === 'widen' ? maxHi(q) : playTop(q, cards, s);
const TOLD = {break: ['shorter', 'longer'], widen: ['shorter', 'longer'], gap: ['bigger', 'smaller']};
// What is wrong with two pins, or null when they are the certificate.
export function judge(q, cards, pins) {
  const e = extremes(q, cards), ms = measures(q);
  for (let i = 0; i < ms.length; i++) {
    const v = pins.map(len => ms[i](len)), lo = Math.min(...v), hi = Math.max(...v);
    if (q.mode === 'gap') { if (hi < e[i].hi) return 'bigger'; if (lo > e[i].lo) return 'smaller'; }
    else { if (lo > e[i].lo) return 'shorter'; if (hi < e[i].hi) return 'longer'; }
  }
  return null;
}
const pinning = (q, b) => q.mode === 'gap' || (q.mode === 'break' && b.cant === 'yes') || (q.mode === 'widen' && b.claim === 'yes');
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {cards: structuredClone(q.cards), len: {...q.start}};
  if (q.mode === 'widen') return {card: [...q.cards[q.edit]], len: attack(q, q.cards[q.edit]), claim: null, pins: [], told: null};
  if (q.mode === 'gap') return {len: {...q.start}, pins: [], told: null};
  return {len: {...q.start}, tried: false, cant: null, pins: [], told: null};
}
function validPins(q, b, cards) {
  if (!Array.isArray(b.pins) || b.pins.length > 2 || !b.pins.every(len => fits(q, cards, len))) return false;
  if (b.pins.length && !pinning(q, b)) return false;
  if (b.pins.length === 2 && judge(q, cards, b.pins)) return false;
  return b.told === null || (TOLD[q.mode].includes(b.told) && pinning(q, b) && !b.pins.length);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    return sameKeys(b, {cards: 0, len: 0}) && object(b.cards) && sameKeys(b.cards, q.cards) && Object.values(b.cards).every(isCard) && endOf(q.rows[0], Object.fromEntries(Object.entries(b.cards).map(([s, c]) => [s, c[1]]))) <= q.ruler && fits(q, b.cards, b.len);
  }
  if (q.mode === 'widen') {
    if (!sameKeys(b, {card: 0, len: 0, claim: 0, pins: 0, told: 0}) || !validCard(q, b.card) || ![null, 'yes', 'no'].includes(b.claim)) return false;
    const cards = cardsOf(q, b), right = safe(q, b.card) && isWidest(q, b.card);
    if (!fits(q, cards, b.len) || !validPins(q, b, cards)) return false;
    if (b.claim === 'yes') return right;
    // Before a right claim, the strips show the app's attack.
    return JSON.stringify(b.len) === JSON.stringify(attack(q, b.card)) && (b.claim !== 'no' || !right);
  }
  if (q.mode === 'gap') return sameKeys(b, {len: 0, pins: 0, told: 0}) && fits(q, q.cards, b.len) && validPins(q, b, q.cards);
  if (!sameKeys(b, {len: 0, tried: 0, cant: 0, pins: 0, told: 0}) || typeof b.tried !== 'boolean' || ![null, 'yes', 'no'].includes(b.cant)) return false;
  if (!fits(q, q.cards, b.len) || !validPins(q, b, q.cards)) return false;
  if (b.cant === 'yes') return b.tried && !breakable(q);
  return b.cant !== 'no' || breakable(q);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'break' && outside(q, joinEnd(q, b.len))) return true;
  return pinning(q, b) && b.pins.length === 2;
}
// The strips that can move now: every strip, except before a right Widest.
const canSet = (q, b) => q.mode !== 'widen' || b.claim === 'yes';
const canCard = (q, b) => q.mode === 'playground' || (q.mode === 'widen' && b.claim !== 'yes');
function setLength(q, b, s, v) {
  const cards = cardsOf(q, b);
  if (!canSet(q, b) || !Object.hasOwn(cards, s) || !Number.isInteger(v) || v === b.len[s]) return null;
  const [lo, hi] = reach(q, cards, b.len, s);
  if (v < lo || v > hi) return null;
  const len = withLength(q, b.len, s, v);
  if (q.mode === 'playground') return {...b, len};
  return {...b, len, told: null, ...(q.mode === 'break' ? {tried: true} : {})};
}
function setCard(q, b, s, end, v) {
  if (!canCard(q, b) || !['lo', 'hi'].includes(end) || !Number.isInteger(v)) return null;
  if (q.mode === 'widen') {
    if (s !== q.edit) return null;
    const card = end === 'lo' ? [v, b.card[1]] : [b.card[0], v];
    if (!validCard(q, card) || card.join() === b.card.join()) return null;
    return {card, len: attack(q, card), claim: null, pins: [], told: null};
  }
  if (!Object.hasOwn(b.cards, s)) return null;
  const card = end === 'lo' ? [v, b.cards[s][1]] : [b.cards[s][0], v], cards = {...b.cards, [s]: card};
  if (!isCard(card) || card.join() === b.cards[s].join()) return null;
  // The strip's end stays inside its new band.
  const len = {...b.len, [s]: Math.max(card[0], Math.min(card[1], b.len[s]))}, next = {cards, len};
  return valid({parameters: q}, next) ? next : null;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (action.type === 'set') return setLength(q, b, action.strip, action.length);
  if (action.type === 'card') return setCard(q, b, action.strip, action.end, action.value);
  // Can't comes after a try; a refusal stays until Restart (Undo keeps it).
  if (action.type === 'cant' && q.mode === 'break' && b.tried && b.cant === null) return {...b, cant: breakable(q) ? 'no' : 'yes'};
  // A refused Widest waits for a change to the band.
  if (action.type === 'widest' && q.mode === 'widen' && b.claim === null) return {...b, claim: safe(q, b.card) && isWidest(q, b.card) ? 'yes' : 'no'};
  // A pin; the second is judged with the first.
  if (action.type === 'pin' && pinning(q, b)) {
    const pins = [...b.pins, {...b.len}];
    if (pins.length < 2) return {...b, pins, told: null};
    const wrong = judge(q, cardsOf(q, b), pins);
    return wrong ? {...b, pins: [], told: wrong} : {...b, pins, told: null};
  }
  return null;
}

// --- Hints ----------------------------------------------------------------------
// Toward a target setting: change the first strip that differs, partner
// strips of a locked total once.
function toward(q, b, target) {
  const s = stripsOf(q).find(t => b.len[t] !== target[t]);
  return s === undefined ? null : {type: 'move', action: {type: 'set', strip: s, length: target[s]}, text: `Make ${s} ${target[s]} long.`};
}
const lowAll = (q, cards) => Object.fromEntries(stripsOf(q).map(s => [s, cards[s][0]]));
const highAll = (q, cards) => Object.fromEntries(stripsOf(q).map(s => [s, cards[s][1]]));
const same = (x, y) => stripsOf({cards: x}).every(s => x[s] === y[s]);
// Every pair of settings that, pinned together, is the certificate.
const pairCache = new Map();
export function certificates(q, cards) {
  const key = JSON.stringify([q.mode, q.rows, q.pairs || null, q.total || null, cards]);
  if (!pairCache.has(key)) {
    const all = settings(q, cards), out = [];
    for (const x of all) for (const y of all) if (!judge(q, cards, [x, y])) out.push([x, y]);
    pairCache.set(key, out);
  }
  return pairCache.get(key);
}
// The next pin: the partner of the one pinned, or the nearer of a pair.
function pinPlan(q, b, cards) {
  const off = len => stripsOf(q).filter(s => len[s] !== b.len[s]).length;
  const pairs = certificates(q, cards).filter(([x]) => !b.pins.length || same(x, b.pins[0]));
  if (!pairs.length) return {type: 'deadend', text: q.mode === 'gap' ? 'That pin is not a biggest or a smallest gap.' : 'That pin is not the shortest or the longest join.'};
  const target = b.pins.length ? pairs.map(([, y]) => y).reduce((u, v) => off(v) < off(u) ? v : u) : pairs.map(([x]) => x).reduce((u, v) => off(v) < off(u) ? v : u);
  const step = toward(q, b, target);
  if (step) return step;
  const e = extremes(q, cards), ms = measures(q), i = Math.max(0, e.findIndex(x => x.lo < x.hi)), top = ms[i](b.len) === e[i].hi;
  return {type: 'move', action: {type: 'pin'}, text: q.mode === 'gap' ? `This is the ${top ? 'biggest' : 'smallest'} gap.` : `This is the ${top ? 'longest' : 'shortest'} join.`};
}
const sideWords = end => end === 'lo' ? 'left' : 'right';
function plan(p, b) {
  const q = p.parameters, cards = cardsOf(q, b);
  if (pinning(q, b)) return pinPlan(q, b, cards);
  if (q.mode === 'widen') {
    const [goal] = widest(q), card = b.card;
    if (card.join() !== goal.join()) {
      // Move the end that keeps the band in one piece first.
      const end = goal[0] <= card[1] && card[0] !== goal[0] ? 'lo' : 'hi';
      return {type: 'move', action: {type: 'card', strip: q.edit, end, value: goal[end === 'lo' ? 0 : 1]}, text: `Move the ${sideWords(end)} end of ${q.edit}’s band to ${goal[end === 'lo' ? 0 : 1]}.`};
    }
    // The reason, never "Press Widest": a second Hint marks the button.
    return {type: 'move', action: {type: 'widest'}, text: `The shortest join ends at ${q.window[0]} and the longest at ${q.window[1]}, right on the edges.`};
  }
  const [e] = extremes(q, cards);
  if (breakable(q)) return toward(q, b, e.lo < q.window[0] ? lowAll(q, cards) : highAll(q, cards));
  // Try the shortest join first; its reason comes before Can't.
  const short = toward(q, b, lowAll(q, cards));
  if (short && (!b.tried || joinEnd(q, b.len) !== e.lo)) return short;
  if (!b.tried) return toward(q, b, highAll(q, cards));
  return {type: 'move', action: {type: 'cant'}, text: `The shortest join ends at ${e.lo} and the longest at ${e.hi}, both inside the window.`};
}
function hint(p, b) {
  if (p.parameters.mode === 'playground') return {type: 'note'};
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return plan(p, b);
}

// --- Drawing --------------------------------------------------------------------
// One ruler, in units of U across. Card rows on top hold each strip's band
// and its end; result rows below lay strips and white pieces end to end from
// 0. A window on the ruler marks the app's claim; pine pins and bars keep
// the extremes the child has made.
const U = 10, PAD = 7, CARD_H = 18, ROW_H = 13, KEPT_H = 8, RULER_H = 15;
// A band's handles are tabs at the top of its row, just outside each end of
// the band; the strip's end is a knob in the middle.
const HANDLE_Y = 4.1 / CARD_H;
const X = v => PAD + v * U;
const f = n => Number(n.toFixed(2));
const COLORS = ['sun', 'sky', 'rose'];
const colorOf = (q, s) => COLORS[stripsOf(q).indexOf(s)] || 'sun';
const lengthWords = v => `${v} ${v === 1 ? 'unit' : 'units'}`;
// Where everything goes, top to bottom.
function layout(q) {
  let y = 4;
  const cards = stripsOf(q).map(s => { const top = y; y += CARD_H; return {s, top}; });
  y += 7;
  const rows = [], kept = [];
  // Each pair of a gap puzzle is a group with a lane for its kept gaps below;
  // a row in no pair (a locked total) stands alone.
  const groups = q.mode === 'gap'
    ? [...q.pairs.map((rowsOf, k) => ({rowsOf, k})), ...q.rows.map((_, i) => i).filter(i => !q.pairs.flat().includes(i)).map(i => ({rowsOf: [i], k: null}))].sort((g, h) => Math.min(...g.rowsOf) - Math.min(...h.rowsOf))
    : [{rowsOf: q.rows.map((_, i) => i), k: q.mode === 'playground' ? null : 0}];
  groups.forEach(({rowsOf, k}, g) => {
    if (g) y += 6;
    for (const i of rowsOf) { rows[i] = y; y += ROW_H; }
    if (k !== null) { kept[k] = y; y += KEPT_H; }
  });
  return {cards, rows, kept, ruler: y + 2, height: y + 2 + RULER_H, width: X(q.ruler) + PAD};
}
function cardRow(q, b, s, top, view) {
  const cards = cardsOf(q, b), [lo, hi] = cards[s], v = b.len[s], c = colorOf(q, s), mid = top + CARD_H / 2;
  const editing = view.live && canCard(q, b) && (q.mode === 'playground' || s === q.edit), setting = view.live && canSet(q, b);
  const [rlo, rhi] = reach(q, cards, b.len, s);
  const parts = [`<rect class="rg-band b-${c}" x="${X(lo)}" y="${top + 3}" width="${(hi - lo) * U}" height="${CARD_H - 6}" rx="2"/>`];
  parts.push(`<rect class="rg-strip s-${c}" x="${X(0)}" y="${mid - 4}" width="${v * U}" height="8" rx="1.5"/><text class="rg-letter" x="${X(0) + 3}" y="${mid + 2.4}">${s}</text>`);
  const shown = view.shown;
  if (shown?.type === 'set' && shown.strip === s) parts.push(`<line class="rg-aim" x1="${X(shown.length)}" y1="${top + 1}" x2="${X(shown.length)}" y2="${top + CARD_H - 1}"/>`);
  if (shown?.type === 'card' && shown.strip === s) parts.push(`<line class="rg-aim" x1="${X(shown.value)}" y1="${top}" x2="${X(shown.value)}" y2="${top + CARD_H}"/>`);
  // The hit area covers the whole row: a press goes to the nearest control in it.
  if (view.live && (editing || setting)) parts.push(`<rect class="rg-hit" data-rg-row="${s}" x="0" y="${top}" width="${X(q.ruler) + PAD}" height="${CARD_H}"/>`);
  if (editing) {
    for (const [end, at] of [['lo', lo], ['hi', hi]]) {
      const [min, max] = end === 'lo' ? [1, hi] : [lo, cardTop(q, cards, s)];
      parts.push(`<g class="rg-handle${shown?.type === 'card' && shown.strip === s && shown.end === end ? ' hinted' : ''}" data-rg-target='${JSON.stringify({kind: 'card', strip: s, end})}' data-focus="rg-card-${s}-${end}" tabindex="0" role="slider" aria-label="${s}’s band, ${sideWords(end)} end" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${at}" aria-valuetext="${lengthWords(at)}" transform="translate(${X(at)},${top})"><rect x="${end === 'lo' ? -5.2 : 0}" y="0.3" width="5.2" height="7.6" rx="1.8"/><line x1="0" y1="0.3" x2="0" y2="${CARD_H - 3}"/></g>`);
    }
  }
  if (setting) parts.push(`<g class="rg-knob${shown?.type === 'set' && shown.strip === s ? ' hinted' : ''}" data-rg-target='${JSON.stringify({kind: 'set', strip: s})}' data-focus="rg-knob-${s}" tabindex="0" role="slider" aria-label="${s}’s end" aria-valuemin="${rlo}" aria-valuemax="${rhi}" aria-valuenow="${v}" aria-valuetext="${lengthWords(v)}" transform="translate(${X(v)},${mid})"><circle r="4.4"/></g>`);
  else parts.push(`<line class="rg-endmark" x1="${X(v)}" y1="${mid - 5}" x2="${X(v)}" y2="${mid + 5}"/>`);
  return `<g class="rg-card">${parts.join('')}</g>`;
}
function resultRow(q, b, i, top) {
  const row = q.rows[i];
  let at = 0;
  const pieces = row.map(piece => {
    const w = typeof piece === 'number' ? piece : b.len[piece], x = X(at);
    at += w;
    if (typeof piece === 'number') return `<rect class="rg-white" x="${x}" y="${top + 2}" width="${w * U}" height="${ROW_H - 4}" rx="1.5"/><text class="rg-num" x="${f(x + w * U / 2)}" y="${top + ROW_H / 2 + 2.2}">${piece}</text>`;
    return `<rect class="rg-strip s-${colorOf(q, piece)}" x="${x}" y="${top + 2}" width="${w * U}" height="${ROW_H - 4}" rx="1.5"/><text class="rg-letter" x="${x + 3}" y="${top + ROW_H / 2 + 2.2}">${piece}</text>`;
  }).join('');
  // A locked total's row ends against a wall at the sum.
  const wall = q.total && row.length > 1 && row.every(piece => q.total.strips.includes(piece)) ? `<rect class="rg-wall" x="${X(q.total.sum)}" y="${top}" width="2.4" height="${ROW_H}" rx="1"/>` : '';
  return pieces + wall;
}
const keptBar = (x1, x2, y, cls) => `<g class="rg-kept ${cls}"><rect x="${x1}" y="${y}" width="${Math.max(x2 - x1, 0.8)}" height="2"/><rect x="${x1 - 0.6}" y="${y - 1.5}" width="1.2" height="5"/><rect x="${x2 - 0.6}" y="${y - 1.5}" width="1.2" height="5"/></g>`;
function drawBoard(p, b, view) {
  const q = p.parameters, L = layout(q), parts = [], top = Math.min(...L.rows), bottom = L.ruler;
  // Faint unit lines through every row, then the ruler.
  for (let v = 0; v <= q.ruler; v++) parts.push(`<line class="rg-grid" x1="${X(v)}" y1="2" x2="${X(v)}" y2="${bottom}"/>`);
  if (q.window) {
    const bad = q.mode === 'break' && outside(q, joinEnd(q, b.len)) || (q.mode === 'widen' && b.claim !== 'yes' && outside(q, joinEnd(q, b.len)));
    parts.push(`<rect class="rg-window${bad ? ' broken' : ''}" x="${X(q.window[0])}" y="${top - 3}" width="${(q.window[1] - q.window[0]) * U}" height="${bottom - top + 3}"/>`);
  }
  for (const {s, top: y} of L.cards) parts.push(cardRow(q, b, s, y, view));
  parts.push(`<line class="rg-split" x1="${PAD - 4}" y1="${top - 4}" x2="${X(q.ruler) + 4}" y2="${top - 4}"/>`);
  q.rows.forEach((_, i) => parts.push(resultRow(q, b, i, L.rows[i])));
  if (q.mode === 'gap') {
    q.pairs.forEach(([t, u], g) => {
      const a = endOf(q.rows[t], b.len), c = endOf(q.rows[u], b.len);
      parts.push(`<rect class="rg-gap" x="${X(Math.min(a, c))}" y="${L.rows[u] + 2}" width="${Math.abs(a - c) * U}" height="${ROW_H - 4}"/>`);
      b.pins.forEach((len, n) => parts.push(keptBar(X(endOf(q.rows[u], len)), X(endOf(q.rows[t], len)), L.kept[g] + (n ? 4.8 : 1.5), `pin${n}`)));
    });
  } else if (q.mode !== 'playground') {
    const end = joinEnd(q, b.len), bad = outside(q, end);
    parts.push(`<line class="rg-end${bad ? ' broken' : ''}" x1="${X(end)}" y1="${top}" x2="${X(end)}" y2="${bottom}"/>`);
    const y = L.kept[0] + 3;
    if (b.pins.length === 2) parts.push(keptBar(X(Math.min(...b.pins.map(len => joinEnd(q, len)))), X(Math.max(...b.pins.map(len => joinEnd(q, len)))), y, 'span'));
    for (const len of b.pins) { const x = X(joinEnd(q, len)); parts.push(`<path class="rg-pin" d="M${x} ${y - 2.5}l3.2 6h-6.4z"/>`); }
  } else {
    const end = joinEnd(q, b.len);
    parts.push(`<line class="rg-end" x1="${X(end)}" y1="${top}" x2="${X(end)}" y2="${bottom}"/>`);
  }
  parts.push(`<line class="rg-ruler" x1="${X(0)}" y1="${bottom}" x2="${X(q.ruler)}" y2="${bottom}"/>`);
  for (let v = 0; v <= q.ruler; v++) parts.push(`<line class="rg-tick" x1="${X(v)}" y1="${bottom}" x2="${X(v)}" y2="${bottom + 3}"/><text class="rg-mark" x="${X(v)}" y="${bottom + 10}">${v}</text>`);
  return parts.join('');
}
// The words a screen reader hears after each move.
function describe(q, b, done) {
  const cards = cardsOf(q, b), lens = stripsOf(q).map(s => `${s} ${b.len[s]} (band ${cards[s][0]} to ${cards[s][1]})`).join(', ');
  if (q.mode === 'gap') {
    const gaps = q.pairs.map((_, g) => { const m = measures(q)[g]; return `gap ${m(b.len)}${b.pins.length ? `, pinned ${b.pins.map(len => m(len)).join(' and ')}` : ''}`; });
    return `${lens}. ${gaps.join('; ')}.`;
  }
  if (q.mode === 'playground') return `${lens}. The join ends at ${joinEnd(q, b.len)}.`;
  const end = joinEnd(q, b.len), kept = b.pins.length ? `Pinned: ${b.pins.map(len => joinEnd(q, len)).join(' and ')}` : '';
  return `${lens}. The join ends at ${end}${outside(q, end) ? ', outside' : ''}.${kept ? ` ${kept}.` : ''}${done && !outside(q, end) ? ` Every join ends from ${q.window[0]} to ${q.window[1]}.` : ''}`;
}
// Can’t, Widest and Pin are claims: their focus key names the board's first
// control, so after a press focus goes back to the strips (or, when that
// control is gone, to the family's focus), never to a claim button.
const moveButton = (label, action, enabled, hinted, home) => `<button type="button" class="secondary rg-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${home}" ${enabled ? '' : 'disabled'}>${label}</button>`;
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? plan(p, b)?.action : null;
  const L = layout(q), live = !done;
  const svg = `<svg class="rg-board" data-rg-board viewBox="0 0 ${L.width} ${L.height}" style="--rg-aspect:${f(L.width / L.height)}" role="group" aria-label="Strips on a ruler"><g class="rg-live">${drawBoard(p, b, {live, shown})}</g></svg>`;
  let bar = '', note = '';
  const home = svg.match(/data-focus="(rg-(?:knob|card)-[^"]+)"/)?.[1] || 'rg-board';
  if (q.mode === 'break' && !done && b.cant !== 'yes') bar = moveButton('Can’t', {type: 'cant'}, b.tried && b.cant === null, shown?.type === 'cant', home);
  if (q.mode === 'widen' && !done && b.claim !== 'yes') bar = moveButton('Widest', {type: 'widest'}, b.claim === null, shown?.type === 'widest', home);
  if (!done && pinning(q, b)) bar = moveButton('Pin', {type: 'pin'}, true, shown?.type === 'pin', home);
  const TOLD_WORDS = {shorter: 'A join can be shorter.', longer: 'A join can be longer.', bigger: 'A gap can be bigger.', smaller: 'A gap can be smaller.'};
  if (done) note = '';
  else if (b.cant === 'no') note = 'It can break.';
  else if (b.claim === 'no') note = safe(q, b.card) ? 'It can be wider.' : 'A join lands outside.';
  else if (b.told) note = TOLD_WORDS[b.told];
  else if ((b.cant === 'yes' || b.claim === 'yes') && !b.pins.length) note = 'Pin the shortest and the longest join.';
  const status = describe(q, b, done);
  return `<div class="rg-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="ranges">${svg}${bar ? `<div class="rg-bar">${bar}</div>` : ''}${note ? `<p class="rg-note">${esc(note)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Drags, taps and keys -------------------------------------------------------
// A press on a card row goes to the nearest control in that row: the strip's
// end, or an end of an editable band. Dragging moves it along the ruler and
// the board follows; letting go makes one move (one Undo). A tap moves it to
// the tapped unit, held inside what it can reach. Arrow keys move a focused
// end by one unit; Home and End go to the ends of its reach.
export function targetsIn(q, b, s) {
  const out = [];
  if (canSet(q, b)) out.push({kind: 'set', strip: s, at: b.len[s], y: 0.5});
  if (canCard(q, b) && (q.mode === 'playground' || s === q.edit)) { const c = cardsOf(q, b)[s]; out.push({kind: 'card', strip: s, end: 'lo', at: c[0], dx: -0.26, y: HANDLE_Y}, {kind: 'card', strip: s, end: 'hi', at: c[1], dx: 0.26, y: HANDLE_Y}); }
  return out;
}
// The nearest target to a press at unit position x and height fraction y in
// the row. When a band's two ends meet, the side of the press picks.
export function nearestTarget(q, b, s, x, y) {
  const d = t => Math.hypot(t.at + (t.dx || 0) - x, (t.y - y) * CARD_H / U);
  const all = targetsIn(q, b, s).sort((t, u) => d(t) - d(u));
  const [first, second] = all;
  if (second && first.kind === 'card' && second.kind === 'card' && first.at === second.at) return x > first.at ? all.find(t => t.end === 'hi') : all.find(t => t.end === 'lo');
  return first || null;
}
export function actionFor(q, b, t, v) {
  const cards = cardsOf(q, b);
  if (t.kind === 'set') { const [lo, hi] = reach(q, cards, b.len, t.strip); return {type: 'set', strip: t.strip, length: Math.max(lo, Math.min(hi, v))}; }
  const c = cards[t.strip], value = t.end === 'lo' ? Math.max(1, Math.min(c[1], v)) : Math.max(c[0], Math.min(cardTop(q, cards, t.strip), v));
  return {type: 'card', strip: t.strip, end: t.end, value};
}
let gesture = null, listening = false;
const unitAt = (svg, x, y) => {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const r = pt.matrixTransform(m.inverse());
  return {v: (r.x - PAD) / U, y: r.y};
};
function preview(g, action) {
  const b = g.api.attempt().board, next = move(g.p, b, action) || b;
  const live = g.svg.querySelector('.rg-live');
  if (live) live.innerHTML = drawBoard(g.p, next, {live: true, shown: null});
}
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  const at = unitAt(g.svg, e.clientX, e.clientY);
  if (!at) return;
  const action = actionFor(g.p.parameters, g.api.attempt().board, g.target, Math.round(at.v));
  if (JSON.stringify(action) === JSON.stringify(g.action)) return;
  g.action = action;
  g.moved = true;
  preview(g, action);
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  g.root.classList.remove('dragging');
  if (e.type === 'pointerup' && g.action && move(g.p, g.api.attempt().board, g.action)) { g.api.apply(g.action); return; }
  if (g.moved) g.api.ui({});
}
function wire(root, p, api) {
  const svg = root.querySelector('[data-rg-board]'), q = p.parameters;
  if (!svg) return;
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const hit = e.target.closest?.('.rg-card')?.querySelector('[data-rg-row]');
    const b = api.attempt().board;
    if (!hit || solved(p, b)) return;
    const at = unitAt(svg, e.clientX, e.clientY), s = hit.dataset.rgRow;
    if (!at) return;
    const top = Number(hit.getAttribute('y')), target = nearestTarget(q, b, s, at.v, (at.y - top) / CARD_H);
    if (!target) return;
    e.preventDefault();
    const action = actionFor(q, b, target, Math.round(at.v));
    gesture = {pointer: e.pointerId, svg, root, api, p, target, action, moved: false};
    root.classList.add('dragging');
    preview(gesture, action);
  });
  svg.addEventListener('keydown', e => {
    const el = e.target.closest?.('[data-rg-target]');
    if (!el || e.altKey || e.ctrlKey || e.metaKey) return;
    const b = api.attempt().board;
    if (solved(p, b)) return;
    const t = JSON.parse(el.dataset.rgTarget), now = t.kind === 'set' ? b.len[t.strip] : cardsOf(q, b)[t.strip][t.end === 'lo' ? 0 : 1];
    const step = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[e.key];
    const v = step ? now + step : e.key === 'Home' ? -Infinity : e.key === 'End' ? Infinity : null;
    if (v === null) return;
    e.preventDefault();
    const action = actionFor(q, b, t, v);
    if (move(p, b, action)) api.apply(action);
  });
}

export const rangeMechanics = {
  ranges: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo keeps a refused Can't, a refused Widest on the same band, and a
    // refused pair of pins (the pins stay cleared) while the strips are where
    // the refusal found them.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to) || q.mode === 'playground') return to;
      let next = to;
      if (q.mode === 'break' && from.cant === 'no') next = {...next, cant: 'no'};
      if (q.mode === 'widen' && from.claim === 'no' && next.claim === null && from.card.join() === next.card.join()) next = {...next, claim: 'no'};
      if (from.told && JSON.stringify(from.len) === JSON.stringify(next.len)) next = {...next, pins: [], told: from.told};
      return valid(p, next) ? next : to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'ranges',
  family: {id: 'ranges', symbol: '↔'},
  mechanics: rangeMechanics,
  pack: new URL('./ranges.json', import.meta.url).href,
  css: new URL('./ranges.css', import.meta.url).href,
  focus: '.rg-knob,.rg-handle'
};
