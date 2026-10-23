// Prime bags (worksheet Week 96, prime bags and divisor builders).
// A number card splits into two whole numbers greater than 1 that multiply to
// it; a card that cannot split is prime, and the finished cards are a bag of
// prime tokens. Every splitting route of a number ends in the same bag
// (unique factorization). Choosing some of a bag's tokens, each at most once,
// makes a value, the product of the chosen tokens (none chosen makes 1). The
// values are exactly the divisors of the bag's value, since the tokens left
// behind make the quotient, and tokens with the same number are the same, so
// a bag with e₁, …, e_r copies of its primes makes (e₁ + 1)⋯(e_r + 1) values.
// The least number with k values puts the largest counts on the smallest
// primes. The puzzles: split a card to primes, starting every way it can
// start; keep every value a bag makes and say That's all; build a bag that
// makes exactly k values, and the smallest such bag. The child's tray of kept
// values is the only record of a count, and the app judges it only on That's
// all: no counter, no slots.
import {esc} from '../../expansion-controls.js';

export const PRIMES = [2, 3, 5, 7];
export const KEYS = [2, 3, 4, 5, 6, 7, 8, 9];
export const LIMIT = 7;
export const MODES = ['split', 'every', 'design', 'playground'];

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = b => Object.keys(b).sort().join();
const same = (a, b) => String(a) === String(b);

// --- Bags ----------------------------------------------------------------------
// A bag is its counts of 2, 3, 5 and 7. Its tokens are drawn in that order, so
// a token is named by its place in the bag; a choice is a list of places.
export const isCounts = c => Array.isArray(c) && c.length === PRIMES.length && c.every(e => Number.isInteger(e) && e >= 0);
export const valueOf = c => c.reduce((t, e, i) => t * PRIMES[i] ** e, 1);
export const sizeOf = c => c.reduce((t, e) => t + e, 0);
export const tokensOf = c => c.flatMap((e, i) => Array(e).fill(PRIMES[i]));
export const countOf = c => c.reduce((t, e) => t * (e + 1), 1);
export const fits = (sub, bag) => sub.every((e, i) => e <= bag[i]);
export const byValue = (x, y) => valueOf(x) - valueOf(y);
export const countsOf = list => PRIMES.map(p => list.filter(x => x === p).length);
export const pickCounts = (bag, pick) => { const t = tokensOf(bag); return countsOf(pick.map(i => t[i])); };
// Every bag that can be chosen from a bag, smallest value first.
export function subBags(c) {
  let out = [[]];
  c.forEach(e => { out = out.flatMap(s => Array.from({length: e + 1}, (_, k) => [...s, k])); });
  return out.sort(byValue);
}
// Every bag the design board can build: at most LIMIT tokens of 2, 3, 5, 7.
let allMemo = null;
export function allBags() {
  if (allMemo) return allMemo;
  const out = [];
  (function grow(prefix, left) {
    if (prefix.length === PRIMES.length) { out.push(prefix); return; }
    for (let e = 0; e <= left; e++) grow([...prefix, e], left - e);
  })([], LIMIT);
  return (allMemo = out);
}
const leastMemo = new Map();
export function leastBag(goal) {
  if (!leastMemo.has(goal)) leastMemo.set(goal, allBags().filter(c => countOf(c) === goal).reduce((best, c) => (!best || valueOf(c) < valueOf(best) ? c : best), null));
  return leastMemo.get(goal);
}
// What That's all says about a tray: a value is missing; every value is
// there but the bag misses the goal's count; the bag is not the smallest; or
// the puzzle is solved. Kept values fit the bag and differ, so a tray as long
// as the bag's count holds every value.
export function verdict(q, bag, tray) {
  if (tray.length < countOf(bag)) return 'more';
  if (q.mode !== 'design') return 'done';
  if (countOf(bag) !== q.goal) return 'short';
  return q.least && valueOf(bag) > valueOf(leastBag(q.goal)) ? 'smaller' : 'done';
}

