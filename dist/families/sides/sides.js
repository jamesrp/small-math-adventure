// Hidden sides (worksheet Week 45). Three cards: red on both sides, red and
// blue, blue on both. Their six sides are numbered 1 to 6 (1 and 2 the red
// card's, 3 red and 4 blue on the mixed card, 5 and 6 the blue card's), and a
// number drawn from a cup picks the side that shows. Each number in the cup is
// as likely as any other, so given a red side showing, the numbers left are
// the red sides in the cup, and the colour underneath is red as often as
// those sides' other sides are red. With every number in the cup, two of the
// three red sides hide red: 2/3, not the 1/2 of counting cards (Bertrand's
// box). The answer depends on how the clue was made: a cup of 1 and 3 gives
// the same red clue with 1/2. A red clue ties exactly when the cup holds 3 and
// exactly one of 1 and 2 (any of 4–6 besides): 16 cups of 64. Whole cards
// never tie (a red card brings two red-under sides, the mixed card one), but
// copies can: one red card with two mixed cards. The shelf, bins and catalogs
// come from the shared case engine (dist/cases.js). Following the review card,
// the cards' sides are the controls: a tap draws a side, turns a covered side
// over, or puts a side in or out of the cup; the child sorts each red side by
// the colour underneath.
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, binsHTML, catalogHTML} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const TICKETS = [1, 2, 3, 4, 5, 6];
export const FACE = {1: 'R', 2: 'R', 3: 'R', 4: 'B', 5: 'B', 6: 'B'};
export const other = t => t % 2 ? t + 1 : t - 1;
const COLOUR = {R: 'red', B: 'blue'};
// The three cards, as their two sides.
export const CARDS = [{id: 'RR', faces: [1, 2]}, {id: 'RB', faces: [3, 4]}, {id: 'BB', faces: [5, 6]}];
const CARD_NAME = ['red card', 'red and blue card', 'blue card'];
const isCup = cup => Array.isArray(cup) && cup.length <= 6 && cup.every((t, i) => TICKETS.includes(t) && (i === 0 || t > cup[i - 1]));
export const cupKey = cup => cup.join('');
// The sides in a cup showing the clue, split by the colour underneath.
export function split(cup, clue = 'R') {
  const up = cup.filter(t => FACE[t] === clue);
  return {up, R: up.filter(t => FACE[other(t)] === 'R'), B: up.filter(t => FACE[other(t)] === 'B')};
}
// What a design asks: the clue hides red and blue equally ('tie'), always blue
// ('blue') or always red ('red'); the clue must be able to show.
export function meets(goal, cup, clue = 'R') {
  const s = split(cup, clue);
  if (!s.up.length) return false;
  return goal === 'tie' ? s.R.length === s.B.length : goal === 'blue' ? !s.R.length : !s.B.length;
}
// Every cup, as sorted lists of numbers.
export const ALL_CUPS = Array.from({length: 64}, (_, m) => TICKETS.filter(t => m >> (t - 1) & 1));
// Whole cards: counts of the red, mixed and blue cards, up to q.max of each.
// Red sides showing, split by the colour underneath, are 2 per red card and
// 1 per mixed card.
export const CARD_MAX = 3;
export const cardSplit = counts => ({R: 2 * counts[0], B: counts[1]});
export function cardsMeet(goal, counts) {
  const s = cardSplit(counts);
  if (!s.R && !s.B) return false;
  return goal === 'tie' ? s.R === s.B : s.R === 3 * s.B;
}
export const tablesUpTo = max => Array.from({length: (max + 1) ** 3}, (_, m) => [m % (max + 1), Math.floor(m / (max + 1)) % (max + 1), Math.floor(m / (max + 1) ** 2)]);
export const ALL_COUNTS = tablesUpTo(CARD_MAX);
const maxOf = q => q.max ?? CARD_MAX;
// Whether some table within the puzzle's limit works; if not, Can't is right.
export const cardsPossible = q => tablesUpTo(maxOf(q)).some(c => cardsMeet(q.goal, c));

