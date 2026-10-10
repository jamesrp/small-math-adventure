// Copying bags (worksheet Week 44). A bag starts with one red and one blue
// counter. A counter is drawn, each counter in the bag as likely as any other;
// it goes back, and a new counter of its colour joins it (Pólya's urn). Copies
// are numbered as they arrive: red 2 is the second red. A history is the
// counters drawn, in order. Each draw chooses among the counters then in the
// bag, so after n draws there are 2 · 3 · … · (n + 1) = (n + 1)! histories,
// all equally likely. Sorted by how many reds were drawn they split evenly,
// n! to each of the n + 1 groups, so the lopsided final bag is exactly as
// likely as the balanced one, and any two orders of the same colours are as
// likely as each other. For two draws, putting back without a copy gives
// 1, 2, 1 instead, and adding the other colour gives 1, 4, 1. The shelf, bins
// and counters come from the shared case engine (dist/cases.js).
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, binsHTML, shelfHTML, catalogHTML, counterIds, counterMini, sayCounter, counterBagHTML, drawRowHTML, wireCounters, COUNTER_COLOURS} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// What a draw adds: a copy of its colour, nothing, or the other colour.
export const RULES = ['copy', 'return', 'other'];
const ORDER = 'RBY';
const sortColours = s => [...s].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('');
const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); };

// The bag after some draws: counter ids in the order they joined, or null if a
// draw was not in the bag at the time.
export function bagAfter(start, rule, draws) {
  const bag = [...counterIds(start)], count = {};
  for (const id of bag) count[id[0]] = (count[id[0]] || 0) + 1;
  for (const id of draws) {
    if (typeof id !== 'string' || !bag.includes(id)) return null;
    const c = rule === 'copy' ? id[0] : rule === 'other' ? (id[0] === 'R' ? 'B' : 'R') : null;
    if (c) bag.push(c + (count[c] = (count[c] || 0) + 1));
  }
  return bag;
}
export const wordOf = draws => draws.map(id => id[0]).join('');
export const mixOf = draws => sortColours(wordOf(draws));
export const redsOf = draws => draws.filter(id => id[0] === 'R').length;
// A bag by its colours alone: 'RRRBB' is three red and two blue.
export const bagKey = (start, rule, draws) => sortColours(bagAfter(start, rule, draws).map(id => id[0]).join(''));
export const historyKey = draws => draws.join('');
export const idsOf = key => key.match(/[RBY]\d+/g) || [];
// Every history of n draws, as lists of counter ids.
export const histories = (start, rule, n) => remember(`h:${start}:${rule}:${n}`, () => {
  let out = [[]];
  for (let k = 0; k < n; k++) out = out.flatMap(h => bagAfter(start, rule, h).map(id => [...h, id]));
  return out;
});
// Every mix of n draws from the bag's colours, most red first.
export const mixes = (start, n) => remember(`m:${start}:${n}`, () => {
  const colours = sortColours([...new Set(start)].join(''));
  const go = (from, left) => left ? [...colours.slice(from)].flatMap((c, i) => go(from + i, left - 1).map(rest => c + rest)) : [''];
  return go(0, n);
});
// Every order of a mix: the colour words with these colours.
const permute = s => s.length < 2 ? [s] : [...s].flatMap((c, i) => permute(s.slice(0, i) + s.slice(i + 1)).map(r => c + r));
const rank = word => [...word].map(c => ORDER.indexOf(c)).join('');
const ordersOf = mix => remember(`o:${mix}`, () => [...new Set(permute(mix))].sort((a, b) => rank(a) < rank(b) ? -1 : 1));

