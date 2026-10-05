// Equally likely cases: list every case of a small experiment, keep the ones a
// puzzle asks for, and sort what was kept into groups. The listing themes
// (nontransitive decks, fair bags, fair shuffles, the copying bag, the visible
// side, optimal stopping and derangements) share it. A case is a short string
// key; the family says which keys exist, which count, how each one looks and
// which group it joins. This module keeps the shelf honest (no repeats, no
// case that doesn't count, "That's all" only when nothing is missing), draws
// the shelf, the groups and the full catalog, and draws the cups that two of
// the themes use. It never names a family. See docs/cases.md.
import {esc} from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Every case. Permutations come out in dictionary order of the items given.
// Results are cached and shared: copy one before changing it.
const cache = new Map();
const remember = (name, make) => { if (!cache.has(name)) cache.set(name, make()); return cache.get(name); };
export function permutations(items) {
  return remember(`perm:${JSON.stringify(items)}`, () => {
    if (!items.length) return [[]];
    return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest]));
  });
}
export const sequences = (alphabet, length) => remember(`seq:${JSON.stringify(alphabet)}:${length}`, () => {
  let out = [[]];
  for (let i = 0; i < length; i++) out = out.flatMap(s => alphabet.map(a => [...s, a]));
  return out;
});
// Every story of choices made in turn, one from each list: the lists may
// differ from step to step, like the tickets left in a cup.
export const product = lists => remember(`prod:${JSON.stringify(lists)}`, () => lists.reduce((out, list) => out.flatMap(s => list.map(x => [...s, x])), [[]]));
// Rows of lettered cups: one letter per home, homes in order A, B, C, …
export const LETTERS = 'ABCDEF';
export const letters = n => LETTERS.slice(0, n);
export const rowsOf = n => remember(`rows:${n}`, () => permutations([...letters(n)]).map(p => p.join('')));
export const isRow = (n, row) => typeof row === 'string' && row.length === n && [...row].sort().join('') === letters(n);
export const atHome = row => [...row].filter((cup, i) => cup === LETTERS[i]);
export const differences = (a, b) => [...a].reduce((n, x, i) => n + (x !== b[i]), 0);

// The shelf: the cases kept, in the order found. A board carries `kept` (keys),
// `claimed` (That's all was right) and `missed` (it was early). Only cases that
// count can be kept, each once.
export const SHELF_LIMIT = 120;
export function keepCase(kept, key, counts, limit = SHELF_LIMIT) {
  if (typeof key !== 'string' || !counts(key) || kept.includes(key) || kept.length >= limit) return null;
  return [...kept, key];
}
export const missingCases = (target, kept) => target.filter(key => !kept.includes(key));
// That's all: right when every case that counts is on the shelf.
export const claimCases = (target, kept) => missingCases(target, kept).length ? {claimed: false, missed: true} : {claimed: true, missed: false};
export function validShelf(b, target, limit = SHELF_LIMIT) {
  if (!object(b) || !Array.isArray(b.kept) || b.kept.length > limit || new Set(b.kept).size !== b.kept.length) return false;
  if (!b.kept.every(key => typeof key === 'string' && target.includes(key))) return false;
  if (typeof b.claimed !== 'boolean' || typeof b.missed !== 'boolean' || (b.claimed && b.missed) || (b.missed && !b.kept.length)) return false;
  const left = missingCases(target, b.kept).length;
  return !(b.claimed && left) && !(b.missed && !left);
}
// The case nearest a starting point, for hints that walk toward one answer.
export const nearestCase = (cases, from, distance = differences) => [...cases].sort((x, y) => distance(x, from) - distance(y, from) || (x < y ? -1 : 1))[0];