// Boards.
//   draw:    {shown, looked, kept, claimed, missed}: draw sides from q.cup; turn
//            the drawn side's card over (looked) and sort every side showing
//            q.clue by the colour underneath
//   design:  {cup, tried}: choose the cup so q.goal holds, checked by Try it
//   designs: {cup, kept, claimed, missed, wrong}: keep every cup that makes a red clue a tie;
//            Keep checks the cup, so nothing shows whether it ties before then
//   cards:   {counts, tried, cant}: whole cards so q.goal holds, checked by Try
//            it, or Can't when no table within the limit works
const targetsOf = q => q.mode === 'draw' ? q.cup.filter(t => FACE[t] === q.clue).map(String) : ALL_CUPS.filter(c => meets('tie', c)).map(cupKey);
function freshPuzzle(p) {
  const q = p.parameters;
  if (q.mode === 'draw') return {shown: null, looked: false, kept: [], claimed: false, missed: false};
  if (q.mode === 'design') return {cup: [...q.start], tried: false};
  if (q.mode === 'designs') return {cup: [...TICKETS], kept: [], claimed: false, missed: false, wrong: false};
  return {counts: [...(q.start || [1, 1, 1])], tried: false, cant: false};
}
const shelf = b => ({kept: b.kept, claimed: b.claimed, missed: b.missed});
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'draw') return (b.shown === null || q.cup.includes(b.shown)) && typeof b.looked === 'boolean' && !(b.looked && b.shown === null) && validShelf(shelf(b), targetsOf(q)) && Object.keys(b).length === 5;
  if (q.mode === 'design') return isCup(b.cup) && b.cup.length > 0 && typeof b.tried === 'boolean' && Object.keys(b).length === 2;
  if (q.mode === 'designs') return isCup(b.cup) && b.cup.length > 0 && validShelf(shelf(b), targetsOf(q)) && typeof b.wrong === 'boolean' && !(b.wrong && (meets('tie', b.cup) || b.claimed)) && Object.keys(b).length === 5;
  return Array.isArray(b.counts) && b.counts.length === 3 && b.counts.every(n => Number.isInteger(n) && n >= 0 && n <= maxOf(q)) && typeof b.tried === 'boolean' && typeof b.cant === 'boolean' && Object.keys(b).length === 3;
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'design') return b.tried && meets(q.goal, b.cup);
  if (q.mode === 'cards') return (b.tried && cardsMeet(q.goal, b.counts)) || (b.cant && !cardsPossible(q));
  return b.claimed;
}
const toggled = (cup, t) => cup.includes(t) ? cup.filter(x => x !== t) : [...cup, t].sort((x, y) => x - y);
// Whether the side showing can go on the shelf: the puzzle's colour, its card
// turned over, and not kept yet.
const sortable = (q, b) => b.shown !== null && b.looked && FACE[b.shown] === q.clue && !b.kept.includes(String(b.shown));
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  if (q.mode === 'draw') {
    switch (action.type) {
      case 'draw': return q.cup.includes(action.ticket) && action.ticket !== b.shown ? {...b, shown: action.ticket, looked: false} : null;
      case 'look': return b.shown !== null && !b.looked ? {...b, looked: true} : null;
      case 'keep': {
        // The child sorts: the bin must be the colour underneath.
        if (!sortable(q, b) || action.bin !== FACE[other(b.shown)]) return null;
        const kept = keepCase(b.kept, String(b.shown), key => targetsOf(q).includes(key));
        return kept ? {...b, shown: null, looked: false, kept, missed: false} : null;
      }
      case 'claim': return b.kept.length && !b.missed ? {...b, ...claimCases(targetsOf(q), b.kept)} : null;
    }
    return null;
  }
  if (q.mode === 'cards') {
    switch (action.type) {
      case 'count': {
        const i = action.card, n = b.counts[i] + action.by;
        if (!Number.isInteger(i) || i < 0 || i > 2 || ![1, -1].includes(action.by) || n < 0 || n > maxOf(q)) return null;
        return {counts: b.counts.map((x, k) => k === i ? n : x), tried: false, cant: false};
      }
      case 'try': return !b.tried ? {...b, tried: true} : null;
      // Can't is checked: right when no table works, otherwise refused until the table changes.
      case 'cant': return !b.cant ? {...b, cant: true} : null;
    }
    return null;
  }
  if (action.type === 'toggle') {
    if (!TICKETS.includes(action.ticket)) return null;
    const cup = toggled(b.cup, action.ticket);
    if (!cup.length) return null;
    // A new cup clears a refusal; "There's another." stays until something new is kept.
    return q.mode === 'design' ? {cup, tried: false} : {...b, cup, wrong: false};
  }
  if (q.mode === 'design') return action.type === 'try' && !b.tried ? {...b, tried: true} : null;
  if (action.type === 'keep') {
    // Keep checks the cup: one that doesn't tie is refused, showing its red sides sorted.
    if (b.wrong || b.kept.includes(cupKey(b.cup))) return null;
    if (!meets('tie', b.cup)) return {...b, wrong: true};
    return {...b, kept: keepCase(b.kept, cupKey(b.cup), key => targetsOf(q).includes(key)), missed: false};
  }
  if (action.type === 'claim') return b.kept.length && !b.missed ? {...b, ...claimCases(targetsOf(q), b.kept), wrong: false} : null;
  return null;
}