// What a puzzle keeps, and which complete draws count.
//   make:      {start, rule, target}: make the bag `target`
//   bags:      {start, rule, draws}: keep every bag n draws can make
//   stories:   {start, rule, draws, target}: keep every colour story that ends at `target`
//   histories: {start, rule, draws, reds?}: keep every history (with that many reds)
export const stepsOf = q => q.mode === 'make' ? q.target.length - q.start.length : q.draws;
export function caseOf(q, draws) {
  if (q.mode === 'make' || q.mode === 'bags') return bagKey(q.start, q.rule, draws);
  if (q.mode === 'stories') return wordOf(draws);
  return historyKey(draws);
}
export function counts(q, draws) {
  if (q.mode === 'make' || q.mode === 'stories') return bagKey(q.start, q.rule, draws) === q.target;
  if (q.mode === 'histories') return q.reds === undefined || redsOf(draws) === q.reds;
  return true;
}
export const targetKeys = q => remember(`t:${JSON.stringify(q)}`, () => [...new Set(histories(q.start, q.rule, stepsOf(q)).filter(h => counts(q, h)).map(h => caseOf(q, h)))]);

// Boards: {draws} for make; {draws, kept, claimed, missed} for the rest.
const legalDraws = (q, draws, n) => Array.isArray(draws) && draws.length <= n && bagAfter(q.start, q.rule, draws) !== null;
function freshPuzzle(p) {
  return p.parameters.mode === 'make' ? {draws: []} : {draws: [], kept: [], claimed: false, missed: false};
}
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b) || !legalDraws(q, b.draws, stepsOf(q))) return false;
  if (q.mode === 'make') return Object.keys(b).length === 1;
  return validShelf({kept: b.kept, claimed: b.claimed, missed: b.missed}, targetKeys(q)) && Object.keys(b).length === 4;
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'make') return b.draws.length === stepsOf(q) && counts(q, b.draws);
  return b.claimed;
}
function movePuzzle(p, b, action) {
  const q = p.parameters, n = stepsOf(q);
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  switch (action.type) {
    case 'draw': return b.draws.length < n && bagAfter(q.start, q.rule, b.draws).includes(action.id) ? {...b, draws: [...b.draws, action.id]} : null;
    case 'again': return b.draws.length ? {...b, draws: []} : null;
  }
  if (q.mode === 'make') return null;
  if (action.type === 'keep') {
    // A kept case moves to the shelf, leaving the draws empty.
    if (b.draws.length < n || !counts(q, b.draws)) return null;
    const kept = keepCase(b.kept, caseOf(q, b.draws), key => targetKeys(q).includes(key));
    return kept ? {...b, draws: [], kept, missed: false} : null;
  }
  if (action.type === 'claim') return b.kept.length && !b.missed ? {...b, ...claimCases(targetKeys(q), b.kept)} : null;
  return null;
}

// Hints: draw toward the first missing case, then Keep, Again or That's all.
const startsWith = (h, draws) => draws.every((id, i) => h[i] === id);
function hintPuzzle(p, b) {
  const q = p.parameters, n = stepsOf(q);
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const missing = q.mode === 'make' ? [q.target] : missingCases(targetKeys(q), b.kept);
  if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
  if (b.draws.length === n) {
    return q.mode !== 'make' && counts(q, b.draws) && missing.includes(caseOf(q, b.draws))
      ? {type: 'move', action: {type: 'keep'}, text: 'Keep this one.'}
      : {type: 'move', action: {type: 'again'}, text: 'Start again.'};
  }
  const goal = histories(q.start, q.rule, n).find(h => startsWith(h, b.draws) && counts(q, h) && missing.includes(caseOf(q, h)));
  if (!goal) return {type: 'move', action: {type: 'again'}, text: 'Start again.'};
  const id = goal[b.draws.length];
  return {type: 'move', action: {type: 'draw', id}, text: `Draw ${sayCounter(id)}.`};
}

