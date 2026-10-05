// Ticket shuffles (worksheet Week 43). Lettered cups stand in numbered slots.
// A rule is a list of steps; at each step a ticket is drawn from that step's
// cup of tickets and the step's slot swaps with the slot on the ticket. A
// story is the list of tickets drawn, so a rule with ticket cups of sizes
// s1, s2, … has s1 · s2 · … equally likely stories. A rule is fair when every
// order of the cups comes from the same number of stories. Swapping slot 1
// with any of slots 1…n, then slot 2 with any of 2…n, and so on (Fisher and
// Yates) gives n! stories and every order exactly once: read the story off the
// target order, one slot at a time. Swapping slot k with any of all n slots
// for k = 1…n gives n^n stories, and n! does not divide n^n for n ≥ 3, so that
// rule can't be fair: for three cups its 27 stories make the six orders 4, 5,
// 5, 5, 4 and 4 times. Never letting a slot swap with itself makes only the
// orders that move every cup round one loop. The shelf and catalog come from
// the shared case engine (dist/cases.js).
import {esc} from '../../expansion-controls.js';
import {letters, rowsOf, product, swapRow, keepCase, claimCases, missingCases, validShelf, shelfHTML, binsHTML, catalogHTML, wireCases, cupsBoard, cupMini, sayRow, wireCups} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const range = (from, to) => Array.from({length: to - from + 1}, (_, i) => from + i);

// A rule's steps are {slot, tickets}, numbered from 1 as on the page.
export const storyKey = story => story.join('');
export const storyOf = key => [...key].map(Number);
export function runStory(start, steps, story) {
  return story.reduce((row, ticket, k) => swapRow(row, steps[k].slot - 1, ticket - 1), start);
}
const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); };
// Every complete story of a rule.
export const stories = steps => remember(`s:${JSON.stringify(steps)}`, () => product(steps.map(s => s.tickets)).map(storyKey));
// The stories of a rule sorted by the order each one makes.
export const byOrder = (start, steps) => remember(`o:${start}:${JSON.stringify(steps)}`, () => {
  const out = Object.fromEntries(rowsOf(start.length).map(row => [row, []]));
  for (const key of stories(steps)) out[runStory(start, steps, storyOf(key))].push(key);
  return out;
});
// Which keys a puzzle asks for: its stories, the rows its rule can make, or
// the stories that make one row.
export function targetKeys(q) {
  const all = stories(q.steps), made = byOrder(q.start, q.steps);
  if (q.mode === 'rows') return Object.keys(made).filter(row => made[row].length);
  if (q.mode === 'stories-for' || q.mode === 'target') return made[q.target];
  return all;
}
const finished = (steps, story) => story.length === steps.length;
const keyOf = (q, story) => q.mode === 'rows' ? runStory(q.start, q.steps, story) : storyKey(story);
const legalStory = (steps, story) => Array.isArray(story) && story.length <= steps.length && story.every((t, k) => Number.isInteger(t) && steps[k].tickets.includes(t));
// The keys a shelf can hold: every story, or every row of the cups.
const universe = q => q.mode === 'rows' ? rowsOf(q.cups) : stories(q.steps);
// Drawing a ticket, by tapping it or the cup in its slot.
function draw(steps, story, ticket) {
  const next = [...story, ticket];
  return !finished(steps, story) && legalStory(steps, next) ? next : null;
}

// A design puzzle: the child fills each step's cup of tickets, and the rule
// passes when every order of the cups comes from exactly one story.
const designSteps = (q, sets) => q.slots.map((slot, k) => ({slot, tickets: sets[k]}));
export function verdict(start, steps) {
  const made = byOrder(start, steps), rows = Object.keys(made);
  const twice = rows.find(row => made[row].length > 1);
  if (twice) return {kind: 'twice', row: twice, stories: made[twice].slice(0, 2)};
  const never = rows.find(row => !made[row].length);
  return never ? {kind: 'never', row: never} : {kind: 'once'};
}
const fullSets = q => q.slots.map(() => range(1, q.cups));
const legalSet = (q, set) => Array.isArray(set) && set.length > 0 && set.every((t, i) => Number.isInteger(t) && t >= 1 && t <= q.cups && (i === 0 || set[i - 1] < t));
// The rules that pass, for hints: every choice of cups whose sizes multiply
// to n! and whose stories make every order.
export const passingDesigns = q => remember(`d:${q.cups}:${JSON.stringify(q.slots)}`, () => {
  const subsets = range(1, 2 ** q.cups - 1).map(mask => range(1, q.cups).filter(t => mask >> (t - 1) & 1));
  const total = rowsOf(q.cups).length;
  return product(q.slots.map(() => subsets)).filter(sets => sets.reduce((n, s) => n * s.length, 1) === total && verdict(q.start, designSteps(q, sets)).kind === 'once');
});