// Hints. Draw: the first missing side, turn its card over, sort it, That's
// all. A design: one side toward the nearest cup that works, then Try it.
// Whole cards: one step toward the nearest table that works, then Try it; or
// Try it and Can't when none does.
const gap = (a, b) => TICKETS.filter(t => a.includes(t) !== b.includes(t)).length;
const nearestCup = (from, cups) => [...cups].sort((x, y) => gap(from, x) - gap(from, y) || (cupKey(x) < cupKey(y) ? -1 : 1))[0];
const say = t => `side ${t}`;
function hintPuzzle(p, b) {
  const q = p.parameters;
  if (solvedPuzzle(p, b)) return {type: 'done'};
  if (q.mode === 'draw') {
    const missing = missingCases(targetsOf(q), b.kept);
    if (!missing.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    const m = Number(missing[0]);
    if (b.shown === m) {
      if (!b.looked) return {type: 'move', action: {type: 'look'}, text: 'Tap the ? to turn the card over.'};
      const bin = FACE[other(m)];
      return {type: 'move', action: {type: 'keep', bin}, text: `Put it with ${COLOUR[bin]} underneath.`};
    }
    // The side wanted is under the one showing: turn the card over first.
    if (b.shown !== null && other(b.shown) === m && !b.looked) return {type: 'move', action: {type: 'look'}, text: 'Tap the ? to turn the card over.'};
    return {type: 'move', action: {type: 'draw', ticket: m}, text: `Tap ${say(m)}.`};
  }
  if (q.mode === 'cards') {
    if (!cardsPossible(q)) return b.tried ? {type: 'move', action: {type: 'cant'}, text: 'No table of these cards ties. Press Can’t.'} : {type: 'move', action: {type: 'try'}, text: 'Try it.'};
    const far = c => c.reduce((d, n, i) => d + Math.abs(n - b.counts[i]), 0);
    const goal = tablesUpTo(maxOf(q)).filter(c => cardsMeet(q.goal, c)).sort((x, y) => far(x) - far(y))[0];
    const i = goal.findIndex((n, k) => n !== b.counts[k]);
    if (i < 0) return {type: 'move', action: {type: 'try'}, text: 'Try it.'};
    const by = goal[i] > b.counts[i] ? 1 : -1;
    return {type: 'move', action: {type: 'count', card: i, by}, text: `${by > 0 ? 'Add' : 'Take away'} a ${CARD_NAME[i]}.`};
  }
  const pool = q.mode === 'design' ? ALL_CUPS.filter(c => c.length && meets(q.goal, c)) : ALL_CUPS.filter(c => meets('tie', c) && !b.kept.includes(cupKey(c)));
  if (q.mode === 'designs') {
    if (!pool.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    if (meets('tie', b.cup) && !b.kept.includes(cupKey(b.cup))) return {type: 'move', action: {type: 'keep'}, text: 'Keep this cup.'};
  }
  // Put a side in before taking one out, so the cup is never emptied.
  const goal = nearestCup(b.cup, pool), t = TICKETS.find(x => goal.includes(x) && !b.cup.includes(x)) ?? TICKETS.find(x => !goal.includes(x) && b.cup.includes(x));
  if (t === undefined) return {type: 'move', action: {type: 'try'}, text: 'Try it.'};
  return {type: 'move', action: {type: 'toggle', ticket: t}, text: b.cup.includes(t) ? `Take ${say(t)} out of the cup.` : `Put ${say(t)} in the cup.`};
}

// Drawing.
const face = (t, cls = '') => `<span class="side-face f${FACE[t]}${cls}" aria-hidden="true">${t}</span>`;
const chip = (c, cls = '') => `<span class="side-chip f${c}${cls}" aria-hidden="true"></span>`;
const focusOf = a => `side-${a.type}${a.n ?? ''}${a.card ?? ''}${a.by === -1 ? '-less' : a.by === 1 ? '-more' : ''}${a.bin ?? ''}`;
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-side-move="${esc(JSON.stringify(action))}" data-focus="${focusOf(action)}" ${extra}>${label}</button>`;
// One side of a card, as a button. In a draw (o.draw) the sides in the cup
// draw; a drawn side is up, and its other side is covered until a tap turns
// the card over (o.looked). In a design (o.design) every side is a switch, in
// the cup or out; o.cover: false leaves the side under the one drawn
// uncovered, for the playground, where a tap on it would change the cup.
function sideHTML(t, o) {
  const cup = o.cup || TICKETS, inCup = cup.includes(t), up = o.shown === t, under = o.shown != null && other(o.shown) === t;
  const covered = under && o.cover !== false && !o.looked;
  const cls = `side-face f${FACE[t]}${inCup ? '' : ' out'}${up ? ' up' : ''}${covered ? ' under' : ''}${under && o.looked ? ' looked' : ''}${o.hint === t ? ' hinted' : ''}`;
  if (covered && o.draw) return `<button type="button" class="${cls}" data-side-move="${esc(JSON.stringify({type: 'look'}))}" data-focus="side-${t}" aria-label="${esc(`side ${t}, underneath, covered: turn the card over`)}"${o.still ? ' disabled' : ''}>?</button>`;
  const label = `side ${t}, ${COLOUR[FACE[t]]}${o.design ? (inCup ? ', in the cup' : ', not in the cup') : inCup ? '' : ', not in the cup'}`;
  const action = o.design ? {type: 'toggle', ticket: t} : {type: 'draw', ticket: t};
  const off = o.still || (o.draw && !inCup);
  return `<button type="button" class="${cls}" data-side-move="${esc(JSON.stringify(action))}" data-focus="side-${t}" aria-pressed="${o.design ? inCup : up}" aria-label="${esc(label)}"${off ? ' disabled' : ''}>${t}</button>`;
}
// The three cards, each with its two sides.
const cardsHTML = (o = {}) => `<div class="side-cards" role="group" aria-label="${o.design ? 'The cards: tap a side to put it in the cup or take it out' : 'The cards: tap a side in the cup to draw it'}">${CARDS.map((c, i) => `<div class="side-card${c.faces.includes(o.shown) ? ' drawn' : ''}" role="group" aria-label="${CARD_NAME[i]}">${c.faces.map(t => sideHTML(t, o)).join('')}</div>`).join('')}</div>`;
// The cup: the numbers that can be drawn.
const CUP_SVG = '<svg class="side-cup-icon" viewBox="0 0 100 108" aria-hidden="true"><path d="M23 13h54l11 80q-38 16-76 0z" fill="currentColor" stroke="#142b48" stroke-width="4"/><path d="M26 14q24 9 48 0" fill="none" stroke="#142b48" stroke-width="4"/></svg>';
const cupTray = cup => `<div class="side-cup" role="img" aria-label="${esc(`In the cup: ${cup.length === 6 ? 'every side' : `side${cup.length > 1 ? 's' : ''} ${cup.join(', ')}`}`)}">${CUP_SVG}<span class="case-mini side-mini">${cup.map(t => face(t)).join('')}</span></div>`;
// Sides showing, by the colour underneath.
const UNDER = [{id: 'R', label: `${chip('R')}<span class="side-under-word">underneath</span><span class="sr-only">red underneath</span>`}, {id: 'B', label: `${chip('B')}<span class="side-under-word">underneath</span><span class="sr-only">blue underneath</span>`}];
const faceMini = key => `<span class="case-mini side-mini">${face(Number(key))}</span>`;
const sayFace = key => `side ${key}, ${COLOUR[FACE[Number(key)]]} up, ${COLOUR[FACE[other(Number(key))]]} underneath`;
const underBins = (keys, label) => binsHTML(keys, UNDER, key => FACE[other(Number(key))], {mini: faceMini, say: sayFace, always: true, label});
const cupMini = key => `<span class="case-mini side-mini">${[...key].map(t => face(Number(t))).join('')}</span>`;
const sayCup = key => `sides ${[...key].join(', ')}`;
// The 63 cups, in columns by their red sides.
const RED_PARTS = ['', '1', '2', '3', '12', '13', '23', '123'];
const redPart = key => [...key].filter(t => FACE[Number(t)] === 'R').join('');
const partLabel = r => r ? `${[...r].map(t => face(Number(t))).join('')}<span class="sr-only">red sides ${[...r].join(', ')}</span>` : '<span class="side-none">no red</span>';
const catalog = () => catalogHTML(ALL_CUPS.filter(c => c.length).map(cupKey), RED_PARTS.map(r => ({id: r, label: partLabel(r)})), redPart, {mini: cupMini, say: sayCup, label: 'Every cup', mark: key => meets('tie', [...key].map(Number)) ? 'yes' : 'no'});
const VERDICT = {none: 'Red can’t show.', tie: 'Not a tie.', blue: 'Red can hide red.', red: 'Red can hide blue.', three: 'Not three red for every blue.'};
const note = text => `<p class="case-note" role="status">${text}</p>`;
// Whole cards: a stack per card with − and +.
const cardMini = i => `<span class="side-card mini">${CARDS[i].faces.map(t => chip(FACE[t])).join('')}</span>`;
function stacksHTML(counts, max, o = {}) {
  return `<div class="side-stacks" role="group" aria-label="Cards on the table">${CARDS.map((c, i) => {
    const hint = o.hint?.card === i ? o.hint.by : 0, name = CARD_NAME[i];
    const copies = Array.from({length: counts[i]}, () => cardMini(i)).join('');
    return `<div class="side-stack" role="group" aria-label="${esc(`${name}s: ${counts[i]}`)}"><div class="side-copies">${copies || '<span class="side-none">none</span>'}</div><div class="case-tools">${button('−', {type: 'count', card: i, by: -1}, `case-tool${hint < 0 ? ' hinted' : ''}`, `aria-label="One ${name} fewer"${o.still || !counts[i] ? ' disabled' : ''}`)}${button('+', {type: 'count', card: i, by: 1}, `case-tool${hint > 0 ? ' hinted' : ''}`, `aria-label="One ${name} more"${o.still || counts[i] >= max ? ' disabled' : ''}`)}</div></div>`;
  }).join('')}</div>`;
}
// The red sides of whole cards, by the colour underneath, as plain chips.
function cardBins(counts) {
  const s = cardSplit(counts), col = (c, n) => `<div class="case-bin" data-bin="${c}"><h3 class="case-bin-label">${UNDER.find(u => u.id === c).label}</h3><ol class="case-list">${Array.from({length: n}, () => `<li class="case-kept">${chip('R')}</li>`).join('')}</ol></div>`;
  return `<section class="case-bins" data-bins="2" aria-label="${esc(`Red sides: ${s.R} with red underneath, ${s.B} with blue underneath`)}">${col('R', s.R)}${col('B', s.B)}</section>`;
}
// After Can't: every table of whole cards (none empty), in columns by its two
// piles, red underneath and blue underneath. None ties.
const tableKey = c => c.join('');
const tableMini = key => `<span class="case-mini side-mini">${[...key].flatMap((n, i) => Array.from({length: Number(n)}, () => cardMini(i))).join('')}</span>`;
const sayTable = key => [...key].flatMap((n, i) => Number(n) ? [`${n} ${CARD_NAME[i]}${n === '1' ? '' : 's'}`] : []).join(', ');
const pilesOf = key => { const s = cardSplit([...key].map(Number)); return `${s.R}${s.B}`; };
const pileLabel = id => id === '00' ? '<span class="side-none">no red</span>' : `<span class="side-pile">${chip('R')}${id[0]}</span><span class="side-pile">${chip('B')}${id[1]}</span><span class="sr-only">${id[0]} with red underneath, ${id[1]} with blue underneath</span>`;
function tablesCatalog(q) {
  const keys = tablesUpTo(maxOf(q)).filter(c => c.some(n => n)).map(tableKey);
  const piles = [...new Set(keys.map(pilesOf))].sort().reverse();
  return catalogHTML(keys, piles.map(id => ({id, label: pileLabel(id)})), pilesOf, {mini: tableMini, say: sayTable, label: 'Every table of whole cards', mark: key => cardsMeet(q.goal, [...key].map(Number)) ? 'yes' : ''});
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const hinted = (type, more = () => true) => h?.type === type && more(h) ? 'hinted' : '';
  const wrap = (...parts) => `<div class="side-puzzle" data-mechanic-wire="sides">${parts.join('')}</div>`;
  if (q.mode === 'draw') {
    const can = sortable(q, b);
    const sort = c => button(`${chip(c)}<span class="side-under-word">underneath</span>`, {type: 'keep', bin: c}, hinted('keep', x => x.bin === c), `aria-label="Keep it: ${COLOUR[c]} underneath"${can ? '' : ' disabled'}`);
    const actions = solved ? '' : `<div class="case-actions">${sort('R')}${sort('B')}${button('That’s all', {type: 'claim'}, hinted('claim'), b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
    const repeat = b.shown !== null && b.kept.includes(String(b.shown)) && !solved ? String(b.shown) : null;
    const bins = binsHTML(b.kept, UNDER, key => FACE[other(Number(key))], {mini: faceMini, say: sayFace, always: true, current: repeat, label: `Kept: ${COLOUR[q.clue]} sides, by the colour underneath`});
    const said = b.shown === null ? 'Nothing drawn.' : `Side ${b.shown}: ${COLOUR[FACE[b.shown]]} shows. ${b.looked ? `Underneath: ${COLOUR[FACE[other(b.shown)]]}.` : 'Underneath is covered.'}`;
    const look = h?.type === 'look' ? other(b.shown) : null;
    return wrap(cardsHTML({draw: true, cup: q.cup, shown: b.shown, looked: b.looked, still: solved, hint: h?.type === 'draw' ? h.ticket : look}), cupTray(q.cup), actions, b.missed ? note('There’s another.') : '', bins, `<p class="sr-only" role="status">${esc(said)}</p>`);
  }
  if (q.mode === 'cards') {
    const s = cardSplit(b.counts), why = !s.R && !s.B ? VERDICT.none : q.goal === 'tie' ? VERDICT.tie : VERDICT.three;
    const actions = solved ? '' : `<div class="case-actions">${button('Try it', {type: 'try'}, hinted('try'), b.tried ? 'disabled' : '')}${button('Can’t', {type: 'cant'}, hinted('cant'), b.cant ? 'disabled' : '')}</div>`;
    const notes = solved ? '' : [b.tried ? note(why) : '', b.cant ? note('Keep looking.') : ''].join('');
    const done = solved && b.cant ? tablesCatalog(q) : '';
    return wrap(stacksHTML(b.counts, maxOf(q), {still: solved, hint: h?.type === 'count' ? h : null}), actions, notes, b.tried ? cardBins(b.counts) : '', done);
  }
  const cards = cardsHTML({design: true, cup: b.cup, still: solved, hint: h?.type === 'toggle' ? h.ticket : null});
  if (q.mode === 'design') {
    const s = split(b.cup), why = !s.up.length ? VERDICT.none : VERDICT[q.goal];
    const actions = solved ? '' : `<div class="case-actions">${button('Try it', {type: 'try'}, hinted('try'), b.tried ? 'disabled' : '')}</div>`;
    return wrap(cards, cupTray(b.cup), actions, b.tried && !solved ? note(why) : '', b.tried ? underBins(s.up, 'Red sides in the cup, by the colour underneath') : '');
  }
  const key = cupKey(b.cup), kept = b.kept.includes(key), s = split(b.cup);
  const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), b.wrong || kept ? 'disabled' : '')}${button('That’s all', {type: 'claim'}, hinted('claim'), b.kept.length && !b.missed ? '' : 'disabled')}</div>`;
  // A refused cup shows its red sides sorted, as Try it does in the designs.
  const refused = b.wrong ? note(s.up.length ? VERDICT.tie : VERDICT.none) + (s.up.length ? underBins(s.up, 'Red sides in the cup, by the colour underneath') : '') : '';
  const missed = b.missed && !solved ? note('There’s another.') : '';
  const shelfOf = b.kept.length && !solved ? binsHTML(b.kept, RED_PARTS.filter(r => b.kept.some(k => redPart(k) === r)).map(r => ({id: r, label: partLabel(r)})), redPart, {mini: cupMini, say: sayCup, current: kept ? key : null, label: 'Cups kept, by their red sides'}) : '';
  return wrap(cards, cupTray(b.cup), actions, refused, missed, shelfOf, solved ? catalog() : '');
}

// The playground: choose a cup, draw sides at random, and watch the sides
// that show pile up by colour, the red ones by the colour underneath.
export const PLAY_DRAWS = 60;
const PLAY_BINS = [
  {id: 'RR', label: `${chip('R')}${chip('R', ' under')}<span class="sr-only">red up, red underneath</span>`},
  {id: 'RB', label: `${chip('R')}${chip('B', ' under')}<span class="sr-only">red up, blue underneath</span>`},
  {id: 'B', label: `${chip('B')}<span class="sr-only">blue up</span>`}
];
const playBin = key => FACE[Number(key)] === 'B' ? 'B' : `R${FACE[other(Number(key))]}`;
function freshPlay() { return {cup: [...TICKETS], draws: []}; }
function validPlay(b) {
  return object(b) && isCup(b.cup) && b.cup.length > 0 && Array.isArray(b.draws) && b.draws.length <= PLAY_DRAWS && b.draws.every(t => b.cup.includes(t)) && Object.keys(b).length === 2;
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  switch (action.type) {
    case 'toggle': {
      if (!TICKETS.includes(action.ticket)) return null;
      const cup = toggled(b.cup, action.ticket);
      return cup.length ? {cup, draws: []} : null;
    }
    case 'random': {
      if (action.n !== undefined && action.n !== 10) return null;
      const n = action.n === 10 ? 10 : 1;
      if (b.draws.length + n > PLAY_DRAWS) return null;
      return {...b, draws: [...b.draws, ...Array.from({length: n}, () => b.cup[Math.min(b.cup.length - 1, Math.floor(random() * b.cup.length))])]};
    }
    case 'clear': return b.draws.length ? {...b, draws: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, room = PLAY_DRAWS - b.draws.length, last = b.draws.at(-1) ?? null;
  const actions = `<div class="case-actions">${button('Draw', {type: 'random'}, '', room >= 1 ? '' : 'disabled')}${button('Draw 10', {type: 'random', n: 10}, '', room >= 10 ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.draws.length ? '' : 'disabled')}</div>`;
  const piles = binsHTML(b.draws.map(String), PLAY_BINS, playBin, {mini: faceMini, say: sayFace, always: true, label: 'Sides drawn'});
  const counts = PLAY_BINS.map(x => b.draws.filter(t => playBin(String(t)) === x.id).length);
  const said = `${last === null ? 'Nothing drawn.' : `Side ${last}: ${COLOUR[FACE[last]]} shows.`} Red with red underneath ${counts[0]}, red with blue underneath ${counts[1]}, blue ${counts[2]}.`;
  return `<div class="side-play" data-mechanic-wire="sides">${cardsHTML({design: true, cup: b.cup, shown: last, cover: false})}${cupTray(b.cup)}${actions}${piles}<p class="sr-only" role="status">${esc(said)}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
