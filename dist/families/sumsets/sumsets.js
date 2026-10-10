// Card totals (worksheet Week 55, few sums and equal spacing). The child puts
// number cards 0–9 into two trays, A and B. Every card in A pairs with every
// card in B, and each pair drops a token on a strip at its total, 0 to 18;
// pairs with the same total share a token. The strip is the sumset
// A + B = {a + b}.
//
// The theorem: with m cards in A and n in B there are at least m + n − 1 and
// at most m × n different totals. The proof of the lower bound is a route in
// the addition grid (A going up, B going across, each dot holding a + b) from
// the bottom-left dot to the top-right one, one step right or up at a time:
// every step adds to the total, so the route's m + n − 1 totals are all
// different. When every total on the strip lies on one route, no cards of
// these sizes can make fewer, and the child traces that route to finish a
// "fewest" puzzle. With m, n ≥ 2 that happens exactly when A and B are evenly
// spaced with the same gap; a one-card tray only shifts the other, so any B
// works then. The upper bound is one token per pair.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const TOP = 9;
export const STRIP = 18;
export const TRAYS = ['A', 'B'];
export const MODES = ['fewest', 'fit', 'most', 'every', 'playground'];

// --- Totals -------------------------------------------------------------------
export const totalsOf = (A, B) => [...new Set(A.flatMap(a => B.map(b => a + b)))].sort((x, y) => x - y);
export function pairCounts(A, B) {
  const c = new Map();
  for (const a of A) for (const b of B) c.set(a + b, (c.get(a + b) || 0) + 1);
  return c;
}
export const evenlySpaced = X => X.every((x, k) => k < 2 || x - X[k - 1] === X[1] - X[0]);
const same = (X, Y) => X.length === Y.length && X.every((x, k) => x === Y[k]);
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// --- Trays ----------------------------------------------------------------------
// A tray is {fixed: [cards]} (given, not changed), {size: n} (exactly n cards)
// or {max: n} (one to n cards).
export const fixedOf = (q, t) => q.trays[t].fixed || null;
export const capOf = (q, t) => { const r = q.trays[t]; return r.fixed ? r.fixed.length : r.size ?? r.max; };
const ready = (q, t, X) => { const r = q.trays[t]; return r.fixed ? true : r.size ? X.length === r.size : X.length >= 1; };
export const full = (q, b) => TRAYS.every(t => ready(q, t, b[t]));
const routing = q => q.mode === 'fewest' || q.mode === 'fit' || q.mode === 'playground';
function validTray(q, t, X) {
  if (!Array.isArray(X) || X.length > capOf(q, t)) return false;
  if (!X.every((x, k) => Number.isInteger(x) && x >= 0 && x <= TOP && (k === 0 || x > X[k - 1]))) return false;
  return !fixedOf(q, t) || same(X, fixedOf(q, t));
}

// --- Routes ---------------------------------------------------------------------
// A route is a list of grid cells [i, j]: row i holds A's i-th card from the
// bottom, column j B's j-th card from the left. It starts at [0, 0] and each
// step goes right (j + 1) or up (i + 1).
const sameCell = (c, d) => c[0] === d[0] && c[1] === d[1];
export const routeTotals = (b, route = b.route) => route.map(([i, j]) => b.A[i] + b.B[j]);
export const climbs = totals => totals.every((x, k) => k === 0 || x > totals[k - 1]);
export const routeDone = b => b.route.length > 0 && sameCell(b.route.at(-1), [b.A.length - 1, b.B.length - 1]);
// Totals on the strip that the route misses.
export function missed(b) {
  const on = new Set(routeTotals(b));
  return totalsOf(b.A, b.B).filter(x => !on.has(x));
}
export const routeProves = b => routeDone(b) && climbs(routeTotals(b)) && missed(b).length === 0;
// The cells a route may step to next.
export function nextCells(b) {
  if (!b.route.length) return [[0, 0]];
  const [i, j] = b.route.at(-1), out = [];
  if (j + 1 < b.B.length) out.push([i, j + 1]);
  if (i + 1 < b.A.length) out.push([i + 1, j]);
  return out;
}
function validRoute(q, b) {
  const r = b.route;
  if (!Array.isArray(r)) return false;
  if (!r.length) return true;
  if (!routing(q) || !full(q, b)) return false;
  return r.every((c, k) => Array.isArray(c) && c.length === 2 && c.every(Number.isInteger) && c[0] >= 0 && c[1] >= 0 && c[0] < b.A.length && c[1] < b.B.length &&
    (k === 0 ? sameCell(c, [0, 0]) : (c[0] - r[k - 1][0]) + (c[1] - r[k - 1][1]) === 1 && c[0] >= r[k - 1][0] && c[1] >= r[k - 1][1]));
}

