// Take it or pass (worksheet Week 60). A bag holds three tickets, each as
// likely to be drawn as any other. Each offer is a fresh draw (the ticket goes
// back), so offers repeat. Take an offer to score it and stop, or pass it for
// good; the last offer must be taken. A card is a complete round: every offer
// in order, the ones never seen after a take included. With n offers there
// are 3^n equally likely cards, so the plan that scores the most on all of
// them has the best average. The best plan takes an offer x with m offers left
// exactly when x beats the best average of the remaining m − 1 offers:
// V1 = mean, Vm = mean of max(x, Vm−1). For 0, 4, 6 that is 10/3, 40/9 and
// 134/27, so a 4 is taken with two offers left and passed with three. Following
// the review card, a plan is a Take/Pass switch for each row of cards with the
// same first offer (and, with three offers, for each second offer after a
// passed first, so a plan may remember the first offer); the cards light the
// offer taken and fade the unseen ones, and no total shows until a puzzle is
// solved. A wrong claim says only that another plan scores more, so the cards
// themselves must show which switch is wrong. The shelf and catalogs come from
// the shared case engine.
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, shelfHTML, binsHTML, catalogHTML, sequences} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sum = list => list.reduce((s, v) => s + v, 0);
const byValue = (x, y) => x - y;
export const K = 3;
export const cardsOf = (bag, n) => sequences(bag, n);
export const cardKey = w => w.join('-');

// Plans. A plan is a string of T (take) and P (pass): the first offer's
// switch for each ticket, then, with three offers, a switch for each second
// offer after each passed first offer: index 3 + 3i + j is "a second bag[j]
// after a first bag[i]". The last offer is always taken.
export const planLength = n => n === 2 ? K : K + K * K;
export const freshPlan = n => 'T'.repeat(planLength(n));
export const isPlan = (plan, n) => typeof plan === 'string' && plan.length === planLength(n) && /^[TP]+$/.test(plan);
// A second-offer switch counts only when its first offer is passed.
export const reachable = (plan, k) => k < K || plan[Math.floor((k - K) / K)] === 'P';
// Where a plan stops on a card: the index of the offer it takes.
export function stopAt(bag, plan, w) {
  const i = bag.indexOf(w[0]);
  if (plan[i] === 'T') return 0;
  if (w.length === 2) return 1;
  return plan[K + K * i + bag.indexOf(w[1])] === 'T' ? 1 : 2;
}
export const scoreOf = (bag, plan, w) => w[stopAt(bag, plan, w)];
export const total = (bag, n, plan) => sum(cardsOf(bag, n).map(w => scoreOf(bag, plan, w)));
// Switches that can't matter are written '-', so two plans that score alike on every card share a key.
export const planKey = plan => [...plan].map((c, k) => reachable(plan, k) ? c : '-').join('');
const planCache = new Map();
// Every plan, the most any scores, and the keys of the plans that score it.
export function bestOf(bag, n) {
  const id = JSON.stringify([bag, n]);
  if (planCache.has(id)) return planCache.get(id);
  const all = Array.from({length: 2 ** planLength(n)}, (_, m) => Array.from({length: planLength(n)}, (_, k) => m >> k & 1 ? 'P' : 'T').join(''));
  const scored = all.map(plan => [plan, total(bag, n, plan)]), most = Math.max(...scored.map(s => s[1]));
  const out = {most, keys: [...new Set(scored.filter(s => s[1] === most).map(s => planKey(s[0])))].sort()};
  planCache.set(id, out);
  return out;
}
export const isBest = (bag, n, plan) => total(bag, n, plan) === bestOf(bag, n).most;

// The most the remaining m offers score in all, over their 3^m cards.
export const follow = (bag, m) => m === 1 ? sum(bag) : sum(bag.map(y => Math.max(y * K ** (m - 1), follow(bag, m - 1))));

// Puzzle 5: two fixed plans, q.plans.A and q.plans.B, each [the first
// offers it takes, the second offers it takes].
const fixedPlan = (bag, take1, take2) => bag.map(x => take1.includes(x) ? 'T' : 'P').join('') + bag.flatMap(() => bag.map(y => take2.includes(y) ? 'T' : 'P')).join('');
const planOf = (q, name) => fixedPlan(q.bag, ...q.plans[name]);
const differs = (q, w) => scoreOf(q.bag, planOf(q, 'A'), w) !== scoreOf(q.bag, planOf(q, 'B'), w);