// --- Cards ---------------------------------------------------------------------
export const isPrime = n => Number.isInteger(n) && n > 1 && Array.from({length: Math.max(0, Math.floor(Math.sqrt(n)) - 1)}, (_, k) => k + 2).every(d => n % d);
// A split of card c by d (a key 2–9) gives d and c ÷ d, both more than 1.
export const canSplit = (c, d) => KEYS.includes(d) && d < c && c % d === 0;
// The row of cards after a list of splits [card place, d], or null if one is illegal.
export function cardsOf(n, steps) {
  if (!Array.isArray(steps)) return null;
  let cards = [n];
  for (const s of steps) {
    if (!Array.isArray(s) || s.length !== 2 || !s.every(Number.isInteger)) return null;
    const [i, d] = s;
    if (i < 0 || i >= cards.length || !canSplit(cards[i], d)) return null;
    cards = [...cards.slice(0, i), d, cards[i] / d, ...cards.slice(i + 1)];
  }
  return cards;
}
export const finished = cards => cards.every(isPrime);
export const pairOf = (n, d) => [Math.min(d, n / d), Math.max(d, n / d)];
// Every first split of n, as factor pairs a × b with 1 < a ≤ b.
export const firstSplits = n => Array.from({length: n}, (_, a) => a).filter(a => a > 1 && a * a <= n && n % a === 0).map(a => [a, n / a]);
export const smallestFactor = c => KEYS.find(d => canSplit(c, d) && isPrime(d));

// --- Boards ----------------------------------------------------------------------
// split:      {steps, shelf, said, done}   shelf: [{pair, bag}] by first split
// every:      {pick, tray, said, done}     the bag is given
// design:     {bag, pick, tray, said, done}
// playground: {bag, pick, tray}
// A tray holds the chosen bags kept, smallest value first. `said` answers a
// That's all ('more', 'short', 'smaller') and holds it off until the tray or
// the bag changes (on the split shelf, until the shelf grows).
export const bagOf = (q, b) => (q.mode === 'every' ? q.bag : b.bag);
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'split') return {steps: [], shelf: [], said: null, done: false};
  if (q.mode === 'every') return {pick: [], tray: [], said: null, done: false};
  if (q.mode === 'design') return {bag: [0, 0, 0, 0], pick: [], tray: [], said: null, done: false};
  return {bag: [0, 0, 0, 0], pick: [], tray: []};
}
const FIELDS = {split: 'done,said,shelf,steps', every: 'done,pick,said,tray', design: 'bag,done,pick,said,tray', playground: 'bag,pick,tray'};
function validSplit(q, b) {
  if (!cardsOf(q.card, b.steps) || !Array.isArray(b.shelf) || typeof b.done !== 'boolean' || ![null, 'more'].includes(b.said)) return false;
  const answers = firstSplits(q.card).map(String), bag = String(finishedBag(q.card));
  const kept = b.shelf.map(x => (object(x) && keys(x) === 'bag,pair' && Array.isArray(x.pair) && answers.includes(String(x.pair)) && Array.isArray(x.bag) && String(x.bag) === bag ? x.pair[0] : null));
  if (kept.some(k => k === null) || !kept.every((k, i) => i === 0 || kept[i - 1] < k)) return false;
  const complete = kept.length === answers.length;
  return b.said === 'more' ? !b.done && kept.length > 0 && !complete : !b.done || complete;
}
// The bag every route of n finishes in, by trial division (one route).
export function finishedBag(n) {
  const out = [];
  for (let d = 2, m = n; m > 1;) { if (m % d === 0) { out.push(d); m /= d; } else d++; }
  return out;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || keys(b) !== FIELDS[q.mode]) return false;
  if (q.mode === 'split') return validSplit(q, b);
  const bag = bagOf(q, b);
  if (!isCounts(bag) || (q.mode !== 'every' && sizeOf(bag) > LIMIT)) return false;
  const n = sizeOf(bag);
  if (!Array.isArray(b.pick) || !b.pick.every((i, k) => Number.isInteger(i) && i >= 0 && i < n && (k === 0 || b.pick[k - 1] < i))) return false;
  if (!Array.isArray(b.tray) || !b.tray.every(c => isCounts(c) && fits(c, bag))) return false;
  if (!b.tray.every((c, k) => k === 0 || valueOf(b.tray[k - 1]) < valueOf(c))) return false;
  if (q.mode === 'playground') return true;
  if (typeof b.done !== 'boolean' || ![null, 'more', 'short', 'smaller'].includes(b.said)) return false;
  const v = verdict(q, bag, b.tray);
  if (b.said !== null) return !b.done && b.tray.length > 0 && v === b.said;
  return !b.done || v === 'done';
}
function solved(p, b) {
  return p.parameters.mode !== 'playground' && valid(p, b) && b.done;
}

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const t = action.type;
  if (q.mode === 'split') {
    if (t === 'split') {
      if (keys(action) !== 'by,card,type' || finished(cardsOf(q.card, b.steps))) return null;
      const steps = [...b.steps, [action.card, action.by]], after = cardsOf(q.card, steps);
      if (!after) return null;
      if (!finished(after)) return {...b, steps};
      // A finished run joins the shelf under its first split, with the bag it reached.
      const pair = pairOf(q.card, steps[0][1]);
      if (b.shelf.some(x => same(x.pair, pair))) return {...b, steps};
      return {...b, steps, shelf: [...b.shelf, {pair, bag: [...after].sort((x, y) => x - y)}].sort((x, y) => x.pair[0] - y.pair[0]), said: null};
    }
    if (t === 'new') return keys(action) === 'type' && b.steps.length ? {...b, steps: []} : null;
    if (t === 'all') {
      if (keys(action) !== 'type' || !b.shelf.length || b.said) return null;
      return b.shelf.length === firstSplits(q.card).length ? {...b, done: true} : {...b, said: 'more'};
    }
    return null;
  }
  const bag = bagOf(q, b), quiet = q.mode === 'playground' ? {} : {said: null};
  if (t === 'pick') {
    const i = action.token;
    if (keys(action) !== 'token,type' || !Number.isInteger(i) || i < 0 || i >= sizeOf(bag)) return null;
    return {...b, pick: b.pick.includes(i) ? b.pick.filter(x => x !== i) : [...b.pick, i].sort((x, y) => x - y)};
  }
  if (t === 'keep') {
    const c = pickCounts(bag, b.pick);
    if (keys(action) !== 'type' || b.tray.some(x => same(x, c))) return null;
    return {...b, tray: [...b.tray, c].sort(byValue), ...quiet};
  }
  if (t === 'all') {
    if (q.mode === 'playground' || keys(action) !== 'type' || !b.tray.length || b.said) return null;
    const v = verdict(q, bag, b.tray);
    return v === 'done' ? {...b, done: true} : {...b, said: v};
  }
  if (t === 'add' || t === 'drop') {
    const i = PRIMES.indexOf(action.prime);
    if (q.mode === 'every' || keys(action) !== 'prime,type' || i < 0) return null;
    if (t === 'add' ? sizeOf(bag) >= LIMIT : !bag[i]) return null;
    const next = bag.map((e, k) => (k === i ? e + (t === 'add' ? 1 : -1) : e));
    // Kept values stay while the bag can still make them.
    return {...b, bag: next, pick: [], tray: b.tray.filter(c => fits(c, next)), ...quiet};
  }
  return null;
}