// Drawing.
const COLOUR = COUNTER_COLOURS;
const disc = c => `<i class="case-counter c${c}" aria-hidden="true"></i>`;
const discs = colours => `<span class="case-mini copy-discs">${[...colours].map(disc).join('')}</span>`;
const sayCounts = colours => ORDER.split('').filter(c => colours.includes(c)).map(c => `${[...colours].filter(x => x === c).length} ${COLOUR[c]}`).join(', ');
const sayWord = word => [...word].map(c => COLOUR[c]).join(', ');
const historyMini = key => `<span class="case-mini copy-history">${idsOf(key).map(id => counterMini(id)).join('')}</span>`;
const sayHistory = key => idsOf(key).map(sayCounter).join(', then ');
const mixBins = q => mixes(q.start, stepsOf(q)).map(m => ({id: m, label: `${discs(m)}<span class="sr-only">${sayCounts(m)}</span>`}));
// The catalog's columns are named by their reds, so they don't look like the
// order bins above them (two colours only).
const redBins = q => mixBins(q).map(({id}) => { const r = [...id].filter(c => c === 'R').length; return {id, label: `<span class="copy-reds">${r ? `${r} red` : 'no red'}</span>`}; });
const wordBins = q => ordersOf('R'.repeat(q.reds) + 'B'.repeat(stepsOf(q) - q.reds)).map(w => ({id: w, label: `${discs(w)}<span class="sr-only">${sayWord(w)}</span>`}));
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-copy-move="${esc(JSON.stringify(action))}" data-focus="copy-${action.type}${action.n ?? ''}" ${extra}>${label}</button>`;
// The bag, a colour at a time, and the draws so far.
const bagHTML = (bag, o = {}) => counterBagHTML(bag, {button: true, sorted: true, byId: true, cls: 'copy-bag', ...o});
function shelf(q, b, o) {
  const current = o.full && !o.solved && counts(q, b.draws) ? caseOf(q, b.draws) : null;
  if (q.mode === 'bags') return shelfHTML(b.kept, {mini: discs, say: sayCounts, current, label: 'Bags kept'});
  if (q.mode === 'stories') return shelfHTML(b.kept, {mini: discs, say: sayWord, current, label: 'Stories kept'});
  const said = {mini: historyMini, say: sayHistory, current, always: true, label: 'Histories kept'};
  if (q.reds === undefined) return binsHTML(b.kept, mixBins(q), key => mixOf(idsOf(key)), said);
  if (q.reds > 0 && q.reds < stepsOf(q)) return binsHTML(b.kept, wordBins(q), key => wordOf(idsOf(key)), said);
  return shelfHTML(b.kept, said);
}
// Every history, by its mix of colours, the ones the puzzle asked for in green.
const catalog = q => catalogHTML(histories(q.start, q.rule, stepsOf(q)).map(historyKey), q.start.length === 2 ? redBins(q) : mixBins(q), key => mixOf(idsOf(key)), {mini: historyMini, say: sayHistory, label: 'Every history', mark: key => counts(q, idsOf(key)) ? 'yes' : 'no'});

// The bag a puzzle aims for, as discs for children who don't read the goal.
const goalHTML = q => q.target ? `<div class="copy-goal" role="img" aria-label="${esc(`${q.mode === 'make' ? 'The bag to make' : 'The bag at the end'}: ${sayCounts(q.target)}`)}"><span class="copy-goal-flag" aria-hidden="true">⚑</span>${discs(q.target)}</div>` : '';
function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, n = stepsOf(q), solved = solvedPuzzle(p, b), full = b.draws.length === n;
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const bag = goalHTML(q) + bagHTML(bagAfter(q.start, q.rule, b.draws), {still: solved || full, hinted: h?.type === 'draw' ? h.id : null});
  if (q.mode === 'make') {
    const actions = solved ? '' : `<div class="case-actions">${button('Again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '', b.draws.length ? '' : 'disabled')}</div>`;
    return `<div class="copy-puzzle" data-mechanic-wire="copies">${bag}${drawRowHTML(b.draws, n)}${actions}<p class="sr-only" role="status">${esc(`The bag: ${sayCounts(bagKey(q.start, q.rule, b.draws))}.`)}</p></div>`;
  }
  const can = full && counts(q, b.draws) && !b.kept.includes(caseOf(q, b.draws));
  const actions = solved ? '' : `<div class="case-actions">${button('Again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '', b.draws.length ? '' : 'disabled')}${button('Keep', {type: 'keep'}, h?.type === 'keep' ? 'hinted' : '', can ? '' : 'disabled')}${button('That’s all', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
  const missed = b.missed ? '<p class="case-note" role="status">There’s another.</p>' : '';
  const done = solved && q.catalog ? catalog(q) : '';
  return `<div class="copy-puzzle" data-mechanic-wire="copies">${bag}${drawRowHTML(b.draws, n)}${actions}${missed}${shelf(q, b, {full, solved})}${done}<p class="sr-only" role="status">${esc(b.draws.length ? `Drawn: ${b.draws.map(sayCounter).join(', then ')}. The bag: ${sayCounts(bagKey(q.start, q.rule, b.draws))}.` : 'Nothing drawn.')}</p></div>`;
}

// The playground: runs of four draws from one red and one blue under any of
// the three rules. Each finished run drops a dot in the column for its reds.
export const PLAY_START = 'RB', PLAY_RUN = 4, PLAY_RUNS = 100;
const PLAY_LABEL = {copy: 'Add the same colour', return: 'Just put back', other: 'Add the other colour'};
function freshPlay() { return {rule: 'copy', draws: [], runs: []}; }
function validPlay(b) {
  if (!object(b) || !RULES.includes(b.rule) || !Array.isArray(b.runs) || b.runs.length > PLAY_RUNS || Object.keys(b).length !== 3) return false;
  if (!b.runs.every(r => Number.isInteger(r) && r >= 0 && r <= PLAY_RUN)) return false;
  if (!legalDraws({start: PLAY_START, rule: b.rule}, b.draws, PLAY_RUN)) return false;
  // A finished run is already in the columns, and full columns stop a new run.
  if (b.draws.length === PLAY_RUN) return b.runs.length > 0 && b.runs.at(-1) === redsOf(b.draws);
  return b.runs.length < PLAY_RUNS || b.draws.length === 0;
}
// One draw: a finished run makes way for a new one, and a run that finishes is filed.
function playDraw(b, id) {
  // With the columns full, no new run can finish, so none starts.
  if (b.runs.length >= PLAY_RUNS) return null;
  const draws = b.draws.length === PLAY_RUN ? [] : b.draws;
  if (!bagAfter(PLAY_START, b.rule, draws).includes(id)) return null;
  const next = [...draws, id];
  return next.length < PLAY_RUN ? {...b, draws: next} : {...b, draws: next, runs: [...b.runs, redsOf(next)]};
}
const randomDraw = (b, random) => { const bag = bagAfter(PLAY_START, b.rule, b.draws.length === PLAY_RUN ? [] : b.draws); return playDraw(b, bag[Math.min(bag.length - 1, Math.floor(random() * bag.length))]); };
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  switch (action.type) {
    case 'draw': return playDraw(b, action.id);
    case 'random': return randomDraw(b, random);
    case 'finish': {
      let next = randomDraw(b, random);
      while (next && next.draws.length < PLAY_RUN) next = randomDraw(next, random);
      return next;
    }
    case 'runs': {
      if (action.n !== 10 || b.runs.length + 10 > PLAY_RUNS) return null;
      // Ten whole runs; a run under way is set aside.
      let next = {...b, draws: []};
      for (let k = 0; k < 10 && next; k++) next = movePlay(next, {type: 'finish'}, random);
      return next;
    }
    case 'rule': return RULES.includes(action.rule) && action.rule !== b.rule ? {rule: action.rule, draws: [], runs: []} : null;
    case 'clear': return b.draws.length || b.runs.length ? {...b, draws: [], runs: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, room = PLAY_RUNS - b.runs.length;
  const rules = `<div class="case-tools copy-rules" role="group" aria-label="After each draw">${RULES.map(r => `<button type="button" class="secondary case-tool${b.rule === r ? ' on' : ''}" aria-pressed="${b.rule === r}" data-copy-move="${esc(JSON.stringify({type: 'rule', rule: r}))}" data-focus="copy-rule-${r}">${PLAY_LABEL[r]}</button>`).join('')}</div>`;
  // After a finished run the bag is back to one of each: the next draw starts a new run.
  const bag = bagHTML(bagAfter(PLAY_START, b.rule, b.draws.length === PLAY_RUN ? [] : b.draws), {still: !room});
  const actions = `<div class="case-actions">${button('Draw', {type: 'random'}, '', room ? '' : 'disabled')}${button('Finish', {type: 'finish'}, '', room ? '' : 'disabled')}${button('10 runs', {type: 'runs', n: 10}, '', room >= 10 ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.draws.length || b.runs.length ? '' : 'disabled')}</div>`;
  const columns = mixes(PLAY_START, PLAY_RUN).map(m => {
    const reds = [...m].filter(c => c === 'R').length, dots = b.runs.filter(r => r === reds).length;
    return `<div class="copy-run-column" role="group" aria-label="${esc(`${sayCounts(m)} drawn: ${dots} ${dots === 1 ? 'run' : 'runs'}`)}"><div class="copy-dots">${'<i class="copy-dot" aria-hidden="true"></i>'.repeat(dots)}</div>${discs(m)}</div>`;
  }).join('');
  const said = `${b.draws.length ? `Drawn: ${b.draws.map(sayCounter).join(', then ')}.` : 'Nothing drawn.'} ${b.runs.length} ${b.runs.length === 1 ? 'run' : 'runs'} in the columns.`;
  return `<div class="copy-play" data-mechanic-wire="copies">${rules}${bag}${drawRowHTML(b.draws, PLAY_RUN)}${actions}<section class="copy-runs" aria-label="Runs">${columns}</section><p class="sr-only" role="status">${esc(said)}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
let pending = null;
function wire(root, p, api) {
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; api.apply(action); };
  wireCounters(root, id => apply({type: 'draw', id}));
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-copy-move]');
    if (!el || !root.contains(el) || el.disabled || el.getAttribute('aria-pressed') === 'true') return;
    try { apply(JSON.parse(el.dataset.copyMove)); } catch { /* malformed control data is ignored */ }
  });
  // The copy a draw adds arrives in the bag; a kept case arrives on the shelf.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board;
  if (last.action.type === 'keep') root.querySelector(`[data-key="${CSS.escape(b.kept.at(-1))}"]`)?.classList.add('fresh');
  if (['draw', 'random'].includes(last.action.type) && b.draws.length) {
    const q = isPlay(p) ? {start: PLAY_START, rule: b.rule} : p.parameters, bag = bagAfter(q.start, q.rule, b.draws);
    if (bag.length > bagAfter(q.start, q.rule, b.draws.slice(0, -1)).length) root.querySelector(`.copy-bag [data-counter="${CSS.escape(bag.at(-1))}"]`)?.classList.add('fresh');
  }
  // Keyboard: when a move greys out the focused control the app falls back to
  // the first control on the board. A finished row of draws goes to Keep (or
  // Again), and the playground's buttons keep focus among the buttons.
  if (!root.contains(document.activeElement)) return;
  const focus = (...selectors) => { const el = selectors.flatMap(s => [...root.querySelectorAll(s)]).find(x => !x.disabled); el?.focus({preventScroll: true}); };
  if (!isPlay(p) && last.action.type === 'draw' && b.draws.length === stepsOf(p.parameters)) focus('[data-focus="copy-keep"]', '[data-focus="copy-again"]');
  else if (isPlay(p) && ['random', 'finish', 'runs', 'clear'].includes(last.action.type) && document.activeElement.matches('.case-counter')) focus('.case-actions .case-action');
}

export const copyMechanics = {
  copies: {
    fresh: p => isPlay(p) ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => isPlay(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => isPlay(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => isPlay(p) ? movePlay(b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => isPlay(p) ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => isPlay(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    noHint: isPlay
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'copies',
  family: {id: 'copies', symbol: '⊕'},
  mechanics: copyMechanics,
  pack: new URL('./copies.json', import.meta.url).href,
  css: new URL('./copies.css', import.meta.url).href,
  focus: '.copy-bag button.case-counter:not([disabled]),.case-actions .case-action:not([disabled])'
};
