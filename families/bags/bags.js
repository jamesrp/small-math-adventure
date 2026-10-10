// Fair bags (worksheet Week 42). A bag holds numbered red and blue counters;
// two are drawn in order, each counter as likely as any other, and put back.
// A rule turns each colour pair (red-red, red-blue, blue-red, blue-blue) into
// a square, a circle or a skip, and it is fair when squares and circles come
// equally often and both can come. Marked pairs such as "red 2, then blue 1"
// are equally likely; colour pairs are not. With r red and b blue the colour
// pairs come r², rb, br and b² ways, so red-blue and blue-red always tie:
// "square for red-blue, circle for blue-red, skip the rest" is fair for every
// bag with both colours (von Neumann's trick), at the cost of skipping r² + b²
// of the (r + b)² pairs. Other fair rules exist only when other sums tie, as
// r² = 2rb when r = 2b. The rules a child sets move whole colour classes; the
// marked pairs sort into square, circle and skip bins as they change. The
// shelf, bins and counters come from the shared case engine (dist/cases.js).
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, binsHTML, counterIds, counterMini, sayCounter, counterBagHTML, drawRowHTML, wireCounters, COUNTER_COLOURS} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Colour pairs, in the order the rule lists them, and the three results.
export const CLASSES = ['RR', 'RB', 'BR', 'BB'];
export const SHAPES = ['S', 'C', 'X'];
const SHAPE_NAME = {S: 'square', C: 'circle', X: 'skip'};
const COLOUR = COUNTER_COLOURS;
const className = cls => `${COLOUR[cls[0]]}, then ${COLOUR[cls[1]]}`;
const colours = /^[RB]+$/;
const legalRule = rule => typeof rule === 'string' && /^[SCX]{4}$/.test(rule);

// A pair is two counter ids in drawing order, written together: 'R2B1'.
export const pairOf = key => key.match(/[RB]\d+/g);
export const classOf = key => pairOf(key).map(id => id[0]).join('');
// Every marked pair: the first draw from the first bag, the second from the
// second bag (the same bag unless the puzzle names another), never the same
// counter twice when draws are not put back.
const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); };
export const pairs = (first, second = first, distinct = false) => remember(`${first}|${second}|${distinct}`, () => {
  const a = counterIds(first), b = counterIds(second);
  return a.flatMap(x => b.filter(y => !(distinct && x === y)).map(y => x + y));
});
const pairsOf = q => pairs(q.first, q.second || q.first, Boolean(q.distinct));
// How a rule sorts the pairs: the shape each pair gets.
export const shapeOf = (rule, key) => rule[CLASSES.indexOf(classOf(key))];
export function tally(keys, rule) {
  const out = {S: 0, C: 0, X: 0};
  for (const key of keys) out[shapeOf(rule, key)]++;
  return out;
}
export const isFair = t => t.S === t.C && t.S > 0;
// Every rule, as four letters for RR, RB, BR, BB.
export const RULES = SHAPES.flatMap(a => SHAPES.flatMap(b => SHAPES.flatMap(c => SHAPES.map(d => a + b + c + d))));
// The fewest skips any fair rule needs for these pairs.
export const fewestSkips = keys => remember(`f:${keys.join()}`, () => Math.min(...RULES.map(r => tally(keys, r)).filter(isFair).map(t => t.X)));
// What a rule puzzle asks: fair, fair with no skips, or fair with the fewest.
function ruleSolves(q, rule) {
  const t = tally(pairsOf(q), rule);
  if (!isFair(t)) return false;
  return q.goal === 'fair' || t.X === (q.goal === 'noskip' ? 0 : fewestSkips(pairsOf(q)));
}
// The busiest bag: of every bag of `size` counters, the most shapes the rule gives.
const bagsOf = size => remember(`bags:${size}`, () => Array.from({length: 2 ** size}, (_, m) => [...Array(size)].map((_, i) => m >> i & 1 ? 'B' : 'R').join('')));
const shapesIn = (colours, rule) => { const t = tally(pairs(colours), rule); return t.S + t.C; };
export const mostShapes = (size, rule) => Math.max(...bagsOf(size).map(c => shapesIn(c, rule)));