function freshPuzzle(p) {
  const q = p.parameters;
  if (q.mode === 'design') return {sets: fullSets(q), tried: false};
  return q.mode === 'target' ? {story: []} : {story: [], kept: [], claimed: false, missed: false};
}
const stepsOf = (q, b) => q.mode === 'design' ? designSteps(q, b.sets) : q.steps;
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'design') return Array.isArray(b.sets) && b.sets.length === q.slots.length && b.sets.every(set => legalSet(q, set)) && typeof b.tried === 'boolean' && Object.keys(b).length === 2;
  if (!legalStory(q.steps, b.story)) return false;
  return q.mode === 'target' ? Object.keys(b).length === 1 : validShelf(b, targetKeys(q), universe(q).length);
}
const rowOf = (q, b) => q.mode === 'design' ? q.start : runStory(q.start, q.steps, b.story);
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'design') return b.tried && verdict(q.start, designSteps(q, b.sets)).kind === 'once';
  return q.mode === 'target' ? finished(q.steps, b.story) && rowOf(q, b) === q.target : b.claimed;
}
const counts = (q, key) => targetKeys(q).includes(key);
const canKeep = (q, b) => finished(q.steps, b.story) && counts(q, keyOf(q, b.story)) && !b.kept.includes(keyOf(q, b.story));
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  // A design is a choice of tickets for each step's cup, then Try it, which
  // runs every story at once; no story is drawn by hand.
  if (q.mode === 'design') {
    if (action.type === 'try') return b.tried ? null : {...b, tried: true};
    if (action.type !== 'toggle' || !Number.isInteger(action.step) || action.step < 0 || action.step >= q.slots.length) return null;
    const set = b.sets[action.step], t = action.ticket;
    if (!Number.isInteger(t) || t < 1 || t > q.cups) return null;
    const next = set.includes(t) ? set.filter(x => x !== t) : [...set, t].sort((x, y) => x - y);
    if (!next.length) return null;
    return {sets: b.sets.map((s, k) => k === action.step ? next : s), tried: false};
  }
  const steps = q.steps;
  switch (action.type) {
    case 'draw': { const story = draw(steps, b.story, action.ticket); return story ? {...b, story} : null; }
    case 'again': return b.story.length ? {...b, story: []} : null;
  }
  if (q.mode === 'target') return null;
  switch (action.type) {
    case 'keep': {
      if (!finished(steps, b.story)) return null;
      const kept = keepCase(b.kept, keyOf(q, b.story), key => counts(q, key), universe(q).length);
      return kept ? {...b, kept, missed: false} : null;
    }
    case 'load': {
      // A kept story goes back on the cups; a kept row has many stories.
      if (q.mode === 'rows' || !b.kept.includes(action.key) || action.key === storyKey(b.story)) return null;
      return {...b, story: storyOf(action.key)};
    }
    case 'claim':
      return b.kept.length && !b.missed ? {...b, ...claimCases(targetKeys(q), b.kept)} : null;
  }
  return null;
}