// The bag puzzles: one ticket to choose beside two that stay.
const middle = bag => bag[1];
export const GOALS = {
  // With two offers, taking the middle ticket and passing it score alike.
  tie: bag => middle(bag) * K === sum(bag),
  // The middle ticket is taken with two offers left and passed with three: x > V1 and x < V2.
  flip: bag => middle(bag) * K > sum(bag) && middle(bag) * K * K < follow(bag, 2)
};
const bagWith = (q, x) => [...q.pins, x].sort(byValue);
const shownBag = (q, b) => q.mode === 'bag' ? (b.value === null ? null : bagWith(q, b.value)) : q.bag;

// What each find-every puzzle's shelf can hold.
const targetCache = new Map();
export function targetsOf(q) {
  const id = JSON.stringify(q);
  if (targetCache.has(id)) return targetCache.get(id);
  const out = q.mode === 'plans' ? bestOf(q.bag, q.n).keys
    : q.mode === 'differ' ? cardsOf(q.bag, q.n).filter(w => differs(q, w)).map(cardKey)
    : q.mode === 'bag' ? q.menu.filter(x => GOALS[q.goal](bagWith(q, x))).map(String) : [];
  targetCache.set(id, out);
  return out;
}

// Boards.
//   plan:   {plan, claimed, wrong}: set the switches, then claim Best; wrong
//           is true after a claim refused, until a switch changes
//   plans:  {plan, kept, claimed, missed, wrong}: keep every best plan; wrong
//           as above, for a refused Keep
//   differ: {kept, claimed, missed, wrong}: keep every card where plans A and
//           B score differently; wrong is the last card refused
//   bag:    {value, plan, kept, claimed, missed, wrong}: try each ticket in
//           the bag, set the switches to a best plan for it, and keep the
//           tickets that meet q.goal; the switches start again with each
//           ticket. wrong is 'plan' after a Keep refused because another plan
//           scores more, 'goal' after one refused because the ticket fails
//           the goal, and null otherwise
function freshPuzzle(p) {
  const q = p.parameters, shelf = {kept: [], claimed: false, missed: false};
  if (q.mode === 'plan') return {plan: freshPlan(q.n), claimed: false, wrong: false};
  if (q.mode === 'plans') return {plan: freshPlan(q.n), ...shelf, wrong: false};
  if (q.mode === 'differ') return {...shelf, wrong: null};
  return {value: null, plan: freshPlan(q.n), ...shelf, wrong: null};
}
const shelfOf = b => ({kept: b.kept, claimed: b.claimed, missed: b.missed});
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const size = n => Object.keys(b).length === n;
  const wrongPlan = () => typeof b.wrong === 'boolean' && !(b.wrong && (b.claimed || isBest(q.bag, q.n, b.plan)));
  if (q.mode === 'plan') return size(3) && isPlan(b.plan, q.n) && typeof b.claimed === 'boolean' && (!b.claimed || isBest(q.bag, q.n, b.plan)) && wrongPlan();
  const shelfOk = validShelf(shelfOf(b), targetsOf(q));
  if (q.mode === 'plans') return size(5) && shelfOk && isPlan(b.plan, q.n) && wrongPlan();
  if (q.mode === 'differ') return size(4) && shelfOk && (b.wrong === null || (cardsOf(q.bag, q.n).some(w => cardKey(w) === b.wrong) && !targetsOf(q).includes(b.wrong) && !b.claimed));
  if (!(size(6) && shelfOk && (b.value === null || q.menu.includes(b.value)) && isPlan(b.plan, q.n) && [null, 'plan', 'goal'].includes(b.wrong))) return false;
  if (b.wrong === null) return true;
  if (b.value === null || b.claimed) return false;
  const bag = bagWith(q, b.value), best = isBest(bag, q.n, b.plan);
  return b.wrong === 'plan' ? !best : best && !GOALS[q.goal](bag);
}
const solvedPuzzle = (p, b) => validPuzzle(p, b) && b.claimed;
const flip = (plan, k) => plan.slice(0, k) + (plan[k] === 'T' ? 'P' : 'T') + plan.slice(k + 1);
const flips = (n, plan, k) => Number.isInteger(k) && k >= 0 && k < planLength(n) && reachable(plan, k);
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || b.claimed || !object(action)) return null;
  const targets = targetsOf(q), counts = key => targets.includes(key);
  // That's all also puts away the answer to the last refusal.
  const claim = () => b.kept.length && !b.missed ? {...b, ...claimCases(targets, b.kept), wrong: q.mode === 'plans' ? false : null} : null;
  if (q.mode === 'plan' || q.mode === 'plans') {
    if (action.type === 'flip') return flips(q.n, b.plan, action.at) ? {...b, plan: flip(b.plan, action.at), wrong: false} : null;
    // One claim or Keep per plan: a refused one stays refused until a switch changes.
    if (q.mode === 'plan') return action.type === 'best' && !b.wrong ? (isBest(q.bag, q.n, b.plan) ? {...b, claimed: true} : {...b, wrong: true}) : null;
    if (action.type === 'keep') {
      if (b.wrong || action.key !== undefined) return null;
      if (!isBest(q.bag, q.n, b.plan)) return {...b, wrong: true};
      const kept = keepCase(b.kept, planKey(b.plan), counts);
      return kept ? {...b, kept, missed: false} : null;
    }
    return action.type === 'claim' ? claim() : null;
  }
  if (q.mode === 'differ') {
    if (action.type === 'keep') {
      const key = action.key;
      if (typeof key !== 'string' || !cardsOf(q.bag, q.n).some(w => cardKey(w) === key) || b.kept.includes(key) || key === b.wrong) return null;
      return counts(key) ? {...b, kept: keepCase(b.kept, key, counts), missed: false, wrong: null} : {...b, wrong: key};
    }
    return action.type === 'claim' ? claim() : null;
  }
  if (action.type === 'pick') return q.menu.includes(action.value) && action.value !== b.value ? {...b, value: action.value, plan: freshPlan(q.n), wrong: null} : null;
  if (action.type === 'flip') return b.value !== null && flips(q.n, b.plan, action.at) ? {...b, plan: flip(b.plan, action.at), wrong: null} : null;
  // Keep checks the ticket with the plan on the switches, which must be a best plan for its bag.
  if (action.type === 'keep') {
    if (b.value === null || b.wrong !== null || action.key !== undefined || b.kept.includes(String(b.value))) return null;
    const bag = bagWith(q, b.value);
    if (!isBest(bag, q.n, b.plan)) return {...b, wrong: 'plan'};
    return GOALS[q.goal](bag) ? {...b, kept: keepCase(b.kept, String(b.value), counts), missed: false} : {...b, wrong: 'goal'};
  }
  return action.type === 'claim' ? claim() : null;
}