// --- Hints -----------------------------------------------------------------------
const dist = (a, b) => a.reduce((t, e, i) => t + Math.abs(e - b[i]), 0);
const nearest = (list, from) => list.reduce((best, c) => (!best || dist(c, from) < dist(best, from) || (dist(c, from) === dist(best, from) && valueOf(c) < valueOf(best)) ? c : best), null);
// The bag a hint works toward: the given bag, the smallest bag with the goal's
// count, or the bag with the goal's count fewest changes from the child's.
export function aimOf(q, b) {
  if (q.mode === 'every') return q.bag;
  if (q.least) return leastBag(q.goal);
  return nearest(allBags().filter(c => countOf(c) === q.goal), b.bag);
}
function toward(bag, pick, target) {
  const t = tokensOf(bag), now = pickCounts(bag, pick);
  const over = now.findIndex((e, k) => e > target[k]);
  if (over >= 0) return {type: 'move', action: {type: 'pick', token: Math.max(...pick.filter(i => t[i] === PRIMES[over]))}, text: `Leave out a ${PRIMES[over]}.`};
  const under = now.findIndex((e, k) => e < target[k]);
  return {type: 'move', action: {type: 'pick', token: t.findIndex((x, i) => x === PRIMES[under] && !pick.includes(i))}, text: `Choose a ${PRIMES[under]}.`};
}
function splitHint(q, b) {
  const aims = firstSplits(q.card).filter(pair => !b.shelf.some(x => same(x.pair, pair)));
  if (!aims.length) return {type: 'move', action: {type: 'all'}, text: 'Every first split is found.'};
  const cards = cardsOf(q.card, b.steps);
  if (!b.steps.length) { const [x, y] = aims[0]; return {type: 'move', action: {type: 'split', card: 0, by: x}, text: `Split ${q.card} into ${x} × ${y}.`}; }
  if (finished(cards)) return {type: 'move', action: {type: 'new'}, text: 'Press New run.'};
  if (b.shelf.some(x => same(x.pair, pairOf(q.card, b.steps[0][1])))) return {type: 'move', action: {type: 'new'}, text: 'You have this first split. Press New run.'};
  const i = cards.findIndex(c => !isPrime(c)), c = cards[i], d = smallestFactor(c);
  return {type: 'move', action: {type: 'split', card: i, by: d}, text: `Split ${c} into ${d} × ${c / d}.`};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.mode === 'split') return splitHint(q, b);
  const bag = bagOf(q, b);
  if (q.mode === 'design') {
    const aim = aimOf(q, b), over = bag.findIndex((e, k) => e > aim[k]), under = bag.findIndex((e, k) => e < aim[k]);
    if (over >= 0) return {type: 'move', action: {type: 'drop', prime: PRIMES[over]}, text: `Take a ${PRIMES[over]} out of the bag.`};
    if (under >= 0) return {type: 'move', action: {type: 'add', prime: PRIMES[under]}, text: `Put a ${PRIMES[under]} in the bag.`};
  }
  const missing = subBags(bag).filter(c => !b.tray.some(x => same(x, c)));
  if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every value is kept.'};
  const now = pickCounts(bag, b.pick), target = nearest(missing, now);
  return same(now, target) ? {type: 'move', action: {type: 'keep'}, text: `Keep ${valueOf(target)}.`} : toward(bag, b.pick, target);
}