// Hints follow the first story, in ticket order, that leads somewhere new. A
// design's hints move one ticket toward the nearest rule that passes.
function hintDesign(q, b) {
  const gap = sets => sets.reduce((n, s, k) => n + range(1, q.cups).filter(t => s.includes(t) !== b.sets[k].includes(t)).length, 0);
  // Ties go to the itself-or-later rule (puzzle 8's), then the order listed.
  const later = sets => sets.every((s, k) => s.join() === range(q.slots[k], q.cups).join());
  const goal = [...passingDesigns(q)].sort((x, y) => gap(x) - gap(y) || later(y) - later(x))[0];
  if (!gap(goal)) return {type: 'move', action: {type: 'try'}, text: 'Try it.'};
  // Add before taking out, so no cup is ever empty.
  for (const adding of [true, false]) for (let k = 0; k < q.slots.length; k++) for (const t of range(1, q.cups)) {
    if (goal[k].includes(t) === adding && b.sets[k].includes(t) !== adding) return {type: 'move', action: {type: 'toggle', step: k, ticket: t}, text: `${adding ? 'Put' : 'Take'} ticket ${t} ${adding ? 'in' : 'out of'} the cup for slot ${q.slots[k]}.`};
  }
  return {type: 'done'};
}
function hintPuzzle(p, b) {
  const q = p.parameters;
  if (solvedPuzzle(p, b)) return {type: 'done'};
  if (q.mode === 'design') return hintDesign(q, b);
  const missing = q.mode === 'target' ? targetKeys(q) : missingCases(targetKeys(q), b.kept);
  if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
  if (finished(q.steps, b.story)) {
    if (q.mode !== 'target' && missing.includes(keyOf(q, b.story))) return {type: 'move', action: {type: 'keep'}, text: q.mode === 'rows' ? 'Keep this row.' : 'Keep this story.'};
    return {type: 'move', action: {type: 'again'}, text: 'Start again.'};
  }
  const prefix = storyKey(b.story), goal = stories(q.steps).find(key => key.startsWith(prefix) && missing.includes(keyOf(q, storyOf(key))));
  if (!goal) return {type: 'move', action: {type: 'again'}, text: 'Start again.'};
  const ticket = Number(goal[b.story.length]), step = q.steps[b.story.length];
  return {type: 'move', action: {type: 'draw', ticket}, text: `Swap slot ${step.slot} with slot ${ticket}.`};
}