// Groups. `bins` are disjoint: each case joins the one bin `bin(key)` names.
// `hoops` are two sets that may overlap: a case joins every hoop that has it.
export const groupCases = (keys, bins, bin) => bins.map(b => ({...b, keys: keys.filter(key => bin(key) === b.id)}));
export function hoopCases(keys, [left, right]) {
  const inLeft = key => left.has(key), inRight = key => right.has(key);
  return {
    left: keys.filter(k => inLeft(k) && !inRight(k)),
    both: keys.filter(k => inLeft(k) && inRight(k)),
    right: keys.filter(k => !inLeft(k) && inRight(k)),
    outside: keys.filter(k => !inLeft(k) && !inRight(k))
  };
}
// Equal weight: every bin holds the same number of cases.
export const evenGroups = groups => groups.length > 0 && groups.every(g => g.keys.length === groups[0].keys.length);

// Drawing. `mini(key)` is the family's small picture of a case and `say(key)`
// its spoken name. A kept case is a button when `load` is given (tapping it
// sends that case back to the board); `current` marks the case on the board.
// Every kept case carries `data-key`, for a family's arrival animation.
function item(key, o) {
  const cls = `case-kept${key === o.current ? ' current' : ''}`;
  const name = esc(o.say(key) + (key === o.current ? ', on the board' : ''));
  return o.load
    ? `<li><button type="button" class="${cls}" data-case="${esc(key)}" data-key="${esc(key)}" data-focus="case-${esc(key)}" aria-label="${name}">${o.mini(key)}</button></li>`
    : `<li class="${cls}" data-key="${esc(key)}" aria-label="${name}">${o.mini(key)}</li>`;
}
const list = (keys, o, cls = '') => `<ol class="case-list${cls}">${keys.map(key => item(key, o)).join('')}</ol>`;
export function shelfHTML(kept, o) {
  if (!kept.length) return '';
  return `<section class="case-shelf" aria-label="${esc(o.label || 'Kept')}">${list(kept, o)}</section>`;
}
// Bins side by side, each a labelled column. Empty bins keep their place so
// the layout doesn't jump as cases arrive.
export function binsHTML(kept, bins, bin, o) {
  if (!kept.length && !o.always) return '';
  const groups = groupCases(kept, bins, bin);
  return `<section class="case-bins" data-bins="${bins.length}" aria-label="${esc(o.label || 'Kept')}">${groups.map(g => `<div class="case-bin" data-bin="${esc(g.id)}"><h3 class="case-bin-label">${g.label}</h3>${list(g.keys, o)}</div>`).join('')}</section>`;
}
// Two overlapping hoops: left only, both, right only. Cases in neither hoop sit
// below them.
export function hoopsHTML(kept, hoops, o) {
  if (!kept.length && !o.always) return '';
  const r = hoopCases(kept, hoops);
  const part = (name, keys, label) => `<div class="case-hoop-part ${name}" role="group" aria-label="${esc(label)}">${list(keys, o)}</div>`;
  return `<section class="case-hoops" aria-label="${esc(o.label || 'Kept')}"><div class="case-hoop-pair"><span class="case-hoop left" aria-hidden="true"></span><span class="case-hoop right" aria-hidden="true"></span><h3 class="case-hoop-label left">${hoops[0].label}</h3><h3 class="case-hoop-label right">${hoops[1].label}</h3>${part('left', r.left, hoops[0].say)}${part('both', r.both, `${hoops[0].say} and ${hoops[1].say}`)}${part('right', r.right, hoops[1].say)}</div>${r.outside.length ? part('outside', r.outside, 'Neither') : ''}</section>`;
}
// The full catalog, shown once a puzzle is solved: every case, in columns,
// with `mark(key)` naming a class ('yes' for the cases that count).
export function catalogHTML(cases, columns, column, o) {
  const groups = groupCases(cases, columns, column);
  return `<section class="case-catalog" data-bins="${columns.length}" aria-label="${esc(o.label || 'Every case')}">${groups.map(g => `<div class="case-bin"><h3 class="case-bin-label">${g.label}</h3><ol class="case-list">${g.keys.map((key, i) => `<li class="case-kept ${o.mark(key)}" style="--i:${i}" aria-label="${esc(o.say(key))}">${o.mini(key)}</li>`).join('')}</ol></div>`).join('')}</section>`;
}
// Taps on kept cases.
export function wireCases(root, onCase) {
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-case]');
    if (el && root.contains(el) && !el.disabled) onCase(el.dataset.case);
  });
}