// Boards.
//   pairs:    {draw, kept, claimed, missed}: draw two counters, keep every pair
//   rule:     {rule} (and {claimed, missed} when the goal is the fewest skips)
//   busiest:  {colours, claimed, missed}: flip counters' colours under a set rule
const claims = q => q.mode === 'busiest' || (q.mode === 'rule' && q.goal === 'fewest');
function freshPuzzle(p) {
  const q = p.parameters;
  if (q.mode === 'pairs') return {draw: [], kept: [], claimed: false, missed: false};
  if (q.mode === 'busiest') return {colours: q.start, claimed: false, missed: false};
  // A rule puzzle starts from q.start (every pair skipped unless the puzzle says).
  const rule = q.start || 'XXXX';
  return claims(q) ? {rule, claimed: false, missed: false} : {rule};
}
const legalDraw = (ids, draw) => Array.isArray(draw) && draw.length <= 2 && draw.every(id => ids.includes(id));
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'pairs') return legalDraw(counterIds(q.first), b.draw) && validShelf({kept: b.kept, claimed: b.claimed, missed: b.missed}, pairsOf(q), pairsOf(q).length) && Object.keys(b).length === 4;
  const flags = typeof b.claimed === 'boolean' && typeof b.missed === 'boolean' && !(b.claimed && b.missed);
  if (q.mode === 'busiest') return typeof b.colours === 'string' && b.colours.length === q.size && colours.test(b.colours) && flags && Object.keys(b).length === 3
    && (!b.claimed || shapesIn(b.colours, q.rule) === mostShapes(q.size, q.rule)) && (!b.missed || shapesIn(b.colours, q.rule) < mostShapes(q.size, q.rule));
  if (!legalRule(b.rule)) return false;
  if (!claims(q)) return Object.keys(b).length === 1;
  return flags && Object.keys(b).length === 3 && (!b.claimed || ruleSolves(q, b.rule)) && (!b.missed || (isFair(tally(pairsOf(q), b.rule)) && !ruleSolves(q, b.rule)));
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'rule' && !claims(q)) return ruleSolves(q, b.rule);
  return b.claimed;
}
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  if (q.mode === 'pairs') {
    const ids = counterIds(q.first), key = b.draw.join('');
    switch (action.type) {
      case 'draw': return b.draw.length < 2 && ids.includes(action.id) ? {...b, draw: [...b.draw, action.id]} : null;
      case 'again': return b.draw.length ? {...b, draw: []} : null;
      case 'keep': {
        if (b.draw.length < 2) return null;
        // A kept pair moves to the shelf, leaving the draw empty.
        const kept = keepCase(b.kept, key, k => pairsOf(q).includes(k), pairsOf(q).length);
        return kept ? {...b, draw: [], kept, missed: false} : null;
      }
      case 'claim': return b.kept.length && !b.missed ? {...b, ...claimCases(pairsOf(q), b.kept)} : null;
    }
    return null;
  }
  if (q.mode === 'busiest') {
    if (action.type === 'flip') {
      const i = action.at;
      if (!Number.isInteger(i) || i < 0 || i >= q.size) return null;
      return {colours: b.colours.slice(0, i) + (b.colours[i] === 'R' ? 'B' : 'R') + b.colours.slice(i + 1), claimed: false, missed: false};
    }
    if (action.type !== 'claim' || b.missed) return null;
    return shapesIn(b.colours, q.rule) === mostShapes(q.size, q.rule) ? {...b, claimed: true} : {...b, missed: true};
  }
  if (action.type === 'set') {
    const i = CLASSES.indexOf(action.cls);
    if (i < 0 || !SHAPES.includes(action.shape) || b.rule[i] === action.shape) return null;
    const rule = b.rule.slice(0, i) + action.shape + b.rule.slice(i + 1);
    return claims(q) ? {rule, claimed: false, missed: false} : {rule};
  }
  // That's fewest: a fair rule that could skip less is refused once.
  if (action.type === 'claim' && claims(q) && !b.missed && isFair(tally(pairsOf(q), b.rule))) return ruleSolves(q, b.rule) ? {...b, claimed: true} : {...b, missed: true};
  return null;
}