// Drawing. A story is a short row of ticket numbers; a row is the cups' order.
export const storyMini = key => `<span class="case-mini shuffle-story">${[...key].map(t => `<i>${t}</i>`).join('')}</span>`;
const sayStory = (start, steps, key) => `tickets ${[...key].join(', ')}: ${sayRow(runStory(start, steps, storyOf(key)))}`;
const storySaid = (start, steps) => ({mini: storyMini, say: key => sayStory(start, steps, key)});
const rowSaid = {mini: cupMini, say: sayRow};
// The cups. While a story is being drawn, the cup in this step's slot is
// lifted and the cups its tickets name can be tapped.
function cupsFor(steps, row, story, o = {}) {
  const step = !o.still && !finished(steps, story) ? steps[story.length] : null;
  const hinted = o.hint ? [...new Set([step.slot - 1, o.hint - 1])] : [];
  return cupsBoard(row, {slots: true, picked: step ? step.slot - 1 : null, enabled: step ? [...new Set([step.slot - 1, ...step.tickets.map(t => t - 1)])] : [], hinted, label: 'Cups in their slots'});
}
// One cup of tickets per step: drawn tickets stay pressed, later cups wait.
// In a design the tickets are switches: in the cup, or out of it.
function ticketsHTML(steps, story, o = {}) {
  return `<div class="shuffle-steps">${steps.map((step, k) => {
    const drawn = story[k], now = !o.design && k === story.length && !o.still;
    const tickets = (o.design ? range(1, o.cups) : step.tickets).map(t => {
      const inCup = step.tickets.includes(t), hinted = o.hint && o.hint.step === k && o.hint.ticket === t;
      if (o.design) return `<button type="button" class="shuffle-ticket${inCup ? ' in' : ' out'}${hinted ? ' hinted' : ''}" data-shuffle-move="${esc(JSON.stringify({type: 'toggle', step: k, ticket: t}))}" data-focus="ticket-${k}-${t}" aria-pressed="${inCup}" aria-label="Ticket ${t}"${o.still ? ' disabled' : ''}>${t}</button>`;
      const pressed = drawn === t;
      return `<button type="button" class="shuffle-ticket${pressed ? ' drawn' : ''}${now && o.hint === t ? ' hinted' : ''}" data-shuffle-move="${esc(JSON.stringify({type: 'draw', ticket: t}))}" data-focus="ticket-${k}-${t}" aria-pressed="${pressed}" aria-label="Ticket ${t}"${now ? '' : ' disabled'}>${t}</button>`;
    }).join('');
    return `<div class="shuffle-step${now ? ' now' : ''}${drawn ? ' done' : ''}${o.design ? ' design' : ''}" role="group" aria-labelledby="shuffle-step-${k}"><span class="shuffle-step-label" id="shuffle-step-${k}">Swap slot ${step.slot} with</span><div class="shuffle-cup">${tickets}</div></div>`;
  }).join('')}</div>`;
}
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-shuffle-move="${esc(JSON.stringify(action))}" data-focus="shuffle-${action.type}${action.rule ?? ''}${action.cups ?? ''}" ${extra}>${label}</button>`;
// Columns for every order of the cups, each labelled with that order.
const orderBins = n => rowsOf(n).map(row => ({id: row, label: cupMini(row)}));
const madeBy = (start, steps) => key => runStory(start, steps, storyOf(key));
function shelfFor(q, steps, b, o) {
  if (q.mode === 'rows') return shelfHTML(b.kept, {...rowSaid, ...o, load: false});
  if (q.mode === 'stories') return binsHTML(b.kept, orderBins(q.cups), madeBy(q.start, steps), {...storySaid(q.start, steps), ...o, always: true});
  return shelfHTML(b.kept, {...storySaid(q.start, steps), ...o});
}
// After a solve: every row, the ones the rule can make in green; or every
// story in columns by the order it makes, the target's column in green.
function catalogFor(q, steps) {
  if (q.mode === 'rows') {
    const made = targetKeys(q);
    return catalogHTML(rowsOf(q.cups), [...letters(q.cups)].map(c => ({id: c, label: `${cupMini(c)} first`})), row => row[0], {...rowSaid, label: 'Every row', mark: row => made.includes(row) ? 'yes' : 'no'});
  }
  if (q.mode === 'stories-for') return catalogHTML(stories(steps), orderBins(q.cups), madeBy(q.start, steps), {...storySaid(q.start, steps), label: 'Every story', mark: key => madeBy(q.start, steps)(key) === q.target ? 'yes' : 'no'});
  if (q.mode === 'design') return catalogHTML(stories(steps), orderBins(q.cups), madeBy(q.start, steps), {...storySaid(q.start, steps), label: 'Every story', mark: () => 'yes'});
  return '';
}
// A design that fails shows why: two stories that make one order, or an
// order no story makes.
function verdictHTML(q, steps) {
  const v = verdict(q.start, steps);
  if (v.kind === 'twice') return `<div class="shuffle-verdict" role="status"><p class="case-note">These make the same order.</p><p class="shuffle-pair">${v.stories.map(storyMini).join('')}<span aria-hidden="true">→</span>${cupMini(v.row)}</p><p class="sr-only">Tickets ${v.stories.map(k => [...k].join(', ')).join(' and tickets ')} both make ${sayRow(v.row)}.</p></div>`;
  if (v.kind === 'never') return `<div class="shuffle-verdict" role="status"><p class="case-note">No story makes this order.</p><p class="shuffle-pair">${cupMini(v.row)}</p><p class="sr-only">${sayRow(v.row)}.</p></div>`;
  return '';
}
const describe = (row, story) => `${sayRow(row)}${story.length ? `; tickets ${story.join(', ')}` : ''}`;

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b), steps = stepsOf(q, b), row = rowOf(q, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  if (q.mode === 'design') {
    // The cups are a picture of the slots; the tickets are the controls.
    const cups = cupsBoard(q.start, {slots: true, inert: true, label: 'Cups in their slots'});
    const tickets = ticketsHTML(steps, [], {design: true, cups: q.cups, still: solved, hint: h?.type === 'toggle' ? h : null});
    const actions = solved ? '' : `<div class="case-actions">${button('Try it', {type: 'try'}, h?.type === 'try' ? 'hinted' : '', b.tried ? 'disabled' : '')}</div>`;
    const result = solved ? catalogFor(q, steps) : b.tried ? verdictHTML(q, steps) : '';
    return `<div class="shuffle-puzzle" data-mechanic-wire="shuffles">${cups}${tickets}${actions}${result}</div>`;
  }
  const board = cupsFor(steps, row, b.story, {still: solved, hint: h?.type === 'draw' ? h.ticket : null});
  const again = button('Again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '', b.story.length ? '' : 'disabled');
  const every = q.mode !== 'target';
  const tickets = ticketsHTML(steps, b.story, {still: solved, hint: h?.type === 'draw' ? h.ticket : null});
  const actions = solved ? '' : `<div class="case-actions">${again}${every ? `${button('Keep', {type: 'keep'}, h?.type === 'keep' ? 'hinted' : '', canKeep(q, b) ? '' : 'disabled')}${button('That’s all', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.kept.length && !b.missed ? '' : 'disabled')}` : ''}</div>`;
  const missed = every && b.missed ? '<p class="case-note" role="status">There’s another.</p>' : '';
  const current = finished(steps, b.story) && !solved ? keyOf(q, b.story) : null;
  const shelf = every ? shelfFor(q, steps, b, {current, load: !solved, label: q.mode === 'rows' ? 'Rows kept' : 'Stories kept'}) : '';
  const cat = solved ? catalogFor(q, steps) : '';
  return `<div class="shuffle-puzzle" data-mechanic-wire="shuffles">${board}${tickets}${actions}${missed}${shelf}${cat}<p class="sr-only" role="status">${esc(describe(row, b.story) + '.')}</p></div>`;
}

// The playground: three or four cups and three rules, any story kept, the
// shelf sorted by the order each story makes.
export const PLAY_RULES = {
  later: n => range(1, n - 1).map(k => ({slot: k, tickets: range(k, n)})),
  any: n => range(1, n).map(k => ({slot: k, tickets: range(1, n)})),
  never: n => range(1, n - 1).map(k => ({slot: k, tickets: range(k + 1, n)}))
};
const RULE_NAMES = {later: 'Itself or later', any: 'Any slot', never: 'Never itself'};
export const PLAY_CUPS = [3, 4];
const playSteps = b => PLAY_RULES[b.rule](b.cups);
function freshPlay(cups = 3, rule = 'later') {
  return {cups, rule, story: [], kept: []};
}
function validPlay(b) {
  if (!object(b) || !PLAY_CUPS.includes(b.cups) || !Object.hasOwn(PLAY_RULES, b.rule)) return false;
  const steps = playSteps(b), all = stories(steps);
  return legalStory(steps, b.story) && Array.isArray(b.kept) && b.kept.length <= all.length && new Set(b.kept).size === b.kept.length && b.kept.every(key => all.includes(key));
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  const steps = playSteps(b);
  switch (action.type) {
    case 'cups': return PLAY_CUPS.includes(action.cups) && action.cups !== b.cups ? freshPlay(action.cups, b.rule) : null;
    case 'rule': return Object.hasOwn(PLAY_RULES, action.rule) && action.rule !== b.rule ? freshPlay(b.cups, action.rule) : null;
    case 'draw': { const story = draw(steps, b.story, action.ticket); return story ? {...b, story} : null; }
    case 'again': return b.story.length ? {...b, story: []} : null;
    case 'random': {
      if (finished(steps, b.story)) return null;
      const rest = steps.slice(b.story.length).map(s => s.tickets[Math.floor(random() * s.tickets.length) % s.tickets.length]);
      return {...b, story: [...b.story, ...rest]};
    }
    case 'keep': {
      if (!finished(steps, b.story)) return null;
      const kept = keepCase(b.kept, storyKey(b.story), key => stories(steps).includes(key), stories(steps).length);
      return kept ? {...b, kept} : null;
    }
    case 'load': return b.kept.includes(action.key) && action.key !== storyKey(b.story) ? {...b, story: storyOf(action.key)} : null;
    case 'clear': return b.kept.length ? {...b, kept: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, steps = playSteps(b), start = letters(b.cups), row = runStory(start, steps, b.story), done = finished(steps, b.story);
  const pick = (name, items) => `<div class="case-tools" role="group" aria-label="${name}">${items.join('')}</div>`;
  const cups = pick('Cups', PLAY_CUPS.map(n => button(String(n), {type: 'cups', cups: n}, 'case-tool', `aria-pressed="${b.cups === n}" aria-label="${n} cups"`)));
  const rules = pick('Rule', Object.keys(PLAY_RULES).map(r => button(RULE_NAMES[r], {type: 'rule', rule: r}, 'case-tool', `aria-pressed="${b.rule === r}"`)));
  const actions = `<div class="case-actions">${button('Again', {type: 'again'}, '', b.story.length ? '' : 'disabled')}${button('Draw', {type: 'random'}, '', done ? 'disabled' : '')}${button('Keep', {type: 'keep'}, '', done && !b.kept.includes(storyKey(b.story)) ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.kept.length ? '' : 'disabled')}</div>`;
  const shelf = binsHTML(b.kept, orderBins(b.cups), madeBy(start, steps), {...storySaid(start, steps), current: done ? storyKey(b.story) : null, load: true, label: 'Stories kept', always: true});
  return `<div class="shuffle-play" data-mechanic-wire="shuffles">${cups}${rules}${cupsFor(steps, row, b.story)}${ticketsHTML(steps, b.story)}${actions}${shelf}<p class="sr-only" role="status">${esc(describe(row, b.story) + '.')}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