// Cups: one cup per home, homes lettered in order. Cup i is drawn in colour i
// with symbol i, as in Cup swaps, so a cup on its own home matches the home's
// mark. `row[h]` is the cup in home h.
export const CUP_SYMBOLS = ['●', '▲', '■', '★', '◆', '✚'];
const colour = letter => LETTERS.indexOf(letter);
const cupSVG = '<svg viewBox="0 0 100 108" aria-hidden="true"><path d="M23 13h54l11 80q-38 16-76 0z" fill="currentColor" stroke="#142b48" stroke-width="3"/><path d="M26 14q24 9 48 0" fill="none" stroke="#142b48" stroke-width="3"/></svg>';
// The board. `o.pinned` lists homes whose cups never move; `o.picked` is the
// home chosen first; `o.hinted` lists homes to glow; `o.still` disables every
// cup (a solved board). A cup on its own home gets `at-home` on that home,
// unless `o.slots` numbers the homes 1, 2, 3, … as places with no letter.
// `o.enabled`, when given, lists the only homes whose cups can be used. `o.inert`
// draws cups that are pictures, not buttons, for a family that moves them some
// other way.
export function cupsBoard(row, o = {}) {
  const pinned = o.pinned || [], hinted = o.hinted || [];
  const spots = [...row].map((cup, h) => {
    const home = o.slots ? String(h + 1) : LETTERS[h], pin = pinned.includes(home), still = o.still || pin || (o.enabled && !o.enabled.includes(h)), picked = o.picked === h, at = !o.slots && cup === home;
    const label = `${o.slots ? 'Slot' : 'Home'} ${home}: cup ${cup}${at ? ', at home' : ''}${pin ? ', stays put' : ''}${picked ? ', chosen' : ''}`;
    const face = `${cupSVG}<span class="cup-identity"><b>${cup}</b><i aria-hidden="true">${CUP_SYMBOLS[colour(cup)]}</i></span>${pin ? '<span class="case-pin" aria-hidden="true"></span>' : ''}`;
    const cls = `cup-button case-cup cup-color-${colour(cup)}${picked ? ' selected' : ''}${hinted.includes(h) ? ' hinted' : ''}${pin ? ' pinned' : ''}`;
    const body = o.inert
      ? `<span class="${cls}" data-cup="${h}" role="img" aria-label="${esc(label)}">${face}</span>`
      : `<button type="button" class="${cls}" data-cup="${h}" data-focus="cup-${h}" aria-label="${esc(label)}" aria-pressed="${picked}"${still ? ' aria-disabled="true"' : ''}>${face}</button>`;
    return `<div class="cup-position case-cup-spot">${body}<div class="cup-home case-home${at ? ' at-home' : ''}${o.slots ? ' case-slot' : ''}">${o.slots ? '' : `<span aria-hidden="true">${CUP_SYMBOLS[h]}</span> `}${home}</div></div>`;
  }).join('');
  return `<div class="cup-board case-cups" style="--cups:${row.length}" role="group" aria-label="${esc(o.label || 'Cups on their homes')}">${spots}</div>`;
}
// A small row of cups for shelves and catalogs.
export const cupMini = row => `<span class="case-mini">${[...row].map(cup => `<i class="cm${colour(cup)}">${cup}</i>`).join('')}</span>`;
export const sayRow = row => [...row].join(' ');
// 'A', 'A and B', 'A, B and C'.
export const andList = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
export const swapRow = (row, i, j) => { const r = [...row]; [r[i], r[j]] = [r[j], r[i]]; return r.join(''); };
// Tap one cup and then another to swap them, or drag one onto another.
// `swap(i, j)` returns the move (or null); `pick(h)` keeps the first choice.
export function wireCups(root, {picked, pick, swap}) {
  // Only cup buttons move: a disabled cup or an inert picture never does.
  const usable = el => el && root.contains(el) && el.tagName === 'BUTTON' && el.getAttribute('aria-disabled') !== 'true';
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-cup]');
    if (!usable(el)) return;
    const h = Number(el.dataset.cup), first = picked();
    if (first === null || first === undefined) pick(h);
    else if (first === h) pick(null);
    else swap(first, h);
  });
  let from = null;
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-cup]');
    from = usable(el) ? el : null;
    // A release anywhere ends the drag; the board's own pointerup runs first.
    if (from) document.addEventListener('pointerup', () => { from = null; }, {once: true});
  });
  root.addEventListener('pointerup', e => {
    const start = from;
    from = null;
    if (!start) return;
    const to = document.elementFromPoint?.(e.clientX, e.clientY)?.closest?.('[data-cup]');
    if (!usable(to) || to === start) return;
    e.preventDefault();
    swap(Number(start.dataset.cup), Number(to.dataset.cup));
  });
}