// --- Designs ---------------------------------------------------------------------
// Every choice of cards the trays allow, in a fixed order (sizes up, then
// cards up), and the ones that solve. Computed once per puzzle.
const subsetCache = new Map();
export function subsets(k) {
  if (subsetCache.has(k)) return subsetCache.get(k);
  const out = [];
  (function go(from, set) { if (set.length === k) { out.push([...set]); return; } for (let x = from; x <= TOP; x++) go(x + 1, [...set, x]); })(0, []);
  subsetCache.set(k, out);
  return out;
}
const trayOptions = (q, t) => { const r = q.trays[t]; if (r.fixed) return [r.fixed]; if (r.size) return subsets(r.size); const out = []; for (let k = 1; k <= r.max; k++) out.push(...subsets(k)); return out; };
// Does a full design solve? (For fewest and fit, "every total on one route":
// a route has |A| + |B| − 1 different totals.)
const maskOf = X => X.reduce((m, x) => m | (1 << x), 0);
const bits = m => { let c = 0; for (; m; m &= m - 1) c++; return c; };
// The number of different totals, by shifting B's bitmask by each card of A.
export const totalCount = (A, B) => { const mb = maskOf(B); return bits(A.reduce((m, a) => m | (mb << a), 0)); };
export function goodDesign(q, A, B) {
  const n = totalCount(A, B);
  if (q.mode === 'fewest' || q.mode === 'fit') return n === A.length + B.length - 1;
  if (q.mode === 'most') return n === A.length * B.length && (!q.even || (evenlySpaced(A) && evenlySpaced(B)));
  if (q.mode === 'every') return B.length === q.trays.B.size && n === q.target;
  return false;
}
const designCache = new Map();
export function designs(q) {
  const key = JSON.stringify([q.mode, q.trays, q.target, q.even]);
  if (designCache.has(key)) return designCache.get(key);
  const out = [];
  for (const A of trayOptions(q, 'A')) for (const B of trayOptions(q, 'B')) if (goodDesign(q, A, B)) out.push({A, B});
  designCache.set(key, out);
  return out;
}
// The B trays that answer a find-every puzzle.
export const answersOf = q => designs(q).map(d => d.B);

// --- Boards -------------------------------------------------------------------------
// fewest, fit, playground: {A, B, route}     most: {A, B}
// every: {A, B, found, more, again, done}. `found` lists the B trays found, in
// order; a B that gives the target count joins it the moment it is made.
// `more` answers a That's all too soon and stays until a new B is found;
// `again` says the B just made was found already.
const KEYS = {fewest: 'A,B,route', fit: 'A,B,route', playground: 'A,B,route', most: 'A,B', every: 'A,B,again,done,found,more'};
function fresh(p) {
  const q = p.parameters, A = [...(fixedOf(q, 'A') || [])], B = [...(fixedOf(q, 'B') || [])];
  if (q.mode === 'every') return {A, B, found: [], more: false, again: false, done: false};
  if (q.mode === 'most') return {A, B};
  return {A, B, route: []};
}
function validEvery(q, b) {
  const answers = answersOf(q), keys = answers.map(X => X.join());
  if (!Array.isArray(b.found) || !b.found.every(X => Array.isArray(X) && keys.includes(X.join?.()))) return false;
  if (new Set(b.found.map(X => X.join())).size !== b.found.length) return false;
  if (![b.more, b.again, b.done].every(v => typeof v === 'boolean')) return false;
  const here = b.found.some(X => same(X, b.B));
  // A B that answers is found the moment it is made.
  if (keys.includes(b.B.join()) && b.B.length === q.trays.B.size && !here) return false;
  if (b.again && !here) return false;
  if (b.more && (b.found.length === answers.length || b.done)) return false;
  return !b.done || b.found.length === answers.length;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || !MODES.includes(q.mode) || Object.keys(b).sort().join() !== KEYS[q.mode]) return false;
  if (!TRAYS.every(t => validTray(q, t, b[t]))) return false;
  if (q.mode === 'every') return validEvery(q, b);
  if (q.mode === 'most') return true;
  return validRoute(q, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'every') return b.done;
  if (!full(q, b)) return false;
  if (q.mode === 'most') return goodDesign(q, b.A, b.B);
  return routeProves(b);
}