// Hints. A plan: switch by switch toward the nearest best plan, rows first so
// their lines open, then Best (or Keep, and That's all when every best plan is
// kept). Plans A and B: the next card where they differ. A bag: the next
// ticket that works, switches toward a best plan for it, Keep, That's all.
const distance = (plan, key) => [...key].reduce((d, c, k) => d + (c !== '-' && plan[k] !== c), 0);
const nearestKey = (plan, keys) => [...keys].sort((x, y) => distance(plan, x) - distance(plan, y) || (x < y ? -1 : 1))[0];
function stepToward(bag, plan, key) {
  for (let i = 0; i < K; i++) if (plan[i] !== key[i]) return i;
  for (let k = K; k < key.length; k++) if (key[k] !== '-' && plan[k] !== key[k]) return k;
  return null;
}
export const sayFlip = (bag, plan, k) => {
  const take = plan[k] === 'P';
  if (k < K) return `${take ? 'Take' : 'Pass'} a first ${bag[k]}.`;
  return `After passing a first ${bag[Math.floor((k - K) / K)]}, ${take ? 'take' : 'pass'} a second ${bag[(k - K) % K]}.`;
};
const sayCard = key => key.split('-').join(' ');
function hintPuzzle(p, b) {
  const q = p.parameters;
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const step = (action, text) => ({type: 'move', action, text});
  const toward = (bag, key) => { const k = stepToward(bag, b.plan, key); return step({type: 'flip', at: k}, sayFlip(bag, b.plan, k)); };
  if (q.mode === 'plan') {
    if (isBest(q.bag, q.n, b.plan)) return step({type: 'best'}, 'This plan scores the most. Press Best plan.');
    return toward(q.bag, nearestKey(b.plan, bestOf(q.bag, q.n).keys));
  }
  const missing = missingCases(targetsOf(q), b.kept), all = () => step({type: 'claim'}, 'You have found them all.');
  if (!missing.length) return all();
  if (q.mode === 'plans') {
    if (missing.includes(planKey(b.plan))) return step({type: 'keep'}, 'Keep this plan.');
    return toward(q.bag, nearestKey(b.plan, missing));
  }
  if (q.mode === 'differ') return step({type: 'keep', key: missing[0]}, `Try ${sayCard(missing[0])}.`);
  if (!missing.includes(String(b.value))) return step({type: 'pick', value: Number(missing[0])}, `Try ${missing[0]}.`);
  const bag = bagWith(q, b.value);
  if (!isBest(bag, q.n, b.plan)) return toward(bag, nearestKey(b.plan, bestOf(bag, q.n).keys));
  return step({type: 'keep'}, 'Keep this ticket.');
}