// Hints. Find-every: draw the first missing pair, keep it, That's all. A rule:
// set one colour pair toward the nearest rule that solves. The busiest bag:
// flip one counter toward the nearest busiest bag.
const gap = (x, y) => [...x].filter((c, i) => c !== y[i]).length;
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const nearest = (from, goals) => [...goals].sort((x, y) => gap(from, x) - gap(from, y) || (x < y ? -1 : 1))[0];
function hintPuzzle(p, b) {
  const q = p.parameters;
  if (solvedPuzzle(p, b)) return {type: 'done'};
  if (q.mode === 'pairs') {
    const missing = missingCases(pairsOf(q), b.kept);
    if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    const key = b.draw.join('');
    if (b.draw.length === 2) return missing.includes(key) ? {type: 'move', action: {type: 'keep'}, text: 'Keep this pair.'} : {type: 'move', action: {type: 'again'}, text: 'Start again.'};
    const goal = missing.find(k => k.startsWith(key));
    if (!goal) return {type: 'move', action: {type: 'again'}, text: 'Start again.'};
    const id = pairOf(goal)[b.draw.length];
    return {type: 'move', action: {type: 'draw', id}, text: `Draw ${sayCounter(id)}.`};
  }
  if (q.mode === 'busiest') {
    const best = bagsOf(q.size).filter(c => shapesIn(c, q.rule) === mostShapes(q.size, q.rule)), goal = nearest(b.colours, best);
    if (goal === b.colours) return {type: 'move', action: {type: 'claim'}, text: 'Press Done.'};
    const i = [...goal].findIndex((c, k) => c !== b.colours[k]);
    return {type: 'move', action: {type: 'flip', at: i}, text: `Make the ${ORDINAL[i]} counter ${COLOUR[goal[i]]}.`};
  }
  const goal = nearest(b.rule, RULES.filter(r => ruleSolves(q, r)));
  if (goal === b.rule) return {type: 'move', action: {type: 'claim'}, text: 'Press Done.'};
  const i = [...goal].findIndex((c, k) => c !== b.rule[k]), shape = goal[i];
  return {type: 'move', action: {type: 'set', cls: CLASSES[i], shape}, text: shape === 'X' ? `Skip ${className(CLASSES[i])}.` : `Give ${className(CLASSES[i])} the ${SHAPE_NAME[shape]}.`};
}