// --- View state: the chosen card, and a refused split -----------------------------
// Both belong to the board they were drawn on; the next change of board takes
// them away.
const uiState = new Map();
function view(p) { if (!uiState.has(p.id)) uiState.set(p.id, {sel: null, told: null}); return uiState.get(p.id); }
// A wrong count names the bag's count, which the full tray already shows; a
// bag that is not the smallest is answered without showing the smaller one.
const values = n => `${n} value${n === 1 ? '' : 's'}`;
const SAID = {more: () => 'There is another.', short: (q, bag) => `This bag makes ${values(countOf(bag))}, not ${q.goal}.`, smaller: q => `A bag with a smaller = number makes ${q.goal} values.`};

// --- Drawing ----------------------------------------------------------------------
let drawnFor = '';
const uiAttr = payload => `data-action="mechanic-ui" data-ui='${esc(JSON.stringify({...payload, at: drawnFor}))}'`;
const moveAttr = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const button = (label, action, cls, {enabled = true, hinted = false, primary = false, aria = ''} = {}) =>
  `<button type="button" class="${primary ? 'primary' : 'secondary'} pb-button ${cls}${hinted ? ' hinted' : ''}" ${moveAttr(action)} data-focus="${cls}"${aria ? ` aria-label="${esc(aria)}"` : ''}${enabled ? '' : ' disabled'}>${label}</button>`;
const sameAction = (a, b) => Boolean(a && b) && JSON.stringify(a) === JSON.stringify(b);
const words = list => list.join(', ');
// A small picture of a chosen bag: its tokens in a row, or an empty ring.
export function mini(c) {
  const t = tokensOf(c);
  return `<span class="pb-mini" aria-hidden="true">${t.length ? t.map(x => `<i>${x}</i>`).join('') : '<i class="none"></i>'}</span>`;
}
const chosenWords = c => (sizeOf(c) ? tokensOf(c).join(' × ') : 'nothing');

function trayHTML(tray, now) {
  if (!tray.length) return '';
  return `<ul class="pb-tray" aria-label="Kept">${tray.map(c => `<li class="pb-item${now && same(c, now) ? ' now' : ''}" aria-label="${esc(`${valueOf(c)}, from ${chosenWords(c)}`)}"><b>${valueOf(c)}</b>${mini(c)}</li>`).join('')}</ul>`;
}