function cardMove(q, b, action) {
  const t = action.tray, k = action.card;
  if (!TRAYS.includes(t) || fixedOf(q, t) || !Number.isInteger(k) || k < 0 || k > TOP) return null;
  const X = b[t];
  let next;
  if (X.includes(k)) next = X.filter(x => x !== k);
  else if (X.length < capOf(q, t)) next = [...X, k].sort((x, y) => x - y);
  else return null;
  const board = {...b, [t]: next};
  if (routing(q)) return {...board, route: []};
  if (q.mode !== 'every') return board;
  const A = board.A, B = board.B;
  if (B.length === q.trays.B.size && totalsOf(A, B).length === q.target) {
    return b.found.some(X => same(X, B)) ? {...board, again: true} : {...board, found: [...b.found, B], more: false, again: false};
  }
  return {...board, again: false};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (action.type === 'card') return cardMove(q, b, action);
  if (routing(q) && action.type === 'step') {
    const c = action.cell;
    if (!full(q, b) || !Array.isArray(c) || !nextCells(b).some(d => sameCell(c, d))) return null;
    return {...b, route: [...b.route, [c[0], c[1]]]};
  }
  if (routing(q) && action.type === 'back') return b.route.length ? {...b, route: b.route.slice(0, -1)} : null;
  if (q.mode === 'every' && action.type === 'all' && !b.more) {
    return b.found.length === answersOf(q).length ? {...b, done: true, again: false} : {...b, more: true, again: false};
  }
  return null;
}

// --- Hints --------------------------------------------------------------------------
// The solving design nearest the trays (fewest cards to take out and put in),
// then the cards to change, taking out before putting in, then the route.
const apart = (X, Y) => X.filter(x => !Y.includes(x)).length + Y.filter(y => !X.includes(y)).length;
function nearest(list, b) {
  let best = null, cost = Infinity;
  for (const d of list) { const c = apart(b.A, d.A) + apart(b.B, d.B); if (c < cost) { best = d; cost = c; } }
  return best;
}
function cardHint(q, b, d) {
  for (const t of TRAYS) { const k = b[t].find(x => !d[t].includes(x)); if (k !== undefined) return {type: 'move', action: {type: 'card', tray: t, card: k}, text: `Take ${k} out of ${t}.`}; }
  for (const t of TRAYS) { const k = d[t].find(x => !b[t].includes(x)); if (k !== undefined) return {type: 'move', action: {type: 'card', tray: t, card: k}, text: `Put ${k} in ${t}.`}; }
  return null;
}
function routeHint(b) {
  if (!b.route.length) return {type: 'move', action: {type: 'step', cell: [0, 0]}, text: 'Start at the bottom-left dot.'};
  const [c] = nextCells(b), [i] = b.route.at(-1);
  return {type: 'move', action: {type: 'step', cell: c}, text: `Step ${c[0] > i ? 'up' : 'right'} to ${b.A[c[0]] + b.B[c[1]]}.`};
}
const hintCache = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintCache.has(key)) return hintCache.get(key);
  let h;
  if (q.mode === 'every') {
    const left = designs(q).filter(d => !b.found.some(X => same(X, d.B)));
    h = left.length ? cardHint(q, b, nearest(left, b)) : {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  } else {
    h = cardHint(q, b, nearest(designs(q), b)) || (routing(q) ? routeHint(b) : {type: 'done'});
  }
  if (hintCache.size > 2000) hintCache.clear();
  hintCache.set(key, h);
  return h;
}