// Drawing. A bag whose colours change (the busiest bag and the playground)
// numbers its counters by place, so a flip changes a colour and no number.
export const pairMini = (key, place) => `<span class="case-mini bag-pair">${pairOf(key).map(id => counterMini(id, place?.[id])).join('')}</span>`;
const sayPair = (key, place) => pairOf(key).map(id => place ? `${COLOUR[id[0]]} ${place[id]}` : sayCounter(id)).join(', then ');
const placesOf = colours => Object.fromEntries(counterIds(colours).map((id, i) => [id, i + 1]));
const placeName = (id, i) => `${ORDINAL[i]} counter, ${COLOUR[id[0]]}`;
const SHAPE_SVG = {
  S: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1.5"/></svg>',
  C: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/></svg>',
  X: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>'
};
const shapeIcon = s => `<span class="bag-shape bag-shape-${s}">${SHAPE_SVG[s]}</span>`;
const classMini = cls => `<span class="bag-class">${[...cls].map(c => `<i class="case-counter c${c}" aria-hidden="true"></i>`).join('')}</span>`;
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-bag-move="${esc(JSON.stringify(action))}" data-focus="bag-${action.type}${action.n ?? ''}" ${extra}>${label}</button>`;
// The bag: counters in a row. As buttons they draw (or flip); as pictures they show.
const bagHTML = (colours, o = {}) => counterBagHTML(counterIds(colours), o);
// The rule: one row per colour pair, with a button for each result.
function ruleHTML(rule, o = {}) {
  return `<div class="bag-rule" role="group" aria-label="Rule">${CLASSES.map((cls, i) => `<div class="bag-rule-row" role="group" aria-label="${className(cls)}">${classMini(cls)}<span class="case-arrow" aria-hidden="true">→</span>${SHAPES.map(s => {
    const on = rule[i] === s, hinted = o.hint?.cls === cls && o.hint?.shape === s;
    return `<button type="button" class="bag-choice${on ? ' on' : ''}${hinted ? ' hinted' : ''}" aria-pressed="${on}" aria-label="${SHAPE_NAME[s]}" data-bag-move="${esc(JSON.stringify({type: 'set', cls, shape: s}))}" data-focus="set-${cls}-${s}"${o.still || o.locked ? ' disabled' : ''}>${shapeIcon(s)}</button>`;
  }).join('')}</div>`).join('')}</div>`;
}
// The pairs sorted by the rule into square, circle and skip.
const SHAPE_BINS = SHAPES.map(s => ({id: s, label: `${shapeIcon(s)}<span class="sr-only">${SHAPE_NAME[s]}</span>`}));
const sortedHTML = (keys, rule, place, label = 'Pairs by shape') => binsHTML(keys, SHAPE_BINS, key => shapeOf(rule, key), {mini: key => pairMini(key, place), say: key => sayPair(key, place), always: true, label});
// What the piles hold, for screen readers: the evidence on screen, not an answer count.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const pilesSaid = t => `<p class="sr-only" role="status">${plural(t.S, 'square')}, ${plural(t.C, 'circle')}, ${plural(t.X, 'skip')}.</p>`;

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  if (q.mode === 'pairs') {
    const key = b.draw.join(''), full = b.draw.length === 2;
    const bag = bagHTML(q.first, {button: true, still: solved || full, hinted: h?.type === 'draw' ? h.id : null});
    const drawn = drawRowHTML(b.draw, 2);
    const can = full && pairsOf(q).includes(key) && !b.kept.includes(key);
    const actions = solved ? '' : `<div class="case-actions">${button('Again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '', b.draw.length ? '' : 'disabled')}${button('Keep', {type: 'keep'}, h?.type === 'keep' ? 'hinted' : '', can ? '' : 'disabled')}${button('That’s all', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
    const missed = b.missed ? '<p class="case-note" role="status">There’s another.</p>' : '';
    const ids = counterIds(q.first);
    const shelf = binsHTML(b.kept, ids.map(id => ({id, label: `<span aria-hidden="true">${counterMini(id)}</span><span class="sr-only">${sayCounter(id)} first</span>`})), k => pairOf(k)[0], {mini: pairMini, say: sayPair, always: true, current: full && !solved ? key : null, label: 'Pairs kept'});
    return `<div class="bag-puzzle" data-mechanic-wire="bags">${bag}${drawn}${actions}${missed}${shelf}<p class="sr-only" role="status">${esc(b.draw.length ? `Drawn: ${b.draw.map(sayCounter).join(', then ')}.` : 'Nothing drawn.')}</p></div>`;
  }
  if (q.mode === 'busiest') {
    const bag = bagHTML(b.colours, {button: true, still: solved, hinted: h?.type === 'flip' ? h.at : null, number: (id, i) => i + 1, name: placeName});
    const actions = solved ? '' : `<div class="case-actions">${button('Done', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '')}</div>`;
    const missed = b.missed ? '<p class="case-note" role="status">The skip pile can be smaller.</p>' : '';
    return `<div class="bag-puzzle" data-mechanic-wire="bags">${bag}${ruleHTML(q.rule, {locked: true})}${actions}${missed}${sortedHTML(pairs(b.colours), q.rule, placesOf(b.colours))}${pilesSaid(tally(pairs(b.colours), q.rule))}</div>`;
  }
  const bags = q.second ? `<div class="bag-pair-of-bags">${bagHTML(q.first, {tag: '1st', label: '1st bag'})}${bagHTML(q.second, {tag: '2nd', label: '2nd bag'})}</div>` : bagHTML(q.first);
  const rule = ruleHTML(b.rule, {still: solved, hint: h?.type === 'set' ? h : null});
  const fair = isFair(tally(pairsOf(q), b.rule));
  const actions = claims(q) && !solved ? `<div class="case-actions">${button('Done', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', fair && !b.missed ? '' : 'disabled')}</div>` : '';
  const missed = b.missed ? '<p class="case-note" role="status">You can skip fewer.</p>' : '';
  return `<div class="bag-puzzle" data-mechanic-wire="bags">${bags}${rule}${actions}${missed}${sortedHTML(pairsOf(q), b.rule)}${pilesSaid(tally(pairsOf(q), b.rule))}</div>`;
}