// Drawing.
// A ticket: its number on a small card. On a card of offers, the offer taken
// is lit, the ones passed stay plain and the ones never seen fade.
const ticket = (v, cls = '') => `<i class="off-t${cls ? ` ${cls}` : ''}">${v}</i>`;
const sayWord = w => w.join(', ');
function cardHTML(w, at, o = {}) {
  const look = (v, k) => ticket(v, at === null ? '' : k === at ? 'taken' : k < at ? 'passed' : 'unseen');
  const cls = `off-card${o.mark ? ` ${o.mark}` : ''}`;
  const said = `${sayWord(w)}${at === null ? '' : `: takes ${w[at]}`}`;
  if (o.button) return `<button type="button" class="${cls}" data-off-move="${esc(JSON.stringify({type: 'keep', key: cardKey(w)}))}" data-focus="off-card-${cardKey(w)}" aria-label="${esc(o.label || sayWord(w))}"${o.still ? ' disabled' : ''}>${w.map(v => ticket(v)).join('')}</button>`;
  return `<span class="${cls}" role="img" aria-label="${esc(said)}">${w.map(look).join('')}</span>`;
}
const focusOf = a => `off-${a.type}${a.at ?? ''}${a.value ?? ''}${a.bag ?? ''}${a.n ?? ''}`;
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-off-move="${esc(JSON.stringify(action))}" data-focus="${focusOf(action)}" ${extra}>${label}</button>`;
const note = text => `<p class="case-note" role="status">${esc(text)}</p>`;
// A Take/Pass switch.
function switchHTML(bag, plan, k, o) {
  const take = plan[k] === 'T', open = reachable(plan, k);
  const name = k < K ? `First offer ${bag[k]}` : `After a first ${bag[Math.floor((k - K) / K)]}, second offer ${bag[(k - K) % K]}`;
  return `<button type="button" class="off-switch ${take ? 'take' : 'pass'}${o.hint === k ? ' hinted' : ''}" data-off-move="${esc(JSON.stringify({type: 'flip', at: k}))}" data-focus="off-flip${k}" aria-label="${esc(`${name}: ${take ? 'take' : 'pass'}`)}"${o.still || !open ? ' disabled' : ''}>${take ? 'Take' : 'Pass'}</button>`;
}
// Every card of a bag, in rows by first offer (and, with three offers, lines
// by second offer), with the plan's switches beside them. o.still disables
// the switches.
function boardHTML(bag, n, plan, o = {}) {
  const cards = list => `<div class="off-cards">${list.map(w => cardHTML(w, stopAt(bag, plan, w))).join('')}</div>`;
  const rows = bag.map((x, i) => {
    const head = `<div class="off-head"><span class="off-say">First</span>${ticket(x)}${o.switches === false ? '' : switchHTML(bag, plan, i, o)}</div>`;
    const inRow = cardsOf(bag, n).filter(w => w[0] === x);
    if (n === 2) return `<div class="off-row" role="group" aria-label="${esc(`Cards starting with ${x}`)}">${head}${cards(inRow)}</div>`;
    const lines = bag.map((y, j) => { const g = K + K * i + j; return `<div class="off-line${reachable(plan, g) ? '' : ' shut'}" role="group" aria-label="${esc(`Cards starting with ${x}, ${y}`)}"><span class="off-say">then</span>${ticket(y)}${o.switches === false ? '' : switchHTML(bag, plan, g, o)}${cards(inRow.filter(w => w[1] === y))}</div>`; }).join('');
    return `<div class="off-row" role="group" aria-label="${esc(`Cards starting with ${x}`)}">${head}${lines}</div>`;
  });
  return `<div class="off-board n${n}">${rows.join('')}</div>`;
}
// A plan in words, for screen readers and shelves.
export function sayPlan(bag, n, key) {
  const word = c => c === 'T' ? 'take' : 'pass';
  const first = bag.map((x, i) => `${word(key[i])} a first ${x}`).join(', ');
  if (n === 2) return `${first[0].toUpperCase()}${first.slice(1)}.`;
  const after = bag.map((x, i) => key[i] === 'P' ? `after a first ${x}, ${bag.map((y, j) => `${word(key[K + K * i + j])} ${y}`).join(', ')}` : '').filter(Boolean).join('; ');
  return `${first[0].toUpperCase()}${first.slice(1)}${after ? `; ${after}` : ''}.`;
}
// A row of tickets in small, for shelves and catalogs.
const miniRow = (values, cls = () => '') => `<span class="off-mini"><span class="off-mini-row">${values.map(v => ticket(v, cls(v))).join('')}</span></span>`;
// A plan in small: a row of first-offer switches, and a row for each passed first.
function planMini(bag, n, key) {
  const t = (v, c) => `<i class="off-t ${c === 'T' ? 'taken' : 'passed'}">${v}</i>`;
  const lines = n === 3 ? bag.map((x, i) => key[i] === 'P' ? `<span class="off-mini-row"><b>${x}:</b>${bag.map((y, j) => t(y, key[K + K * i + j])).join('')}</span>` : '').join('') : '';
  return `<span class="off-mini"><span class="off-mini-row">${bag.map((x, i) => t(x, key[i])).join('')}</span>${lines}</span>`;
}
// Two towers per row: what taking the first offer scores on the row's cards,
// and the most passing it can. Shown once a puzzle is solved.
function tower(values, label, best, unit) {
  return `<span class="off-tower${best ? ' best' : ''}"><span class="off-stack" style="--u:${unit}px" aria-hidden="true">${values.filter(v => v > 0).map(v => `<i style="--v:${v}"></i>`).join('')}</span><b>${sum(values)}</b><span>${label}</span></span>`;
}
export const bestPass = (bag, n, w) => n === 2 ? w[1] : (w[1] * K > sum(bag) ? w[1] : w[2]);
function towersHTML(bag, n) {
  const unit = n === 2 ? 4 : 2;
  const rows = bag.map((x, i) => {
    const inRow = cardsOf(bag, n).filter(w => w[0] === x), take = inRow.map(() => x), pass = inRow.map(w => bestPass(bag, n, w));
    return `<figure class="off-towers" role="img" aria-label="${esc(`First ${x}: taking scores ${sum(take)}, passing at most ${sum(pass)}`)}"><figcaption>First ${ticket(x)}</figcaption><span class="off-pair">${tower(take, 'Take', sum(take) >= sum(pass), unit)}${tower(pass, 'Pass', sum(pass) >= sum(take), unit)}</span></figure>`;
  });
  return `<section class="off-proof" aria-label="Taking against passing, row by row">${rows.join('')}</section>`;
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const hinted = (type, more = () => true) => h?.type === type && more(h) ? 'hinted' : '';
  const wrap = (...parts) => `<div class="off-puzzle" data-mechanic-wire="offers">${parts.join('')}</div>`;
  const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
  const claimButton = () => button('That’s all', {type: 'claim'}, hinted('claim'), b.kept.length && !b.missed ? '' : 'disabled');
  const missed = () => b.missed && !solved ? note('There’s another.') : '';
  const bagLine = bag => `<p class="off-bag" role="img" aria-label="${esc(`The bag: ${bag.join(', ')}`)}"><span class="off-say">Bag</span>${bag.map(v => ticket(v)).join('')}<span class="off-say">${q.n} offers</span></p>`;
  const flipHint = h?.type === 'flip' ? h.at : null;
  if (q.mode === 'plan' || q.mode === 'plans') {
    const board = boardHTML(q.bag, q.n, b.plan, {still: solved, hint: flipHint});
    const wrong = b.wrong ? note('Another plan scores more.') : '';
    if (q.mode === 'plan') {
      const actions = solved ? '' : `<div class="case-actions">${button('Best plan', {type: 'best'}, hinted('best'), b.wrong ? 'disabled' : '')}</div>`;
      return wrap(bagLine(q.bag), board, actions, wrong, solved ? towersHTML(q.bag, q.n) : '', status(sayPlan(q.bag, q.n, planKey(b.plan))));
    }
    const kept = b.kept.includes(planKey(b.plan));
    const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), b.wrong || kept ? 'disabled' : '')}${claimButton()}</div>`;
    const shelf = shelfHTML(b.kept, {mini: key => planMini(q.bag, q.n, key), say: key => sayPlan(q.bag, q.n, key), current: kept && !solved ? planKey(b.plan) : null, label: 'Plans kept'});
    return wrap(bagLine(q.bag), board, actions, wrong, missed(), shelf, solved ? towersHTML(q.bag, q.n) : '', status(sayPlan(q.bag, q.n, planKey(b.plan))));
  }
  if (q.mode === 'differ') {
    const A = planOf(q, 'A'), B = planOf(q, 'B'), targets = targetsOf(q);
    const plans = `<div class="off-plans">${['A', 'B'].map(name => `<figure class="off-fixed" role="group" aria-label="${esc(`Plan ${name}: ${q.say[name]}`)}"><figcaption><b>${name}</b> ${esc(q.say[name])}</figcaption></figure>`).join('')}</div>`;
    const rows = q.bag.map(x => `<div class="off-row" role="group" aria-label="${esc(`Cards starting with ${x}`)}"><div class="off-cards">${cardsOf(q.bag, q.n).filter(w => w[0] === x).map(w => {
      const key = cardKey(w), kept = b.kept.includes(key);
      return solved ? `<span class="off-card two${targets.includes(key) ? ' yes' : ''}" role="img" aria-label="${esc(`${sayWord(w)}: A takes ${scoreOf(q.bag, A, w)}, B takes ${scoreOf(q.bag, B, w)}`)}"><span class="off-take">${w.map((v, k) => ticket(v, k === stopAt(q.bag, A, w) ? 'taken a' : '')).join('')}</span><span class="off-take">${w.map((v, k) => ticket(v, k === stopAt(q.bag, B, w) ? 'taken b' : '')).join('')}</span></span>`
        : cardHTML(w, null, {button: true, mark: `${kept ? 'kept' : ''}${h?.key === key ? ' hinted' : ''}${b.wrong === key ? ' refused' : ''}`, still: kept, label: `${sayWord(w)}${kept ? ', kept' : ''}`});
    }).join('')}</div></div>`).join('');
    const actions = solved ? '' : `<div class="case-actions">${claimButton()}</div>`;
    const refused = b.wrong ? note(`A and B score the same on ${sayCard(b.wrong)}.`) : '';
    const shelf = solved ? '' : shelfHTML(b.kept, {mini: key => miniRow(key.split('-')), say: sayCard, label: 'Cards kept'});
    const proof = solved ? `<section class="off-proof" aria-label="A against B where they differ"><figure class="off-towers" role="img" aria-label="${esc(`Where they differ, A scores ${sum(targets.map(k => scoreOf(q.bag, A, k.split('-').map(Number))))} and B ${sum(targets.map(k => scoreOf(q.bag, B, k.split('-').map(Number))))}`)}"><figcaption>Where they differ</figcaption><span class="off-pair">${['A', 'B'].map(name => tower(targets.map(k => scoreOf(q.bag, planOf(q, name), k.split('-').map(Number))), name, name === 'B', 4)).join('')}</span></figure></section>` : '';
    return wrap(bagLine(q.bag), plans, `<div class="off-board n3 dark">${rows}</div>`, refused, actions, missed(), shelf, proof);
  }
  // A ticket to choose, beside the two that stay.
  const bag = shownBag(q, b), kept = b.value !== null && b.kept.includes(String(b.value));
  const menu = `<div class="off-menu" role="group" aria-label="Tickets to try">${q.menu.map(v => `<button type="button" class="off-t off-pick${hinted('pick', x => x.value === v) ? ' hinted' : ''}" data-off-move="${esc(JSON.stringify({type: 'pick', value: v}))}" data-focus="off-pick${v}" aria-pressed="${b.value === v}" aria-label="Try ${v}"${solved ? ' disabled' : ''}>${v}</button>`).join('')}</div>`;
  const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), b.value === null || b.wrong !== null || kept ? 'disabled' : '')}${claimButton()}</div>`;
  const shelf = solved ? '' : shelfHTML(b.kept, {mini: key => miniRow([key]), say: key => `${key} in the bag`, current: kept ? String(b.value) : null, label: 'Tickets kept'});
  const tickets = bag ? bag.map(v => ticket(v, v === b.value ? 'chosen' : 'pin')).join('') : `${q.pins.map(v => ticket(v, 'pin')).join('')}${ticket('?', 'blank')}`;
  const pinned = `<p class="off-bag" role="img" aria-label="${esc(bag ? `The bag: ${bag.join(', ')}` : `The bag: ${q.pins.join(', ')} and a ticket to choose`)}"><span class="off-say">Bag</span>${tickets}<span class="off-say">${q.n} offers</span></p>`;
  const board = bag ? boardHTML(bag, q.n, b.plan, {still: solved, hint: flipHint}) : '';
  const refusal = b.wrong === 'plan' ? note('Another plan scores more.') : b.wrong === 'goal' ? note(q.goal === 'tie' ? 'No tie.' : 'Not every best plan passes it first and takes it second.') : '';
  return wrap(pinned, menu, actions, refusal, missed(), shelf, board, solved ? bagCatalog(q) : '', status(bag ? `Bag ${bag.join(', ')}. ${sayPlan(bag, q.n, planKey(b.plan))}` : 'Choose a ticket.'));
}
// After That's all: every ticket of the menu, in columns by what the best plan does with the middle.
function bagCatalog(q) {
  const verdict = (x, m) => { const bag = bagWith(q, x), d = middle(bag) * K ** (m - 1) - follow(bag, m - 1); return d > 0 ? 'take' : d < 0 ? 'pass' : 'tie'; };
  const column = key => q.goal === 'tie' ? verdict(Number(key), 2) : `${verdict(Number(key), 2)}-${verdict(Number(key), 3)}`;
  // With three offers a column names what happens to the ticket as a second offer (two offers left), then as a first (three left).
  const NAMES = {take: 'Middle taken', tie: 'A tie', pass: 'Middle passed', 'pass-pass': 'Passed first and second', 'tie-pass': 'Passed first, a tie second', 'take-pass': 'Passed first, taken second', 'take-take': 'Taken first and second'};
  const keys = q.menu.map(String), ids = [...new Set(keys.map(column))].sort((x, y) => Object.keys(NAMES).indexOf(x) - Object.keys(NAMES).indexOf(y));
  return catalogHTML(keys, ids.map(id => ({id, label: NAMES[id]})), column, {mini: key => miniRow(bagWith(q, Number(key)), v => v === Number(key) ? 'chosen' : ''), say: key => `${key}: ${NAMES[column(key)].toLowerCase()}`, label: 'Every ticket', mark: key => targetsOf(q).includes(key) ? 'yes' : ''});
}

// The playground: choose a bag and the number of offers, then play rounds:
// Draw shows the first offer; Take scores it, Pass shows the next; the last
// offer must be taken. Each round lands, as its complete card, in the pile of
// its score, its unseen offers drawn too and faded. At most thirty rounds.
export const BAGS = [[0, 4, 6], [0, 2, 6], [0, 3, 6], [0, 5, 6]];
export const PLAY_ROUNDS = 30;
function freshPlay() { return {bag: 0, n: 2, offers: [], rounds: []}; }
function validPlay(p, b) {
  if (!object(b) || Object.keys(b).length !== 4 || ![0, 1, 2, 3].includes(b.bag) || ![2, 3].includes(b.n)) return false;
  const bag = BAGS[b.bag], ticketOk = v => bag.includes(v);
  return Array.isArray(b.offers) && b.offers.length <= b.n && b.offers.every(ticketOk) && Array.isArray(b.rounds) && b.rounds.length <= PLAY_ROUNDS
    && b.rounds.every(r => Array.isArray(r) && r.length === b.n + 1 && r.slice(0, b.n).every(ticketOk) && Number.isInteger(r[b.n]) && r[b.n] >= 0 && r[b.n] < b.n);
}
function movePlay(p, b, action, random = Math.random) {
  if (!validPlay(p, b) || !object(action)) return null;
  const bag = BAGS[b.bag], draw = () => bag[Math.min(K - 1, Math.floor(random() * K))];
  switch (action.type) {
    case 'bag': return [0, 1, 2, 3].includes(action.bag) && action.bag !== b.bag && !b.offers.length ? {...b, bag: action.bag, rounds: []} : null;
    case 'offers': return [2, 3].includes(action.n) && action.n !== b.n && !b.offers.length ? {...b, n: action.n, rounds: []} : null;
    case 'draw': return !b.offers.length && b.rounds.length < PLAY_ROUNDS ? {...b, offers: [draw()]} : null;
    // Pass gives the offer up and shows the next; the last can't be passed.
    case 'pass': return b.offers.length && b.offers.length < b.n ? {...b, offers: [...b.offers, draw()]} : null;
    case 'take': {
      if (!b.offers.length) return null;
      const at = b.offers.length - 1, card = [...b.offers];
      while (card.length < b.n) card.push(draw());
      return {...b, offers: [], rounds: [...b.rounds, [...card, at]]};
    }
    case 'clear': return b.rounds.length && !b.offers.length ? {...b, rounds: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, bag = BAGS[b.bag], n = b.n, live = b.offers.length > 0, last = b.offers.length === n;
  // The bag and the number of offers are fixed during a round.
  const still = live ? ' disabled' : '';
  const bags = `<div class="case-tools" role="group" aria-label="Which bag">${BAGS.map((x, i) => button(x.map(v => ticket(v)).join(''), {type: 'bag', bag: i}, 'case-tool', `aria-pressed="${b.bag === i}" aria-label="Bag ${x.join(', ')}"${still}`)).join('')}</div>`;
  const counts = `<div class="case-tools" role="group" aria-label="How many offers">${[2, 3].map(m => button(`${m} offers`, {type: 'offers', n: m}, 'case-tool', `aria-pressed="${b.n === m}"${still}`)).join('')}</div>`;
  // One turn counter for each offer still to come, the one showing included.
  const left = live ? n - b.offers.length + 1 : n;
  const counters = `<span class="off-counters" role="img" aria-label="${left} ${left === 1 ? 'offer' : 'offers'} left">${'<i></i>'.repeat(left)}</span>`;
  const round = live ? `<div class="off-round">${b.offers.map((v, k) => ticket(v, k < b.offers.length - 1 ? 'passed' : 'current')).join('')}</div>` : '';
  const actions = live ? `<div class="case-actions">${button('Take', {type: 'take'})}${button('Pass', {type: 'pass'}, '', last ? 'disabled' : '')}</div>`
    : `<div class="case-actions">${button('Draw', {type: 'draw'}, '', b.rounds.length < PLAY_ROUNDS ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.rounds.length ? '' : 'disabled')}</div>`;
  const keys = b.rounds.map(r => r.join('-')), word = key => key.split('-').map(Number), scoreKey = key => { const r = word(key); return String(r[r[n]]); };
  const mini = key => { const r = word(key); return cardHTML(r.slice(0, n), r[n]); };
  const piles = binsHTML(keys.map((k, i) => `${k}-${i}`), bag.map(v => ({id: String(v), label: `<span aria-hidden="true">Scored ${ticket(v)}</span><span class="sr-only">Scored ${v}</span>`})), key => scoreKey(key.split('-').slice(0, n + 1).join('-')), {mini: key => mini(key.split('-').slice(0, n + 1).join('-')), say: key => { const r = word(key); return `${sayWord(r.slice(0, n))}: took ${r[r[n]]}`; }, always: true, label: 'Rounds, by score'});
  const said = `Bag ${bag.join(', ')}, ${n} offers. ${live ? `Offer ${b.offers.at(-1)}${last ? ', the last: take it' : ''}. ` : ''}${b.rounds.length} rounds played.`;
  const full = !live && b.rounds.length >= PLAY_ROUNDS ? note('Thirty rounds. Clear the piles to play more.') : '';
  return `<div class="off-play" data-mechanic-wire="offers">${bags}${counts}<div class="off-table">${counters}${round}</div>${actions}${full}${piles}<p class="sr-only" role="status">${esc(said)}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
function wire(root, p, api) {
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-off-move]');
    if (!control || !root.contains(control) || control.disabled || control.getAttribute('aria-pressed') === 'true') return;
    try { api.apply(JSON.parse(control.dataset.offMove)); } catch { /* malformed control data is ignored */ }
  });
}

export const offerMechanics = {
  offers: {
    fresh: p => isPlay(p) ? freshPlay(p) : freshPuzzle(p),
    valid: (p, b) => isPlay(p) ? validPlay(p, b) : validPuzzle(p, b),
    solved: (p, b) => isPlay(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => isPlay(p) ? movePlay(p, b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => isPlay(p) ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => isPlay(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    noHint: isPlay,
    // A passed offer is gone for good, so the playground has no Undo.
    noUndo: isPlay
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'offers',
  family: {id: 'offers', symbol: '▷'},
  mechanics: offerMechanics,
  pack: new URL('./offers.json', import.meta.url).href,
  css: new URL('./offers.css', import.meta.url).href,
  focus: '.off-switch:not([disabled]),button.off-card:not([disabled]),.off-pick[aria-pressed="true"],.case-action:not([disabled])'
};