const currentSteps = (p, b) => isPlay(p) ? playSteps(b) : stepsOf(p.parameters, b);
let pending = null;
function wire(root, p, api) {
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; api.apply(action); };
  // Tapping a cup draws the ticket for its slot: the lifted cup is this
  // step's slot, so tapping it again draws its own ticket. A drag between the
  // lifted cup and another does the same.
  const step = () => {
    const b = api.attempt().board, steps = currentSteps(p, b);
    return finished(steps, b.story) ? null : steps[b.story.length];
  };
  const slot = () => step() ? step().slot - 1 : null;
  // The lifted cup stays usable for drags even when its own slot isn't a
  // ticket (Never itself); a tap on it then does nothing.
  if (p.parameters.mode !== 'design') wireCups(root, {
    picked: slot,
    pick: h => { const s = step(); if (h === null && s?.tickets.includes(s.slot)) apply({type: 'draw', ticket: s.slot}); },
    swap: (i, j) => { const s = slot(); if (s === i || s === j) apply({type: 'draw', ticket: (s === i ? j : i) + 1}); }
  });
  wireCases(root, key => { if (key !== storyKey(api.attempt().board.story)) apply({type: 'load', key}); });
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-shuffle-move]');
    if (!el || !root.contains(el) || el.disabled) return;
    let action;
    try { action = JSON.parse(el.dataset.shuffleMove); } catch { return; /* malformed control data is ignored */ }
    if (action.type !== 'toggle' && el.getAttribute('aria-pressed') === 'true') return;
    apply(action);
  });
  // The two cups a ticket swaps settle into place (one cup bobs on a ticket
  // for its own slot); a story just kept arrives on the shelf.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board;
  if (last.action.type === 'draw') {
    const step = currentSteps(p, b)[b.story.length - 1];
    for (const i of new Set([step.slot - 1, last.action.ticket - 1])) root.querySelector(`[data-cup="${i}"]`)?.classList.add('arrived');
  }
  if (last.action.type === 'keep') root.querySelector(`[data-key="${CSS.escape(isPlay(p) ? storyKey(b.story) : keyOf(p.parameters, b.story))}"]`)?.classList.add('fresh');
}

export const shuffleMechanics = {
  shuffles: {
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
  id: 'shuffles',
  family: {id: 'shuffles', symbol: '⇆'},
  mechanics: shuffleMechanics,
  pack: new URL('./shuffles.json', import.meta.url).href,
  css: new URL('./shuffles.css', import.meta.url).href,
  focus: '.shuffle-ticket:not([disabled]),.case-actions .case-action:not([disabled])'
};