function renderBag(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), live = !done;
  drawnFor = JSON.stringify(b);
  const bag = bagOf(q, b), toks = tokensOf(bag), now = pickCounts(bag, b.pick);
  const h = a.hintLevel >= 2 && live && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  let supply = '';
  if (q.mode !== 'every') {
    supply = `<div class="pb-supply" role="group" aria-label="Tokens">${PRIMES.map((x, i) => {
      const add = {type: 'add', prime: x}, drop = {type: 'drop', prime: x};
      return `<span class="pb-stock"><button type="button" class="pb-token pb-add${sameAction(act, add) ? ' hinted' : ''}" ${moveAttr(add)} data-focus="pb-add-${x}" aria-label="Put a ${x} in the bag"${live && sizeOf(bag) < LIMIT ? '' : ' disabled'}>${x}</button><button type="button" class="pb-drop${sameAction(act, drop) ? ' hinted' : ''}" ${moveAttr(drop)} data-focus="pb-drop-${x}" aria-label="Take a ${x} out of the bag"${live && bag[i] ? '' : ' disabled'}>−</button></span>`;
    }).join('')}</div>`;
  }
  const tokens = toks.map((x, i) => {
    const chosen = b.pick.includes(i), action = {type: 'pick', token: i};
    const cls = `pb-token${chosen ? ' chosen' : ''}${sameAction(act, action) ? ' hinted' : ''}`;
    return live ? `<button type="button" class="${cls}" ${moveAttr(action)} data-focus="pb-tok-${i}" aria-pressed="${chosen}" aria-label="${x}">${x}</button>` : `<span class="${cls}" aria-hidden="true">${x}</span>`;
  }).join('');
  const bagHTML = `<div class="pb-bagrow"><div class="pb-bag${toks.length ? '' : ' empty'}" role="group" aria-label="Bag">${tokens}</div><span class="pb-total" aria-label="${esc(`The bag's value is ${valueOf(bag)}`)}">= ${valueOf(bag)}</span></div>`;
  const kept = b.tray.some(c => same(c, now));
  const expr = sizeOf(now) > 1 ? `<span class="pb-expr">${tokensOf(now).join(' × ')} =</span>` : '';
  const keep = live ? button('Keep', {type: 'keep'}, 'pb-keep', {enabled: !kept, hinted: sameAction(act, {type: 'keep'}), primary: !kept, aria: `Keep ${valueOf(now)}`}) : '';
  const choice = `<div class="pb-choice">${expr}<span class="pb-value" aria-label="${esc(`Chosen ${chosenWords(now)}, value ${valueOf(now)}`)}">${valueOf(now)}</span>${keep}</div>`;
  const all = q.mode !== 'playground' && live ? `<div class="pb-bar">${button('That’s all', {type: 'all'}, 'pb-all', {enabled: b.tray.length > 0 && !b.said, hinted: sameAction(act, {type: 'all'})})}</div>` : '';
  const note = q.mode !== 'playground' && b.said && live ? SAID[b.said](q, bag) : '';
  const status = `Bag ${toks.length ? words(toks) : 'empty'}, value ${valueOf(bag)}. Chosen ${chosenWords(now)}, value ${valueOf(now)}${kept ? ', kept' : ''}. Kept ${b.tray.length ? words(b.tray.map(valueOf)) : 'nothing'}.${note ? ` ${note}` : ''}`;
  return `<div class="pb-puzzle pb-${q.mode}${done ? ' solved' : ''}">${supply}${bagHTML}${choice}${all}${note ? `<p class="pb-told">${esc(note)}</p>` : ''}${trayHTML(b.tray, live ? now : null)}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function renderSplit(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), live = !done, state = view(p);
  drawnFor = JSON.stringify(b);
  const cards = cardsOf(q.card, b.steps), over = finished(cards);
  const composite = cards.map((c, i) => i).filter(i => !isPrime(cards[i]));
  const sel = over ? null : state.sel && state.sel.at === drawnFor && composite.includes(state.sel.i) ? state.sel.i : composite[0];
  const told = live && state.told && state.told.at === drawnFor ? state.told : null;
  const h = a.hintLevel >= 2 && live ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const row = cards.map((c, i) => {
    if (isPrime(c)) return `<span class="pb-token pb-prime" role="img" aria-label="${c}, prime">${c}</span>`;
    const cls = `pb-card${i === sel ? ' selected' : ''}${act?.type === 'split' && act.card === i ? ' hinted' : ''}`;
    return live ? `<button type="button" class="${cls}" ${uiAttr({sel: i})} data-focus="pb-card-${i}" aria-pressed="${i === sel}" aria-label="${c}">${c}</button>` : `<span class="${cls}" aria-hidden="true">${c}</span>`;
  }).join('');
  // A finished run keeps the keypad's room, so a quick second tap on the last
  // key lands on nothing instead of on New run rising into its place.
  let pad = live && over ? `<div class="pb-pad pb-rest" aria-hidden="true"><span class="pb-keys">${KEYS.map(() => '<span class="pb-key"></span>').join('')}</span></div>` : '';
  if (live && sel !== null) {
    const c = cards[sel];
    pad = `<div class="pb-pad" role="group" aria-label="Split ${c}"><span class="pb-eq" aria-hidden="true">${c} =</span><span class="pb-keys">${KEYS.map(d => {
      const ok = canSplit(c, d), hinted = act?.type === 'split' && act.card === sel && act.by === d;
      return `<button type="button" class="pb-key${hinted ? ' hinted' : ''}${told && told.c === c && told.d === d ? ' marked' : ''}" ${ok ? moveAttr({type: 'split', card: sel, by: d}) : uiAttr({told: {c, d}})} data-focus="pb-key-${d}"${d < c ? '' : ' disabled'}>${d}</button>`;
    }).join('')}</span><span class="pb-eq" aria-hidden="true">× ?</span></div>`;
  }
  const bar = live ? `<div class="pb-bar">${button('New run', {type: 'new'}, 'pb-new', {enabled: b.steps.length > 0, hinted: sameAction(act, {type: 'new'}), primary: over})}${button('That’s all', {type: 'all'}, 'pb-all', {enabled: b.shelf.length > 0 && !b.said, hinted: sameAction(act, {type: 'all'})})}</div>` : '';
  const note = told ? `${told.d} doesn’t split ${told.c}.` : live && b.said ? SAID.more() : '';
  const nowPair = b.steps.length ? pairOf(q.card, b.steps[0][1]) : null;
  const shelf = b.shelf.length ? `<ul class="pb-shelf" aria-label="Found">${b.shelf.map(x => `<li class="pb-run${live && nowPair && same(x.pair, nowPair) ? ' now' : ''}" aria-label="${esc(`First ${x.pair[0]} × ${x.pair[1]}, finished ${words(x.bag)}`)}"><span class="pb-pair">${x.pair[0]} × ${x.pair[1]}</span><span class="pb-arrow" aria-hidden="true">→</span>${mini(countsOf(x.bag))}</li>`).join('')}</ul>` : '';
  const status = `Cards ${words(cards)}.${over ? ' Every card is prime.' : sel !== null ? ` Splitting ${cards[sel]}.` : ''} Found ${b.shelf.length}.${note ? ` ${note}` : ''}`;
  return `<div class="pb-puzzle pb-split${done ? ' solved' : ''}"><div class="pb-cards" role="group" aria-label="Cards">${row}</div>${pad}${bar}${note ? `<p class="pb-told">${esc(note)}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

const render = (p, a) => (p.parameters.mode === 'split' ? renderSplit(p, a) : renderBag(p, a));

export const primesMechanics = {
  primes: {
    fresh, valid, solved, move, hint, render,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = view(p);
      if (Number.isInteger(payload.sel)) { state.sel = {i: payload.sel, at: payload.at}; state.told = null; }
      else if (object(payload.told) && Number.isInteger(payload.told.c) && Number.isInteger(payload.told.d)) state.told = {c: payload.told.c, d: payload.told.d, at: payload.at};
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back choices, keeps, splits and bag changes, never a
    // discovery: kept values stay while the bag can make them, the shelf
    // stays, and a refused That's all stays while the tray and bag are as
    // they were when it was refused.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'split') return Array.isArray(from.shelf) ? {...to, shelf: from.shelf.map(x => ({pair: [...x.pair], bag: [...x.bag]})), said: from.said} : to;
      const bag = bagOf(q, to);
      if (!Array.isArray(from.tray) || !Array.isArray(to.tray) || !isCounts(bag)) return to;
      const seen = new Map();
      for (const c of [...to.tray, ...from.tray]) if (isCounts(c) && fits(c, bag)) seen.set(String(c), [...c]);
      const tray = [...seen.values()].sort(byValue);
      if (q.mode === 'playground') return {...to, tray};
      const said = same(bagOf(q, from), bag) && same(tray, from.tray) ? from.said : same(tray, to.tray) ? to.said : null;
      return {...to, tray, said};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'primes',
  family: {id: 'primes', symbol: '∏'},
  mechanics: primesMechanics,
  pack: new URL('./primes.json', import.meta.url).href,
  css: new URL('./primes.css', import.meta.url).href,
  focus: 'button.pb-token:not([disabled]),.pb-key:not([disabled]),.pb-keep:not([disabled]),.pb-new:not([disabled]),.pb-all:not([disabled])'
};