// The playground: a bag of two to six counters, any rule, and random pairs
// that pile into the bins.
export const PLAY_SIZES = [2, 6];
export const PLAY_DRAWS = 60;
function freshPlay() { return {colours: 'RRRB', rule: 'XSCX', draws: []}; }
function validPlay(b) {
  if (!object(b) || typeof b.colours !== 'string' || !colours.test(b.colours) || b.colours.length < PLAY_SIZES[0] || b.colours.length > PLAY_SIZES[1] || !legalRule(b.rule) || !Array.isArray(b.draws) || b.draws.length > PLAY_DRAWS) return false;
  const all = pairs(b.colours);
  return b.draws.every(k => all.includes(k)) && Object.keys(b).length === 3;
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  const n = b.colours.length;
  switch (action.type) {
    case 'flip': return Number.isInteger(action.at) && action.at >= 0 && action.at < n ? {...b, colours: b.colours.slice(0, action.at) + (b.colours[action.at] === 'R' ? 'B' : 'R') + b.colours.slice(action.at + 1), draws: []} : null;
    case 'add': return n < PLAY_SIZES[1] ? {...b, colours: b.colours + 'B', draws: []} : null;
    case 'remove': return n > PLAY_SIZES[0] ? {...b, colours: b.colours.slice(0, -1), draws: []} : null;
    case 'set': {
      const i = CLASSES.indexOf(action.cls);
      return i >= 0 && SHAPES.includes(action.shape) && b.rule[i] !== action.shape ? {...b, rule: b.rule.slice(0, i) + action.shape + b.rule.slice(i + 1)} : null;
    }
    case 'random': {
      if (action.n !== undefined && action.n !== 10) return null;
      const count = action.n === 10 ? 10 : 1, ids = counterIds(b.colours);
      if (b.draws.length + count > PLAY_DRAWS) return null;
      const pick = () => ids[Math.floor(random() * ids.length) % ids.length];
      return {...b, draws: [...b.draws, ...Array.from({length: count}, () => pick() + pick())]};
    }
    case 'clear': return b.draws.length ? {...b, draws: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, n = b.colours.length;
  const bag = bagHTML(b.colours, {button: true, number: (id, i) => i + 1, name: placeName});
  const size = `<div class="case-tools" role="group" aria-label="Counters">${button('−', {type: 'remove'}, 'case-tool', `aria-label="One counter fewer"${n > PLAY_SIZES[0] ? '' : ' disabled'}`)}${button('+', {type: 'add'}, 'case-tool', `aria-label="One counter more"${n < PLAY_SIZES[1] ? '' : ' disabled'}`)}</div>`;
  const room = PLAY_DRAWS - b.draws.length;
  const actions = `<div class="case-actions">${button('Draw', {type: 'random'}, '', room >= 1 ? '' : 'disabled')}${button('Draw 10', {type: 'random', n: 10}, '', room >= 10 ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.draws.length ? '' : 'disabled')}</div>`;
  const shelf = sortedHTML(b.draws, b.rule, placesOf(b.colours), 'Pairs drawn');
  return `<div class="bag-play" data-mechanic-wire="bags">${size}${bag}${ruleHTML(b.rule)}${actions}${shelf}${pilesSaid(tally(b.draws, b.rule))}</div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
let pending = null;
function wire(root, p, api) {
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; api.apply(action); };
  // A counter draws in a find-every puzzle and changes colour elsewhere.
  wireCounters(root, (id, at) => apply(p.parameters.mode === 'pairs' ? {type: 'draw', id} : {type: 'flip', at}));
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-bag-move]');
    if (!el || !root.contains(el) || el.disabled || el.getAttribute('aria-pressed') === 'true') return;
    try { apply(JSON.parse(el.dataset.bagMove)); } catch { /* malformed control data is ignored */ }
  });
  // A pair just kept arrives on the shelf.
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board;
  if (last.action.type === 'keep') root.querySelector(`[data-key="${CSS.escape(b.kept.at(-1))}"]`)?.classList.add('fresh');
  // Keyboard: when a move greys out the focused control the app falls back to
  // the first control on the board. A finished draw goes to Keep (or Again),
  // and the playground's buttons never hand focus to a counter, whose tap
  // would clear the piles.
  if (!root.contains(document.activeElement)) return;
  const focus = (...selectors) => { const el = selectors.flatMap(s => [...root.querySelectorAll(s)]).find(x => !x.disabled); el?.focus({preventScroll: true}); };
  if (last.action.type === 'draw' && b.draw?.length === 2) focus('[data-focus="bag-keep"]', '[data-focus="bag-again"]');
  else if (isPlay(p) && ['random', 'clear'].includes(last.action.type) && document.activeElement.matches('.case-counter')) focus('.case-actions .case-action');
}

export const bagMechanics = {
  bags: {
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
  id: 'bags',
  family: {id: 'bags', symbol: '◒'},
  mechanics: bagMechanics,
  pack: new URL('./bags.json', import.meta.url).href,
  css: new URL('./bags.css', import.meta.url).href,
  focus: '.case-bag-counters button.case-counter:not([disabled]),.bag-choice:not([disabled]),.case-actions .case-action:not([disabled])'
};