let pending = null;
function wire(root, p, api) {
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; api.apply(action); };
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-side-move]');
    if (!el || !root.contains(el) || el.disabled) return;
    try {
      const action = JSON.parse(el.dataset.sideMove);
      // A drawn side tapped again is already showing.
      if (action.type !== 'draw' || el.getAttribute('aria-pressed') !== 'true') apply(action);
    } catch { /* malformed control data is ignored */ }
  });
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board, q = p.parameters;
  // A kept side or cup arrives on the shelf.
  if (last.action.type === 'keep' && !b.wrong) root.querySelector(`.case-bins [data-key="${CSS.escape(b.kept.at(-1))}"]`)?.classList.add('fresh');
  // Keyboard: a side drawn that can be sorted hands focus to the covered side
  // under it, and turning the card over hands it to the first sorting button;
  // a + or − that greys out hands it to the other one on the same card; the
  // playground's Draw buttons never hand it to a side, whose tap would clear
  // the piles.
  if (!root.contains(document.activeElement)) return;
  const focus = (...selectors) => { const el = selectors.map(s => root.querySelector(`${s}:not([disabled])`)).find(Boolean); el?.focus({preventScroll: true}); };
  if (last.action.type === 'draw' && FACE[b.shown] === q.clue && !b.kept.includes(String(b.shown))) focus(`[data-focus="side-${other(b.shown)}"]`);
  else if (last.action.type === 'look' && sortable(q, b)) focus('[data-focus="side-keepR"]', '[data-focus="side-keepB"]');
  else if (last.action.type === 'count' && root.querySelector(`[data-focus="${focusOf(last.action)}"]`)?.disabled) focus(`[data-focus="${focusOf({...last.action, by: -last.action.by})}"]`);
  else if (isPlay(p) && ['random', 'clear'].includes(last.action.type) && document.activeElement.matches('.side-face')) focus('.case-actions .case-action');
}

export const sideMechanics = {
  sides: {
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
  id: 'sides',
  family: {id: 'sides', symbol: '◧'},
  mechanics: sideMechanics,
  pack: new URL('./sides.json', import.meta.url).href,
  css: new URL('./sides.css', import.meta.url).href,
  focus: 'button.side-face:not([disabled]),.case-actions .case-action:not([disabled]),.side-stack .case-tool:not([disabled])'
};