// Counters: numbered discs drawn from a bag. 'R2' is red counter 2 and 'B1'
// blue counter 1; `counterIds('RRB')` numbers a bag's colours in order: R1, R2, B1.
export const COUNTER_COLOURS = {R: 'red', B: 'blue'};
export const counterIds = colours => { const n = {}; return [...colours].map(c => `${c}${n[c] = (n[c] || 0) + 1}`); };
export const sayCounter = id => `${COUNTER_COLOURS[id[0]]} ${id.slice(1)}`;
// A small counter picture; `number` replaces the one in its id.
export const counterMini = (id, number = id.slice(1)) => `<i class="case-counter c${id[0]}">${number}</i>`;
// A counter on a board: a button when `o.button` (disabled when `o.still`),
// otherwise a picture. `o.at` is its place in the bag, `o.name` its spoken
// name; `o.number` replaces the number shown, as a bag whose colours change
// numbers its counters by place.
export function counterHTML(id, o = {}) {
  const cls = `case-counter c${id[0]}${o.hinted ? ' hinted' : ''}`, name = esc(o.name || sayCounter(id)), text = o.number ?? id.slice(1);
  return o.button
    ? `<button type="button" class="${cls}" data-counter="${esc(id)}" data-at="${o.at ?? ''}" data-focus="counter-${o.at ?? esc(id)}" aria-label="${name}"${o.still ? ' disabled' : ''}>${text}</button>`
    : `<i class="${cls}" role="img" aria-label="${name}">${text}</i>`;
}
// A tap on a counter button sends its id and place to the family.
export function wireCounters(root, onCounter) {
  root.addEventListener('click', e => {
    const el = e.target.closest('button[data-counter]');
    if (el && root.contains(el) && !el.disabled) onCounter(el.dataset.counter, Number(el.dataset.at));
  });
}
// A bag of counters, a colour at a time when `o.sorted`. The counters are
// buttons when `o.button`; `o.number(id, i)` and `o.name(id, i)` replace a
// counter's number and spoken name; `o.byId` keys their focus by id rather
// than by place, for a bag that grows. `o.tag` labels one of several bags.
const colourRank = id => Object.keys(COUNTER_COLOURS).indexOf(id[0]);
export function counterBagHTML(ids, o = {}) {
  const shown = o.sorted ? [...ids].sort((x, y) => colourRank(x) - colourRank(y) || Number(x.slice(1)) - Number(y.slice(1))) : ids;
  const counters = shown.map((id, i) => counterHTML(id, {button: o.button, still: o.still, number: o.number?.(id, i), hinted: o.hinted === id || (!o.byId && o.hinted === i), at: o.byId ? undefined : i, name: o.name?.(id, i)}));
  return `<div class="case-bag${o.cls ? ` ${o.cls}` : ''}" role="group" aria-label="${esc(o.label || 'The bag')}">${o.tag ? `<span class="case-bag-tag">${o.tag}</span>` : ''}<div class="case-bag-counters">${counters.join('')}</div></div>`;
}
// The counters drawn so far, in order, with an empty place for each draw to come.
export const drawRowHTML = (draws, n, label = 'Drawn') => `<div class="case-draw" role="group" aria-label="${esc(label)}">${Array.from({length: n}, (_, i) => draws[i] ? counterMini(draws[i]) : '<i class="case-counter empty" aria-hidden="true"></i>').join('<span class="case-arrow" aria-hidden="true">→</span>')}</div>`;