// --- Drawing --------------------------------------------------------------------------
const f = n => Number(n.toFixed(3));
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}"`;
const hintedCard = (act, t, k) => act?.type === 'card' && act.tray === t && act.card === k;
function trayRow(q, b, t, done, act) {
  const X = b[t], fixed = fixedOf(q, t), cap = capOf(q, t), r = q.trays[t];
  const cards = Array.from({length: TOP + 1}, (_, k) => {
    const on = X.includes(k);
    if (fixed) return `<span class="ss-card${on ? ' on' : ' blank'}"${on ? '' : ' aria-hidden="true"'}>${on ? k : ''}</span>`;
    const can = !done && (on || X.length < cap);
    return `<button type="button" class="ss-card${on ? ' on' : ''}${hintedCard(act, t, k) ? ' hinted' : ''}" ${moveAttrs({type: 'card', tray: t, card: k}, `ss-${t}-${k}`)} aria-pressed="${on}" aria-label="${t} ${k}"${can ? '' : ' disabled'}>${k}</button>`;
  }).join('');
  const pips = r.size ? `<span class="ss-pips" aria-hidden="true">${Array.from({length: cap}, (_, k) => `<i class="${k < X.length ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const label = `${t}${fixed ? `: ${listWords(X)}` : r.size ? `, ${cap} cards` : ''}`;
  return `<div class="ss-tray t${t}${fixed ? ' fixed' : ''}" role="group" aria-label="${esc(label)}"><span class="ss-name" aria-hidden="true">${t}${pips}</span><div class="ss-cards">${cards}</div></div>`;
}
// The strip: one token per total, stacked where several pairs share it, ringed
// when a finished route misses it. New tokens drop in.
const lastTotals = new Map();
function strip(p, b, off) {
  const counts = pairCounts(b.A, b.B), before = lastTotals.get(p.id) || new Set();
  lastTotals.set(p.id, new Set(counts.keys()));
  const cells = Array.from({length: STRIP + 1}, (_, x) => {
    const k = counts.get(x) || 0;
    const token = k ? `<span class="ss-token${k > 1 ? ` k${Math.min(k, 3)}` : ''}${off.includes(x) ? ' off' : ''}${before.has(x) ? '' : ' drop'}"></span>` : '';
    return `<div class="ss-cell${k ? ' hit' : ''}"><span class="ss-slot">${token}</span><span class="ss-num">${x}</span></div>`;
  }).join('');
  const totals = [...counts.keys()].sort((x, y) => x - y);
  return `<div class="ss-strip" role="img" aria-label="${esc(totals.length ? `Totals: ${totals.join(', ')}` : 'No totals yet')}">${cells}</div>`;
}
function grid(q, b, done, act) {
  const m = b.A.length, n = b.B.length;
  if (!m || !n) return '';
  const counts = pairCounts(b.A, b.B), route = routing(q) ? b.route : [];
  const live = routing(q) && full(q, b) && !done, nexts = live ? nextCells(b) : [];
  const off = routing(q) && routeDone(b) ? missed(b) : [];
  const cells = [];
  for (let i = m - 1; i >= 0; i--) for (let j = 0; j < n; j++) {
    const x = b.A[i] + b.B[j], at = route.findIndex(c => sameCell(c, [i, j])), end = at >= 0 && at === route.length - 1;
    const go = nexts.some(c => sameCell(c, [i, j])), back = live && end;
    const cls = ['ss-dot', at >= 0 ? 'on' : '', go ? 'can-go' : '', !routing(q) && counts.get(x) > 1 ? 'repeat' : '', off.includes(x) ? 'off' : '',
      act?.type === 'step' && sameCell(act.cell, [i, j]) ? 'hinted' : ''].filter(Boolean).join(' ');
    const name = `${b.A[i]} plus ${b.B[j]} is ${x}${at >= 0 ? ', on the route' : ''}`;
    if (go || back) {
      const action = go ? {type: 'step', cell: [i, j]} : {type: 'back'};
      cells.push(`<button type="button" class="${cls}" ${moveAttrs(action, `ss-dot-${i}-${j}`)} aria-label="${esc(`${name}. ${go ? (route.length ? 'Step here' : 'Start here') : 'Step back'}`)}">${x}</button>`);
    } else cells.push(`<span class="${cls}" role="img" aria-label="${esc(name)}">${x}</span>`);
  }
  const pts = route.map(([i, j]) => `${f(j + 0.5)},${f(m - 1 - i + 0.5)}`).join(' ');
  const rows = Array.from({length: m}, (_, r) => `<line x1="0.5" y1="${r + 0.5}" x2="${n - 0.5}" y2="${r + 0.5}"/>`).join('');
  const cols = Array.from({length: n}, (_, c) => `<line x1="${c + 0.5}" y1="0.5" x2="${c + 0.5}" y2="${m - 0.5}"/>`).join('');
  const line = `<svg class="ss-lines" viewBox="0 0 ${n} ${m}" preserveAspectRatio="none" aria-hidden="true">${rows}${cols}${route.length > 1 ? `<polyline points="${pts}"/>` : ''}</svg>`;
  const aLabels = b.A.map((a, i) => `<span class="ss-label tA">${b.A[m - 1 - i]}</span>`).join('');
  const bLabels = b.B.map(x => `<span class="ss-label tB">${x}</span>`).join('');
  return `<div class="ss-grid" style="--m:${m};--n:${n}"><div class="ss-alabels" aria-hidden="true">${aLabels}</div><div class="ss-dots">${line}<div class="ss-cells" role="group" aria-label="Grid of totals">${cells.join('')}</div></div><span></span><div class="ss-blabels" aria-hidden="true">${bLabels}</div></div>`;
}
function told(q, b) {
  if (routing(q) && routeDone(b)) { const off = missed(b); if (off.length) return `Not on the route: ${listWords(off)}.`; }
  if (q.mode === 'most' && q.even && full(q, b) && totalsOf(b.A, b.B).length === b.A.length * b.B.length) {
    const uneven = TRAYS.filter(t => !evenlySpaced(b[t]));
    if (uneven.length) return `${listWords(uneven)} ${uneven.length > 1 ? 'are' : 'is'} not evenly spaced.`;
  }
  if (q.mode === 'every') return b.again ? 'Found already.' : b.more ? 'There is another.' : '';
  return '';
}
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const off = routing(q) && routeDone(b) ? missed(b) : [];
  const found = q.mode === 'every' && b.found.length ? `<div class="ss-found" role="group" aria-label="${esc(`Found: ${b.found.map(X => listWords(X)).join('; ')}`)}">${b.found.map(X => `<span class="ss-pair" aria-hidden="true">${X.map(x => `<i>${x}</i>`).join('')}</span>`).join('')}</div>` : '';
  const all = q.mode === 'every' && !done ? `<button type="button" class="secondary ss-button${act?.type === 'all' ? ' hinted' : ''}" ${moveAttrs({type: 'all'}, 'ss-all')}${b.more ? ' disabled' : ''}>That’s all</button>` : '';
  const note = told(q, b);
  const status = `A: ${b.A.length ? listWords(b.A) : 'empty'}. B: ${b.B.length ? listWords(b.B) : 'empty'}. ${totalsOf(b.A, b.B).length} totals.${routing(q) && b.route.length ? ` Route: ${routeTotals(b).join(', ')}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="ss-puzzle${done ? ' solved' : ''}" data-mechanic-wire="sumsets">${trayRow(q, b, 'A', done, act)}${trayRow(q, b, 'B', done, act)}${found || all ? `<div class="ss-bar">${found}${all}</div>` : ''}${strip(p, b, off)}${grid(q, b, done, act)}${note ? `<p class="ss-told">${esc(note)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Arrow keys on the grid extend the route: right and up.
function wire(root, p, api) {
  if (!routing(p.parameters)) return;
  root.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowUp'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey || !e.target.closest?.('.ss-grid')) return;
    const b = api.attempt().board, q = p.parameters;
    if (!full(q, b) || solved(p, b)) return;
    const [i, j] = b.route.at(-1) || [-1, -1];
    const cell = !b.route.length ? [0, 0] : e.key === 'ArrowRight' ? [i, j + 1] : [i + 1, j];
    if (!nextCells(b).some(c => sameCell(c, cell))) return;
    e.preventDefault();
    api.apply({type: 'step', cell});
  });
}

export const sumsetsMechanics = {
  sumsets: {
    fresh, valid, solved, move, hint, render, wire,
    reset: p => { lastTotals.delete(p.id); },
    // Undo keeps the B trays already found, and a That's all answered too
    // soon stays answered until a new one is found.
    carry(p, from, to) {
      if (p.parameters.mode !== 'every' || !object(from) || !object(to) || !Array.isArray(from.found)) return to;
      return {...to, found: from.found.map(X => [...X]), more: Boolean(from.more), done: false};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'sumsets',
  family: {id: 'sumsets', symbol: '⊞'},
  mechanics: sumsetsMechanics,
  pack: new URL('./sumsets.json', import.meta.url).href,
  css: new URL('./sumsets.css', import.meta.url).href,
  focus: '.ss-dot[data-action],.ss-card:not([disabled])'
};
